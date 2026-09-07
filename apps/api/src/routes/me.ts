import { Hono } from "hono";
import { buildFtsQuery, isValidStoreIdentity, savedSearchSchema, storeApplySchema, updateProfileSchema, STORE_MEMBERSHIP, getCreditPackage } from "@satiyo/shared";
import type { Env, Variables } from "../env.js";
import { badRequest, fail } from "../lib/http.js";
import { hydrateListings, rowToListing, rowToSeller, rowToUser } from "../lib/db.js";
import { newId, now } from "../lib/id.js";
import { getPaymentProvider } from "../lib/payments.js";
import { getBalance, grantCredit } from "../lib/credit.js";
import { verifyAppleReceipt } from "../lib/apple-iap.js";
import { sha256 } from "../lib/crypto.js";
import { requireAuth } from "../middleware/auth.js";

export const meRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

meRoutes.use("*", requireAuth);

// --- Cihaz push token'ı (Expo Push) ---
// Kayıt: token global UNIQUE; cihazda kullanıcı değişirse ON CONFLICT ile yeni kullanıcıya taşınır.
meRoutes.post("/push-token", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { token?: unknown; platform?: unknown };
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token.startsWith("Expo")) badRequest("Geçersiz push token");
  const platform = typeof body.platform === "string" ? body.platform.slice(0, 16) : null;
  const user = c.get("user");
  const ts = now();
  await c.env.DB.prepare(
    `INSERT INTO push_tokens (id, user_id, token, platform, created_at, updated_at)
     VALUES (?,?,?,?,?,?)
     ON CONFLICT(token) DO UPDATE SET user_id = excluded.user_id, platform = excluded.platform, updated_at = excluded.updated_at`,
  ).bind(newId("psh"), user.id, token, platform, ts, ts).run();
  return c.json({ ok: true });
});

// Silme: çıkışta bu cihazın token'ını kaldır (yalnızca kendi token'ını silebilir).
meRoutes.delete("/push-token", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { token?: unknown };
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) badRequest("Token gerekli");
  const user = c.get("user");
  await c.env.DB.prepare(`DELETE FROM push_tokens WHERE user_id = ? AND token = ?`).bind(user.id, token).run();
  return c.json({ ok: true });
});

// Reklam kredisi cüzdanı — bakiye (kuruş) + son hareketler
meRoutes.get("/wallet", async (c) => {
  const user = c.get("user");
  const balance = await getBalance(c.env.DB, user.id);
  const rows = await c.env.DB.prepare(
    `SELECT txn_type, amount_minor, ref_type, ref_id, created_at FROM credit_ledger WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
  ).bind(user.id).all();
  const history = (rows.results as Record<string, unknown>[]).map((r) => ({
    type: r.txn_type as string,
    amount: Number(r.amount_minor),
    refType: (r.ref_type as string) ?? null,
    refId: (r.ref_id as string) ?? null,
    createdAt: Number(r.created_at),
  }));
  return c.json({ balance, history });
});

// --- Davet / referans: kısa kod (tembel üretilir) + link + istatistik ---
const REF_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
function makeRefCode(len = 7): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  let s = "";
  for (let i = 0; i < len; i++) s += REF_ALPHABET[bytes[i]! % REF_ALPHABET.length];
  return s;
}
meRoutes.get("/referral", async (c) => {
  const user = c.get("user");
  const row = await c.env.DB.prepare(`SELECT ref_code FROM users WHERE id = ?`).bind(user.id).first<{ ref_code: string | null }>();
  let code = row?.ref_code ?? null;
  if (!code) {
    for (let i = 0; i < 6 && !code; i++) {
      const cand = makeRefCode(7);
      try {
        const r = await c.env.DB.prepare(`UPDATE users SET ref_code = ? WHERE id = ? AND ref_code IS NULL`).bind(cand, user.id).run();
        if (r.meta.changes > 0) code = cand;
      } catch {
        // kod çakışması → tekrar dene
      }
    }
    if (!code) {
      const re = await c.env.DB.prepare(`SELECT ref_code FROM users WHERE id = ?`).bind(user.id).first<{ ref_code: string | null }>();
      code = re?.ref_code ?? null;
    }
  }
  const stats = await c.env.DB.prepare(
    `SELECT COUNT(*) AS total, SUM(CASE WHEN status='rewarded' THEN 1 ELSE 0 END) AS rewarded FROM referrals WHERE referrer_user_id = ?`,
  ).bind(user.id).first<{ total: number; rewarded: number }>();
  const earned = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(amount_minor),0) AS m FROM credit_ledger WHERE user_id = ? AND txn_type = 'referral_reward'`,
  ).bind(user.id).first<{ m: number }>();
  return c.json({
    code,
    link: code ? `https://satiyo.app/?ref=${code}` : null,
    invited: Number(stats?.total ?? 0),
    rewarded: Number(stats?.rewarded ?? 0),
    earnedMinor: Number(earned?.m ?? 0),
    rewardMinor: 5000,
  });
});

// --- iOS IAP: kredi satın alımını doğrula + kredi yükle ---
// App satın alma makbuzunu gönderir; Apple'a doğrulatıp productId → kredi map'ler,
// idempotency = transaction_id (aynı satın alım iki kez kredi yüklemez).
meRoutes.post("/iap/verify", async (c) => {
  const user = c.get("user");
  const secret = c.env.APPLE_IAP_SHARED_SECRET;
  if (!secret) fail(500, "iap_disabled", "IAP doğrulama yapılandırılmadı");
  const body = (await c.req.json().catch(() => ({}))) as { receipt?: unknown };
  const receipt = typeof body.receipt === "string" ? body.receipt.trim() : "";
  if (receipt.length < 20) badRequest("Geçersiz makbuz");

  const result = await verifyAppleReceipt(receipt, secret!);
  if (!result.ok) fail(400, "iap_invalid", `Makbuz doğrulanamadı (status ${result.status})`);

  // GÜVENLİK: sandbox makbuzları ücretsizdir. Üretimde (ENVIRONMENT=production) bunlara
  // kredi VERME — aksi halde sandbox satın alımla bedava kredi üretilebilir. TestFlight
  // testi için geçici olarak APPLE_IAP_ALLOW_SANDBOX="true" ile açılabilir.
  const allowSandbox = c.env.APPLE_IAP_ALLOW_SANDBOX === "true";
  if (result.environment === "Sandbox" && c.env.ENVIRONMENT === "production" && !allowSandbox) {
    fail(400, "iap_sandbox_rejected", "Sandbox makbuzu üretimde geçersiz");
  }

  let grantedMinor = 0;
  const applied: string[] = [];
  let hadError = false; // gerçek DB hatası (idempotent tekrar DEĞİL)
  for (const txn of result.inApp) {
    const pkg = getCreditPackage(txn.productId);
    if (!pkg) continue; // bilinmeyen ürün → atla
    const amount = pkg.creditsMinor * (txn.quantity || 1);
    const key = `iap:${txn.transactionId}`;
    const ok = await grantCredit(c.env.DB, user.id, "iap_topup", amount, key, {
      type: "iap",
      id: txn.productId,
    });
    if (ok) {
      grantedMinor += amount;
      applied.push(txn.transactionId);
      continue;
    }
    // grantCredit false → ya zaten verilmiş (idempotent) ya da geçici DB hatası. Ayırt et:
    // ledger'da bu anahtar VARSA daha önce verilmiş (makbuz güvenle tüketilebilir);
    // YOKSA gerçek hata → 500 dön ki istemci finishTransaction ETMESİN, Apple tekrar teslim etsin.
    const exists = await c.env.DB.prepare(`SELECT 1 FROM credit_ledger WHERE idempotency_key = ?`).bind(key).first();
    if (exists) applied.push(txn.transactionId);
    else hadError = true;
  }
  // PARA KAYBI KORUMASI: gerçek hata olduysa makbuz tüketilmeden hata dön (kredi telafisi mümkün kalsın).
  if (hadError) fail(500, "iap_grant_failed", "Kredi yüklenirken geçici bir sorun oluştu, lütfen tekrar deneyin");
  const balance = await getBalance(c.env.DB, user.id);
  return c.json({ ok: true, grantedMinor, applied, balance, environment: result.environment });
});

// Takip ettiğim satıcılar
meRoutes.get("/following", async (c) => {
  const user = c.get("user");
  const rows = await c.env.DB.prepare(
    `SELECT u.*, AVG(r.rating) AS rating_avg, COUNT(r.id) AS rating_count
     FROM follows f JOIN users u ON u.id = f.following_id
     LEFT JOIN reviews r ON r.reviewed_id = u.id
     WHERE f.follower_id = ? GROUP BY u.id ORDER BY f.created_at DESC LIMIT 200`,
  ).bind(user.id).all();
  return c.json((rows.results as Record<string, unknown>[]).map((row) => ({ ...rowToSeller(row), isFollowing: true })));
});

meRoutes.get("/", async (c) => {
  const user = c.get("user");
  const row = await c.env.DB.prepare(`SELECT * FROM users WHERE id = ?`).bind(user.id).first();
  return c.json(rowToUser(row as Record<string, unknown>));
});

meRoutes.patch("/", async (c) => {
  const parsed = updateProfileSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) badRequest("Profil geçersiz", parsed.error.flatten());
  const input = parsed.data!;
  const user = c.get("user");

  const fields: string[] = [];
  const binds: unknown[] = [];
  for (const [col, val] of Object.entries({
    name: input.name, email: input.email, city: input.city,
    district: input.district, avatar_url: input.avatarUrl,
  })) {
    if (val !== undefined) { fields.push(`${col} = ?`); binds.push(val); }
  }
  if (fields.length) {
    await c.env.DB.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`).bind(...binds, user.id).run();
  }
  const row = await c.env.DB.prepare(`SELECT * FROM users WHERE id = ?`).bind(user.id).first();
  return c.json(rowToUser(row as Record<string, unknown>));
});

// --- Hesap silme (App Store Guideline 5.1.1(v) — zorunlu) ---
meRoutes.delete("/", async (c) => {
  const user = c.get("user");
  const uid = user.id;

  // KVKK "unutulma": R2'deki medya baytlarını da sil. Önce anahtarları topla
  // (satırlar birazdan silinecek — kimlik/ilan görselleri buketten de kalksın).
  const imgRows = await c.env.DB.prepare(
    `SELECT r2_key FROM listing_images WHERE owner_id = ?1 OR listing_id IN (SELECT id FROM listings WHERE seller_id = ?1)`,
  ).bind(uid).all();
  const r2Keys = (imgRows.results as { r2_key?: string }[])
    .map((r) => r.r2_key)
    .filter((k): k is string => typeof k === "string" && k.length > 0);

  // D1'de yabancı anahtar zorlaması kapalı olduğundan ilişkili tüm veriyi açıkça sil.
  await c.env.DB.batch([
    c.env.DB.prepare(`DELETE FROM messages WHERE sender_id = ?`).bind(uid),
    c.env.DB.prepare(`DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE buyer_id = ?1 OR seller_id = ?1)`).bind(uid),
    c.env.DB.prepare(`DELETE FROM conversations WHERE buyer_id = ?1 OR seller_id = ?1`).bind(uid),
    c.env.DB.prepare(`DELETE FROM boosts WHERE listing_id IN (SELECT id FROM listings WHERE seller_id = ?)`).bind(uid),
    c.env.DB.prepare(`DELETE FROM listing_images WHERE owner_id = ?1 OR listing_id IN (SELECT id FROM listings WHERE seller_id = ?1)`).bind(uid),
    c.env.DB.prepare(`DELETE FROM listing_attributes WHERE listing_id IN (SELECT id FROM listings WHERE seller_id = ?)`).bind(uid),
    c.env.DB.prepare(`DELETE FROM listings WHERE seller_id = ?`).bind(uid),
    c.env.DB.prepare(`DELETE FROM favorites WHERE user_id = ?`).bind(uid),
    c.env.DB.prepare(`DELETE FROM reviews WHERE reviewer_id = ?1 OR reviewed_id = ?1`).bind(uid),
    c.env.DB.prepare(`DELETE FROM reports WHERE reporter_id = ?`).bind(uid),
    c.env.DB.prepare(`DELETE FROM saved_searches WHERE user_id = ?`).bind(uid),
    c.env.DB.prepare(`DELETE FROM notifications WHERE user_id = ?`).bind(uid),
    c.env.DB.prepare(`DELETE FROM payments WHERE user_id = ?`).bind(uid),
    c.env.DB.prepare(`DELETE FROM blocks WHERE blocker_id = ?1 OR blocked_id = ?1`).bind(uid),
    // KVKK: hassas kimlik verisi (hash'li TC + belge referansları), push token, analitik, takip, cüzdan
    c.env.DB.prepare(`DELETE FROM store_applications WHERE user_id = ?`).bind(uid),
    c.env.DB.prepare(`DELETE FROM push_tokens WHERE user_id = ?`).bind(uid),
    c.env.DB.prepare(`DELETE FROM events WHERE user_id = ?`).bind(uid),
    c.env.DB.prepare(`DELETE FROM follows WHERE follower_id = ?1 OR following_id = ?1`).bind(uid),
    c.env.DB.prepare(`DELETE FROM credit_ledger WHERE user_id = ?`).bind(uid),
    c.env.DB.prepare(`DELETE FROM sessions WHERE user_id = ?`).bind(uid),
    c.env.DB.prepare(`DELETE FROM users WHERE id = ?`).bind(uid),
  ]);

  // R2 medya baytlarını sil (best-effort; DB kaydı gitti, dosya kalmasın). R2 toplu silme destekler.
  if (r2Keys.length) {
    try {
      await c.env.MEDIA.delete(r2Keys);
    } catch {
      // Bucket silme hatası ana silme işlemini bozmasın.
    }
  }

  return c.json({ ok: true as const });
});

// --- Kullanıcı engelleme (App Store Guideline 1.2 — UGC güvenliği) ---
meRoutes.post("/blocks", async (c) => {
  const { userId } = (await c.req.json().catch(() => ({}))) as { userId?: string };
  if (!userId || typeof userId !== "string") badRequest("Kullanıcı gerekli");
  const user = c.get("user");
  if (userId === user.id) badRequest("Kendinizi engelleyemezsiniz");
  const ts = now();
  // Engelle + aynı anda geliştiriciye/moderasyona rapor düş (App Store 1.2 — "notify the developer").
  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO blocks (blocker_id, blocked_id, created_at) VALUES (?,?,?)
       ON CONFLICT(blocker_id, blocked_id) DO NOTHING`,
    ).bind(user.id, userId, ts),
    c.env.DB.prepare(
      `INSERT INTO reports (id, reporter_id, target_type, target_id, reason, status, created_at)
       VALUES (?,?, 'user', ?, ?, 'open', ?)`,
    ).bind(newId("rpt"), user.id, userId, "Kullanıcı engellendi — uygunsuz davranış/içerik bildirimi", ts),
  ]);
  return c.json({ ok: true as const });
});

meRoutes.delete("/blocks/:userId", async (c) => {
  const user = c.get("user");
  await c.env.DB.prepare(`DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?`)
    .bind(user.id, c.req.param("userId")).run();
  return c.json({ ok: true as const });
});

meRoutes.get("/blocks", async (c) => {
  const user = c.get("user");
  const rows = await c.env.DB.prepare(
    `SELECT u.id, u.name, u.store_name, b.created_at
     FROM blocks b JOIN users u ON u.id = b.blocked_id
     WHERE b.blocker_id = ? ORDER BY b.created_at DESC`,
  ).bind(user.id).all();
  return c.json((rows.results as Record<string, unknown>[]).map((r) => ({
    id: r.id as string, name: (r.store_name as string) ?? (r.name as string), createdAt: r.created_at as number,
  })));
});

meRoutes.get("/listings", async (c) => {
  const user = c.get("user");
  const status = (c.req.query("status") ?? "").trim();
  // status verilirse o duruma filtrele (kaldırılanlar dahil); yoksa removed hariç tümü.
  const rows = status
    ? await c.env.DB.prepare(`SELECT * FROM listings WHERE seller_id = ? AND status = ? ORDER BY created_at DESC`).bind(user.id, status).all()
    : await c.env.DB.prepare(`SELECT * FROM listings WHERE seller_id = ? AND status != 'removed' ORDER BY created_at DESC`).bind(user.id).all();
  let listings = (rows.results as Record<string, unknown>[]).map(rowToListing);
  listings = await hydrateListings(c.env.DB, listings);
  return c.json({ items: listings, page: 1, pageSize: listings.length, total: listings.length, hasMore: false });
});

// --- Öneriler / kişiselleştirme ---
meRoutes.get("/recommendations", async (c) => {
  const user = c.get("user");
  const ts = now();
  const cats = await c.env.DB.prepare(
    `SELECT l.category_id, COUNT(*) AS n FROM favorites f JOIN listings l ON l.id = f.listing_id
     WHERE f.user_id = ? GROUP BY l.category_id ORDER BY n DESC LIMIT 5`,
  ).bind(user.id).all();
  const catIds = (cats.results as Record<string, unknown>[]).map((r) => r.category_id as string);

  let rows;
  if (catIds.length) {
    const ph = catIds.map(() => "?").join(",");
    rows = await c.env.DB.prepare(
      `SELECT * FROM listings WHERE status = 'active' AND seller_id != ? AND category_id IN (${ph})
       AND id NOT IN (SELECT listing_id FROM favorites WHERE user_id = ?)
       AND seller_id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ? UNION SELECT blocker_id FROM blocks WHERE blocked_id = ?)
       ORDER BY (CASE WHEN boosted_until > ? THEN 0 ELSE 1 END), created_at DESC LIMIT 12`,
    ).bind(user.id, ...catIds, user.id, user.id, user.id, ts).all();
  } else {
    rows = await c.env.DB.prepare(
      `SELECT * FROM listings WHERE status = 'active' AND seller_id != ?
       AND seller_id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ? UNION SELECT blocker_id FROM blocks WHERE blocked_id = ?)
       ORDER BY (CASE WHEN boosted_until > ? THEN 0 ELSE 1 END), created_at DESC LIMIT 12`,
    ).bind(user.id, user.id, user.id, ts).all();
  }
  let listings = (rows.results as Record<string, unknown>[]).map(rowToListing);
  listings = await hydrateListings(c.env.DB, listings, { withSeller: true, favoriteUserId: user.id });

  // B3 — son aramalardan kişiselleştirme (favori sinyaline ek). events'te name='search', props.q.
  let basedOn: string[] = [...catIds];
  const searchRows = await c.env.DB.prepare(
    `SELECT props FROM events WHERE user_id=? AND name='search' ORDER BY created_at DESC LIMIT 10`,
  ).bind(user.id).all();
  const terms: string[] = [];
  for (const r of searchRows.results as Record<string, unknown>[]) {
    try {
      const q = (JSON.parse(String(r.props ?? "{}")) as { q?: unknown }).q;
      if (typeof q === "string" && q.trim() && !terms.includes(q.trim())) terms.push(q.trim());
    } catch { /* bozuk props'u yoksay */ }
    if (terms.length >= 3) break;
  }
  if (terms.length) {
    const fts = buildFtsQuery(terms.join(" "));
    if (fts) {
      const m = await c.env.DB.prepare(
        `SELECT l.* FROM listings l JOIN listings_fts ft ON ft.listing_id = l.id
         WHERE listings_fts MATCH ?1 AND l.status='active' AND l.seller_id != ?2
         AND l.seller_id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id=?2 UNION SELECT blocker_id FROM blocks WHERE blocked_id=?2)
         LIMIT 8`,
      ).bind(fts, user.id).all();
      const seen = new Set(listings.map((l) => l.id));
      let extra = (m.results as Record<string, unknown>[]).map(rowToListing).filter((l) => !seen.has(l.id));
      extra = await hydrateListings(c.env.DB, extra, { withSeller: true, favoriteUserId: user.id });
      // arama-eşleşmeleri öne, sonra favori-kategori; toplam 12
      listings = [...extra, ...listings].slice(0, 12);
      basedOn = [...terms, ...catIds];
    }
  }
  return c.json({ items: listings, basedOn });
});

// --- Mağaza üyeliği ---
meRoutes.post("/store/activate", async (c) => {
  const { storeName } = (await c.req.json().catch(() => ({}))) as { storeName?: string };
  if (!storeName || storeName.trim().length < 2) badRequest("Mağaza adı gerekli (en az 2 karakter)");
  const user = c.get("user");

  const provider = getPaymentProvider(c.env);
  const result = await provider.charge({
    amount: STORE_MEMBERSHIP.price, currency: "TRY", purpose: "store",
    userId: user.id, description: STORE_MEMBERSHIP.label,
  });
  await c.env.DB.prepare(
    `INSERT INTO payments (id, user_id, amount, currency, provider, provider_ref, purpose, status, created_at)
     VALUES (?,?,?, 'TRY', ?, ?, 'store', ?, ?)`,
  ).bind(newId("pay"), user.id, STORE_MEMBERSHIP.price, provider.name, result.providerRef, result.status, now()).run();
  if (result.status !== "paid") fail(402, "payment_failed", "Ödeme alınamadı");

  await c.env.DB.prepare(`UPDATE users SET is_store = 1, store_name = ? WHERE id = ?`).bind(storeName!.trim(), user.id).run();
  const row = await c.env.DB.prepare(`SELECT * FROM users WHERE id = ?`).bind(user.id).first();
  return c.json(rowToUser(row as Record<string, unknown>));
});

// --- C4: Dükkan doğrulama başvurusu (belge + TC/vergi, manuel admin onayı; ücretsiz) ---
meRoutes.post("/store/apply", async (c) => {
  const parsed = storeApplySchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) badRequest("Başvuru geçersiz", parsed.error.flatten());
  const input = parsed.data!;
  const user = c.get("user");
  if (!isValidStoreIdentity({ legalType: input.legalType, tcNo: input.tcNo, taxNo: input.taxNo })) {
    badRequest(input.legalType === "company" ? "Vergi numarası geçersiz" : "TC kimlik numarası geçersiz");
  }
  const tcHash = input.tcNo ? await sha256(input.tcNo) : null; // düz TC ASLA saklanmaz
  const id = newId("sap");
  const ts = now();
  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO store_applications (id, user_id, store_name, legal_type, tc_hash, tax_no, doc_ids, status, created_at)
       VALUES (?,?,?,?,?,?,?, 'pending', ?)`,
    ).bind(id, user.id, input.storeName, input.legalType, tcHash, input.taxNo ?? null, JSON.stringify(input.docImageIds), ts),
    c.env.DB.prepare(`UPDATE users SET store_status = 'pending' WHERE id = ?`).bind(user.id),
  ]);
  return c.json({ id, status: "pending" as const });
});

meRoutes.get("/store/application", async (c) => {
  const user = c.get("user");
  const row = await c.env.DB.prepare(
    `SELECT * FROM store_applications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
  ).bind(user.id).first();
  if (!row) return c.json(null);
  return c.json({
    id: row.id, storeName: row.store_name, legalType: row.legal_type, taxNo: (row.tax_no as string) ?? null,
    docIds: JSON.parse(String(row.doc_ids ?? "[]")), status: row.status, reviewNote: (row.review_note as string) ?? null,
    createdAt: row.created_at, reviewedAt: (row.reviewed_at as number) ?? null,
  });
});

// --- Kaydedilen aramalar ---
meRoutes.post("/saved-searches", async (c) => {
  const parsed = savedSearchSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) badRequest("Geçersiz arama", parsed.error.flatten());
  const user = c.get("user");
  const id = newId("sav");
  await c.env.DB.prepare(
    `INSERT INTO saved_searches (id, user_id, query_json, notify, created_at) VALUES (?,?,?,?,?)`,
  ).bind(id, user.id, JSON.stringify(parsed.data!.query), parsed.data!.notify ? 1 : 0, now()).run();
  return c.json({ id, query: parsed.data!.query, notify: parsed.data!.notify }, 201);
});

meRoutes.get("/saved-searches", async (c) => {
  const user = c.get("user");
  const rows = await c.env.DB.prepare(`SELECT * FROM saved_searches WHERE user_id = ? ORDER BY created_at DESC`).bind(user.id).all();
  return c.json((rows.results as Record<string, unknown>[]).map((r) => ({
    id: r.id as string, query: JSON.parse(r.query_json as string), notify: !!r.notify, createdAt: r.created_at as number,
  })));
});

meRoutes.delete("/saved-searches/:id", async (c) => {
  const user = c.get("user");
  await c.env.DB.prepare(`DELETE FROM saved_searches WHERE id = ? AND user_id = ?`).bind(c.req.param("id"), user.id).run();
  return c.json({ ok: true as const });
});

// --- Bildirimler ---
meRoutes.get("/notifications", async (c) => {
  const user = c.get("user");
  const rows = await c.env.DB.prepare(`SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`).bind(user.id).all();
  return c.json((rows.results as Record<string, unknown>[]).map((r) => ({
    id: r.id as string, type: r.type as string, title: r.title as string, body: (r.body as string) ?? null,
    data: r.data ? JSON.parse(r.data as string) : null, readAt: (r.read_at as number) ?? null, createdAt: r.created_at as number,
  })));
});

meRoutes.post("/notifications/read", async (c) => {
  const user = c.get("user");
  await c.env.DB.prepare(`UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL`).bind(now(), user.id).run();
  return c.json({ ok: true as const });
});

meRoutes.get("/favorites", async (c) => {
  const user = c.get("user");
  const rows = await c.env.DB.prepare(
    `SELECT l.* FROM favorites fv JOIN listings l ON l.id = fv.listing_id
     WHERE fv.user_id = ? AND l.status = 'active' ORDER BY fv.created_at DESC`,
  ).bind(user.id).all();
  let listings = (rows.results as Record<string, unknown>[]).map(rowToListing);
  listings = await hydrateListings(c.env.DB, listings, { withSeller: true, favoriteUserId: user.id });
  return c.json({ items: listings, page: 1, pageSize: listings.length, total: listings.length, hasMore: false });
});
