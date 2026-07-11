import { Hono } from "hono";
import type { Env, Variables } from "../env.js";
import { badRequest, notFound } from "../lib/http.js";
import { newId, now } from "../lib/id.js";
import { adminConfigSchema, adminUpdateListingSchema, foldTr, getCategory, isValidVergiNo } from "@satiyo/shared";
import { getSetting, setSetting, getGeminiKey } from "../lib/settings.js";
import { hydrateListings, rowToListing } from "../lib/db.js";
import { notify } from "../lib/notify.js";
import { moderateListingAI } from "../lib/moderation.js";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";

export const adminRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();
adminRoutes.use("*", requireAuth, requireAdmin);

// --- Özet metrikler (zengin panel) ---
adminRoutes.get("/stats", async (c) => {
  const t = now();
  const day = 86_400_000;
  const d1 = t - day; // son 24 saat
  const d7 = t - 7 * day; // son 7 gün
  const first = (sql: string, ...b: unknown[]) => c.env.DB.prepare(sql).bind(...b).first();
  const num = (v: unknown) => Number(v ?? 0);

  const dayStr = new Date().toISOString().slice(0, 10);
  const [u, l, act, act24, conv, msg, fav, rev, rep, pay, follows, wLedger, wBal, ai] = await Promise.all([
    first(
      `SELECT COUNT(*) total, SUM(phone_verified=1) verified, SUM(is_store=1) stores,
              SUM(banned=1) banned, SUM(is_admin=1) admins,
              SUM(created_at>=?1) n24, SUM(created_at>=?2) n7 FROM users`, d1, d7),
    first(
      `SELECT COUNT(*) total, SUM(status='active') active, SUM(status='sold') sold,
              SUM(status='reserved') reserved, SUM(status='removed') removed,
              SUM(boosted_until>?1) boosted, SUM(created_at>=?2) n24, SUM(created_at>=?3) n7 FROM listings`, t, d1, d7),
    first(`SELECT COUNT(DISTINCT user_id) n FROM sessions WHERE created_at>=?1`, d7),
    first(`SELECT COUNT(DISTINCT user_id) n FROM sessions WHERE created_at>=?1`, d1),
    first(`SELECT COUNT(*) n FROM conversations`),
    first(`SELECT COUNT(*) n FROM messages`),
    first(`SELECT COUNT(*) n FROM favorites`),
    first(`SELECT COUNT(*) n FROM reviews`),
    first(`SELECT SUM(status='open') open, COUNT(*) total FROM reports`),
    first(`SELECT COALESCE(SUM(amount),0) sum, COUNT(*) cnt FROM payments WHERE status='paid'`),
    first(`SELECT COUNT(*) n FROM follows`),
    first(`SELECT COALESCE(SUM(CASE WHEN amount_minor>0 THEN amount_minor END),0) granted,
                  COALESCE(SUM(CASE WHEN amount_minor<0 THEN -amount_minor END),0) spent FROM credit_ledger`),
    first(`SELECT COALESCE(SUM(balance_minor),0) outstanding, COUNT(*) wallets FROM credit_wallets`),
    first(`SELECT COALESCE(SUM(count),0) total, COALESCE(SUM(CASE WHEN day=?1 THEN count END),0) today FROM ai_usage`, dayStr),
  ]);

  const evTotal = await first(`SELECT SUM(created_at>=?1) c24, COUNT(*) c7 FROM events WHERE created_at>=?2`, d1, d7);
  const evTop = await c.env.DB.prepare(
    `SELECT name, SUM(created_at>=?1) c24, COUNT(*) c7 FROM events
     WHERE created_at>=?2 GROUP BY name ORDER BY c7 DESC LIMIT 12`,
  ).bind(d1, d7).all();

  return c.json({
    users: {
      total: num(u?.total), verified: num(u?.verified), stores: num(u?.stores),
      banned: num(u?.banned), admins: num(u?.admins),
      active24h: num(act24?.n), active7d: num(act?.n),
      new24h: num(u?.n24), new7d: num(u?.n7),
    },
    activity: {
      events24h: num(evTotal?.c24), events7d: num(evTotal?.c7),
      topEvents: (evTop.results as Record<string, unknown>[]).map((r) => ({
        name: String(r.name), c24: num(r.c24), c7: num(r.c7),
      })),
    },
    listings: {
      total: num(l?.total), active: num(l?.active), sold: num(l?.sold),
      reserved: num(l?.reserved), removed: num(l?.removed), boosted: num(l?.boosted),
      new24h: num(l?.n24), new7d: num(l?.n7),
    },
    engagement: {
      conversations: num(conv?.n), messages: num(msg?.n), favorites: num(fav?.n),
      reviews: num(rev?.n), reportsOpen: num(rep?.open), reportsTotal: num(rep?.total),
    },
    revenue: { totalKurus: num(pay?.sum), payments: num(pay?.cnt) },
    engagementExtra: { follows: num(follows?.n) },
    wallet: {
      grantedKurus: num(wLedger?.granted), spentKurus: num(wLedger?.spent),
      outstandingKurus: num(wBal?.outstanding), wallets: num(wBal?.wallets),
    },
    ai: { suggestionsTotal: num(ai?.total), suggestionsToday: num(ai?.today) },
  });
});

// --- Özet dashboard ekstraları: 7-gün ilan serisi + kategori kırılımı + aktivite feed ---
adminRoutes.get("/overview", async (c) => {
  const t = now();
  const day = 86_400_000;
  const num = (v: unknown) => Number(v ?? 0);

  // 7 günlük yeni ilan serisi (boş günler 0 ile doldurulur)
  const rowsDaily = await c.env.DB.prepare(
    `SELECT strftime('%Y-%m-%d', created_at/1000, 'unixepoch') d, COUNT(*) c
     FROM listings WHERE created_at >= ?1 GROUP BY d`,
  ).bind(t - 7 * day).all();
  const dailyMap = new Map<string, number>();
  for (const r of rowsDaily.results as Record<string, unknown>[]) dailyMap.set(String(r.d), num(r.c));
  const listingsDaily: { day: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const dstr = new Date(t - i * day).toISOString().slice(0, 10);
    listingsDaily.push({ day: dstr, count: dailyMap.get(dstr) ?? 0 });
  }

  // Kategori kırılımı (aktif ilanlar, top 6)
  const catRows = await c.env.DB.prepare(
    `SELECT category_id, COUNT(*) c FROM listings WHERE status='active' GROUP BY category_id ORDER BY c DESC LIMIT 6`,
  ).all();
  const categoryBreakdown = (catRows.results as Record<string, unknown>[]).map((r) => {
    const cat = getCategory(String(r.category_id));
    return { categoryId: String(r.category_id), name: cat?.name ?? String(r.category_id), icon: cat?.icon ?? "🏷️", count: num(r.c) };
  });

  // Son aktiviteler (kullanıcı/ilan/şikayet birleşik, zamana göre)
  const [uAct, lAct, rAct] = await Promise.all([
    c.env.DB.prepare(`SELECT name, created_at FROM users ORDER BY created_at DESC LIMIT 6`).all(),
    c.env.DB.prepare(`SELECT title, created_at FROM listings ORDER BY created_at DESC LIMIT 6`).all(),
    c.env.DB.prepare(`SELECT target_id, created_at FROM reports ORDER BY created_at DESC LIMIT 6`).all(),
  ]);
  const acts: { type: string; title: string; subtitle: string; at: number }[] = [];
  for (const r of uAct.results as Record<string, unknown>[]) acts.push({ type: "user", title: "Yeni kullanıcı kaydoldu", subtitle: String(r.name ?? "—"), at: num(r.created_at) });
  for (const r of lAct.results as Record<string, unknown>[]) acts.push({ type: "listing", title: "Yeni ilan eklendi", subtitle: String(r.title ?? "—"), at: num(r.created_at) });
  for (const r of rAct.results as Record<string, unknown>[]) acts.push({ type: "report", title: "Şikayet bildirildi", subtitle: `İlan ID #${String(r.target_id ?? "")}`, at: num(r.created_at) });
  acts.sort((a, b) => b.at - a.at);

  return c.json({ listingsDaily, categoryBreakdown, recentActivity: acts.slice(0, 8) });
});

// --- Cüzdanlar: en yüksek bakiyeler + toplam + son hareketler ---
adminRoutes.get("/wallets", async (c) => {
  const top = await c.env.DB.prepare(
    `SELECT w.user_id, w.balance_minor, u.name, u.phone
     FROM credit_wallets w JOIN users u ON u.id = w.user_id
     WHERE w.balance_minor > 0 ORDER BY w.balance_minor DESC LIMIT 100`,
  ).all();
  const recent = await c.env.DB.prepare(
    `SELECT l.user_id, l.txn_type, l.amount_minor, l.created_at, u.name
     FROM credit_ledger l JOIN users u ON u.id = l.user_id
     ORDER BY l.created_at DESC LIMIT 100`,
  ).all();
  return c.json({
    top: (top.results as Record<string, unknown>[]).map((r) => ({
      userId: r.user_id, name: r.name, phone: r.phone, balance: Number(r.balance_minor),
    })),
    recent: (recent.results as Record<string, unknown>[]).map((r) => ({
      userId: r.user_id, name: r.name, type: r.txn_type, amount: Number(r.amount_minor), createdAt: Number(r.created_at),
    })),
  });
});

// --- İlanlar: tüm durumlar + satıcı (kim ne koymuş) + görsel, filtreli ---
adminRoutes.get("/listings", async (c) => {
  const status = (c.req.query("status") ?? "").trim();
  const q = (c.req.query("q") ?? "").trim();
  const cond: string[] = []; const b: unknown[] = [];
  if (status) { cond.push("status = ?"); b.push(status); }
  if (q) { cond.push("title LIKE ?"); b.push(`%${q}%`); }
  const rows = await c.env.DB.prepare(
    `SELECT * FROM listings ${cond.length ? `WHERE ${cond.join(" AND ")}` : ""} ORDER BY created_at DESC LIMIT 60`,
  ).bind(...b).all();
  let items = (rows.results as Record<string, unknown>[]).map(rowToListing);
  items = await hydrateListings(c.env.DB, items, { withSeller: true });
  return c.json({ items });
});

// --- Kullanıcı detayı: profil + cüzdan + ilan/etkileşim/şikayet özeti ---
adminRoutes.get("/users/:id", async (c) => {
  const id = c.req.param("id");
  const u = await c.env.DB.prepare(`SELECT * FROM users WHERE id = ?`).bind(id).first();
  if (!u) notFound("Kullanıcı bulunamadı");
  const first = (sql: string, ...b: unknown[]) => c.env.DB.prepare(sql).bind(...b).first();
  const numv = (v: unknown) => Number(v ?? 0);
  const [bal, ledger, lst, favs, convs, reviews, reps, follows] = await Promise.all([
    first(`SELECT balance_minor b FROM credit_wallets WHERE user_id=?`, id),
    c.env.DB.prepare(`SELECT txn_type, amount_minor, created_at FROM credit_ledger WHERE user_id=? ORDER BY created_at DESC LIMIT 30`).bind(id).all(),
    first(`SELECT COUNT(*) t, SUM(status='active') a, SUM(status='sold') s FROM listings WHERE seller_id=?`, id),
    first(`SELECT COUNT(*) n FROM favorites WHERE user_id=?`, id),
    first(`SELECT COUNT(*) n FROM conversations WHERE buyer_id=?1 OR seller_id=?1`, id),
    first(`SELECT COUNT(*) n, AVG(rating) avg FROM reviews WHERE reviewed_id=?`, id),
    first(`SELECT COUNT(*) n FROM reports WHERE target_type='user' AND target_id=?`, id),
    first(`SELECT (SELECT COUNT(*) FROM follows WHERE following_id=?1) followers, (SELECT COUNT(*) FROM follows WHERE follower_id=?1) following`, id),
  ]);
  const ur = u as Record<string, unknown>;
  return c.json({
    id: ur.id, phone: ur.phone, name: ur.name, city: ur.city, district: ur.district,
    createdAt: ur.created_at, phoneVerified: Boolean(ur.phone_verified), isStore: Boolean(ur.is_store),
    storeName: ur.store_name, isAdmin: Boolean(ur.is_admin), banned: Boolean(ur.banned), trustScore: numv(ur.trust_score),
    wallet: {
      balance: numv(bal?.b),
      history: (ledger.results as Record<string, unknown>[]).map((r) => ({ type: r.txn_type, amount: Number(r.amount_minor), createdAt: Number(r.created_at) })),
    },
    listings: { total: numv(lst?.t), active: numv(lst?.a), sold: numv(lst?.s) },
    stats: { favorites: numv(favs?.n), conversations: numv(convs?.n), reviews: numv(reviews?.n), ratingAvg: reviews?.avg ? Number(reviews.avg) : null, reports: numv(reps?.n), followers: numv(follows?.followers), following: numv(follows?.following) },
  });
});

// --- Manuel kredi ver/düş (admin destek aracı) ---
adminRoutes.post("/users/:id/credit", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => ({}))) as { amountKurus?: number; reason?: string };
  const amount = Math.round(Number(body.amountKurus ?? 0));
  if (!amount) badRequest("amountKurus gerekli (kuruş, + ekle / - düş)");
  const exists = await c.env.DB.prepare(`SELECT 1 FROM users WHERE id = ?`).bind(id).first();
  if (!exists) notFound("Kullanıcı bulunamadı");
  const admin = c.get("user");
  const key = `adjust:${id}:${now()}`;
  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO credit_ledger (id, idempotency_key, user_id, txn_type, amount_minor, ref_type, ref_id, created_at)
       VALUES (?,?,?, 'adjustment', ?, 'admin', ?, ?)`,
    ).bind(newId("cl"), key, id, amount, admin.id, now()),
    c.env.DB.prepare(
      `INSERT INTO credit_wallets (user_id, balance_minor, updated_at) VALUES (?, MAX(0, ?), ?)
       ON CONFLICT(user_id) DO UPDATE SET balance_minor = MAX(0, balance_minor + ?), updated_at = ?`,
    ).bind(id, amount, now(), amount, now()),
  ]);
  const bal = await c.env.DB.prepare(`SELECT balance_minor b FROM credit_wallets WHERE user_id=?`).bind(id).first();
  return c.json({ ok: true as const, balance: Number(bal?.b ?? 0) });
});

// --- AI durum: bu ay kullanım + tahmini maliyet + canlı anahtar sağlığı ---
// (Google, API-key ile bakiye/limit endpoint'i SUNMUYOR — en yakın+doğru gösterge budur.)
adminRoutes.get("/ai-status", async (c) => {
  const month = new Date().toISOString().slice(0, 7); // YYYY-MM
  const usage = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(count),0) n, COUNT(DISTINCT user_id) u FROM ai_usage WHERE day LIKE ?`,
  ).bind(`${month}%`).first();
  const calls = Number(usage?.n ?? 0);
  const key = await getGeminiKey(c.env, c.env.DB);
  const fromPanel = !!(await getSetting(c.env.DB, "gemini_api_key"));
  const health = key ? await geminiHealth(key) : "no_key";
  return c.json({
    monthCalls: calls,
    monthUsers: Number(usage?.u ?? 0),
    estimatedCostUsd: Math.round(calls * 0.0006 * 1e4) / 1e4,
    dailyLimitPerUser: 30,
    keySource: fromPanel ? "panel" : (c.env.GEMINI_API_KEY ? "secret" : "none"),
    keyMasked: key ? `${key.slice(0, 6)}…${key.slice(-4)}` : null,
    health, // ok | quota_exceeded | error_XXX | unreachable | no_key
    note: "Google Gemini API-key ile bakiye sorgusu sunmuyor; bu kendi kullanımımız + tahmini maliyet + canlı anahtar sağlığıdır.",
  });
});

// --- Gemini anahtarını panelden değiştir (deploy/store güncellemesi GEREKMEZ). Kaydetmeden önce doğrular. ---
adminRoutes.post("/settings/gemini-key", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { key?: string };
  const k = (body.key ?? "").trim();
  if (k.length < 20) badRequest("Geçerli bir Gemini API anahtarı gir");
  const health = await geminiHealth(k);
  if (health !== "ok") badRequest(`Anahtar doğrulanamadı (${health}) — kaydedilmedi`);
  await setSetting(c.env.DB, "gemini_api_key", k);
  return c.json({ ok: true as const, keyMasked: `${k.slice(0, 6)}…${k.slice(-4)}` });
});

async function geminiHealth(key: string): Promise<string> {
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-goog-api-key": key },
      body: JSON.stringify({ contents: [{ parts: [{ text: "ping" }] }] }),
    });
    if (r.ok) return "ok";
    if (r.status === 429) return "quota_exceeded";
    return `error_${r.status}`;
  } catch {
    return "unreachable";
  }
}

// --- C5: Admin ilan düzenleme (sahiplik atlanır; tam status + görüntüleme sayısı) ---
adminRoutes.patch("/listings/:id", async (c) => {
  const id = c.req.param("id");
  const row = await c.env.DB.prepare(`SELECT * FROM listings WHERE id = ?`).bind(id).first();
  if (!row) notFound("İlan bulunamadı");
  const parsed = adminUpdateListingSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) badRequest("Geçersiz", parsed.error.flatten());
  const input = parsed.data!;

  const map: Record<string, unknown> = {
    title: input.title, description: input.description, category_id: input.categoryId,
    price: input.price, price_type: input.priceType, condition: input.condition,
    city: input.city, district: input.district, status: input.status, view_count: input.viewCount,
  };
  const fields: string[] = []; const binds: unknown[] = [];
  for (const [col, val] of Object.entries(map)) if (val !== undefined) { fields.push(`${col} = ?`); binds.push(val); }
  if (fields.length) {
    fields.push("updated_at = ?"); binds.push(now());
    await c.env.DB.prepare(`UPDATE listings SET ${fields.join(", ")} WHERE id = ?`).bind(...binds, id).run();
  }

  // FTS senkronu: aktif değilse çıkar; aktif + başlık/açıklama/durum değiştiyse tazele
  const finalStatus = String(input.status ?? row!.status);
  if (input.title !== undefined || input.description !== undefined || input.status !== undefined) {
    await c.env.DB.prepare(`DELETE FROM listings_fts WHERE listing_id = ?`).bind(id).run();
    if (finalStatus === "active") {
      const title = String(input.title ?? row!.title);
      const desc = String(input.description ?? row!.description ?? "");
      await c.env.DB.prepare(`INSERT INTO listings_fts (listing_id, title, body) VALUES (?, ?, ?)`).bind(id, foldTr(title), foldTr(desc)).run();
    }
  }

  const updated = await c.env.DB.prepare(`SELECT * FROM listings WHERE id = ?`).bind(id).first();
  const [listing] = await hydrateListings(c.env.DB, [rowToListing(updated as Record<string, unknown>)], { withSeller: true });
  return c.json(listing);
});

// --- AI Moderasyon: riskli ilan kuyruğu + risk temizle + manuel tara ---
adminRoutes.get("/moderation-queue", async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT * FROM listings WHERE risk_flag = 1 AND status != 'removed' ORDER BY risk_score DESC, created_at DESC LIMIT 60`,
  ).all();
  let items = (rows.results as Record<string, unknown>[]).map(rowToListing);
  items = await hydrateListings(c.env.DB, items, { withSeller: true });
  return c.json({ items });
});
adminRoutes.post("/listings/:id/clear-risk", async (c) => {
  await c.env.DB.prepare(`UPDATE listings SET risk_flag = 0 WHERE id = ?`).bind(c.req.param("id")).run();
  return c.json({ ok: true as const });
});
adminRoutes.post("/listings/:id/moderate", async (c) => {
  const id = c.req.param("id");
  const row = await c.env.DB.prepare(`SELECT id, title, description, price, category_id FROM listings WHERE id = ?`).bind(id).first();
  if (!row) notFound("İlan bulunamadı");
  await moderateListingAI(c.env, c.env.DB, {
    id, title: String(row!.title), description: String(row!.description ?? ""),
    price: Number(row!.price), categoryName: getCategory(String(row!.category_id))?.name,
  });
  const updated = await c.env.DB.prepare(`SELECT risk_score, risk_flag, risk_category, risk_reasons FROM listings WHERE id = ?`).bind(id).first();
  return c.json({
    ok: true as const,
    riskScore: updated?.risk_score != null ? Number(updated.risk_score) : null,
    riskFlag: !!updated?.risk_flag,
    riskCategory: (updated?.risk_category as string) ?? null,
  });
});

// --- Öne Çıkanlar: boost'lu aktif ilanlar ---
adminRoutes.get("/featured", async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT * FROM listings WHERE boosted_until > ?1 AND status='active' ORDER BY boosted_until DESC LIMIT 60`,
  ).bind(now()).all();
  let items = (rows.results as Record<string, unknown>[]).map(rowToListing);
  items = await hydrateListings(c.env.DB, items, { withSeller: true });
  return c.json({ items });
});

// --- Mesajlar: konuşma listesi (trust & safety / yasadışı içerik denetimi) ---
adminRoutes.get("/conversations", async (c) => {
  const q = (c.req.query("q") ?? "").trim();
  const risky = c.req.query("risky") === "1";
  const where = q ? "WHERE (b.name LIKE ?1 OR s.name LIKE ?1 OR l.title LIKE ?1 OR b.phone LIKE ?1 OR s.phone LIKE ?1)" : "";
  const rows = await c.env.DB.prepare(
    `SELECT cv.id, cv.listing_id, cv.buyer_id, cv.seller_id, cv.last_message_at, cv.created_at,
            l.title AS listing_title, b.name AS buyer_name, b.phone AS buyer_phone,
            s.name AS seller_name, s.phone AS seller_phone,
            (SELECT COUNT(*) FROM messages m WHERE m.conversation_id=cv.id) AS msg_count,
            (SELECT COUNT(*) FROM messages m WHERE m.conversation_id=cv.id AND m.flagged=1) AS flagged_count
     FROM conversations cv
     JOIN listings l ON l.id=cv.listing_id
     JOIN users b ON b.id=cv.buyer_id
     JOIN users s ON s.id=cv.seller_id
     ${where} ORDER BY cv.last_message_at DESC LIMIT 80`,
  ).bind(...(q ? [`%${q}%`] : [])).all();
  let items = (rows.results as Record<string, unknown>[]).map((r) => ({
    id: r.id as string, listingId: r.listing_id as string, listingTitle: (r.listing_title as string) ?? "—",
    buyerId: r.buyer_id as string, buyerName: (r.buyer_name as string) ?? "—", buyerPhone: (r.buyer_phone as string) ?? "",
    sellerId: r.seller_id as string, sellerName: (r.seller_name as string) ?? "—", sellerPhone: (r.seller_phone as string) ?? "",
    lastMessageAt: Number(r.last_message_at), createdAt: Number(r.created_at),
    messageCount: Number(r.msg_count ?? 0), flaggedCount: Number(r.flagged_count ?? 0),
  }));
  if (risky) items = items.filter((x) => x.flaggedCount > 0);
  return c.json({ items });
});

adminRoutes.get("/conversations/:id/messages", async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT m.id, m.sender_id, m.type, m.body, m.offer_amount, m.offer_status, m.flagged, m.created_at, u.name AS sender_name
     FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.conversation_id=? ORDER BY m.created_at ASC`,
  ).bind(c.req.param("id")).all();
  return c.json({
    messages: (rows.results as Record<string, unknown>[]).map((r) => ({
      id: r.id as string, senderId: r.sender_id as string, senderName: (r.sender_name as string) ?? "—",
      type: r.type as string, body: (r.body as string) ?? null, offerAmount: (r.offer_amount as number) ?? null,
      offerStatus: (r.offer_status as string) ?? null, flagged: !!r.flagged, createdAt: Number(r.created_at),
    })),
  });
});

// --- C2: Zorunlu güncelleme config (oku/yaz) ---
const CONFIG_KEYS = ["min_version_ios", "min_version_android", "latest_version_ios", "latest_version_android", "store_url_ios", "store_url_android", "update_message"];
adminRoutes.get("/config", async (c) => {
  const out: Record<string, string> = {};
  for (const k of CONFIG_KEYS) out[k] = (await getSetting(c.env.DB, k)) ?? "";
  return c.json(out);
});
adminRoutes.post("/config", async (c) => {
  const parsed = adminConfigSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) badRequest("Geçersiz", parsed.error.flatten());
  await setSetting(c.env.DB, parsed.data!.key, parsed.data!.value);
  return c.json({ ok: true as const });
});

// --- C4: Mağaza başvuru onay kuyruğu ---
adminRoutes.get("/store-applications", async (c) => {
  const status = (c.req.query("status") ?? "pending").trim();
  const rows = await c.env.DB.prepare(
    `SELECT sa.*, u.name AS user_name, u.phone AS user_phone FROM store_applications sa
     JOIN users u ON u.id = sa.user_id WHERE sa.status = ? ORDER BY sa.created_at DESC LIMIT 100`,
  ).bind(status).all();
  const out = await Promise.all((rows.results as Record<string, unknown>[]).map(async (r) => {
    const docIds: string[] = JSON.parse(String(r.doc_ids ?? "[]"));
    let docUrls: string[] = [];
    if (docIds.length) {
      const ph = docIds.map(() => "?").join(",");
      const imgs = await c.env.DB.prepare(`SELECT url FROM listing_images WHERE id IN (${ph})`).bind(...docIds).all();
      docUrls = (imgs.results as Record<string, unknown>[]).map((x) => x.url as string);
    }
    return {
      id: r.id, storeName: r.store_name, legalType: r.legal_type, taxNo: (r.tax_no as string) ?? null,
      docIds, docUrls, status: r.status, reviewNote: (r.review_note as string) ?? null,
      createdAt: r.created_at, reviewedAt: (r.reviewed_at as number) ?? null,
      userId: r.user_id, userName: r.user_name, userPhone: r.user_phone,
      tcVerified: !!r.tc_hash, taxVerified: r.tax_no ? isValidVergiNo(String(r.tax_no)) : false,
    };
  }));
  return c.json(out);
});
adminRoutes.post("/store-applications/:id/approve", async (c) => {
  const id = c.req.param("id");
  const admin = c.get("user");
  const app = await c.env.DB.prepare(`SELECT * FROM store_applications WHERE id = ?`).bind(id).first();
  if (!app) notFound("Başvuru bulunamadı");
  await c.env.DB.batch([
    c.env.DB.prepare(`UPDATE store_applications SET status='approved', reviewer_id=?, reviewed_at=? WHERE id=?`).bind(admin.id, now(), id),
    c.env.DB.prepare(`UPDATE users SET is_store=1, store_name=?, store_status='approved', store_verified_at=? WHERE id=?`).bind(app!.store_name, now(), app!.user_id),
  ]);
  await notify(c.env.DB, app!.user_id as string, "system", "Mağaza başvurun onaylandı 🎉", "Artık onaylı mağaza olarak satış yapabilirsin.", {});
  return c.json({ ok: true as const });
});
adminRoutes.post("/store-applications/:id/reject", async (c) => {
  const id = c.req.param("id");
  const admin = c.get("user");
  const body = (await c.req.json().catch(() => ({}))) as { note?: string };
  const app = await c.env.DB.prepare(`SELECT user_id FROM store_applications WHERE id = ?`).bind(id).first();
  if (!app) notFound("Başvuru bulunamadı");
  await c.env.DB.batch([
    c.env.DB.prepare(`UPDATE store_applications SET status='rejected', reviewer_id=?, review_note=?, reviewed_at=? WHERE id=?`).bind(admin.id, body.note ?? null, now(), id),
    c.env.DB.prepare(`UPDATE users SET store_status='rejected' WHERE id=?`).bind(app!.user_id),
  ]);
  await notify(c.env.DB, app!.user_id as string, "system", "Mağaza başvurun reddedildi", body.note ?? "Başvuru gereklilikleri karşılamıyor.", {});
  return c.json({ ok: true as const });
});

// --- Kullanıcı listesi (son görülme + ilan sayısı) ---
adminRoutes.get("/users", async (c) => {
  const q = (c.req.query("q") ?? "").trim();
  const rows = await c.env.DB.prepare(
    `SELECT u.id, u.phone, u.name, u.city, u.created_at, u.phone_verified,
            u.is_store, u.is_admin, u.banned,
            (SELECT COUNT(*) FROM listings l WHERE l.seller_id = u.id) AS listing_count,
            (SELECT MAX(s.created_at) FROM sessions s WHERE s.user_id = u.id) AS last_seen
     FROM users u
     ${q ? "WHERE u.phone LIKE ?1 OR u.name LIKE ?1" : ""}
     ORDER BY u.created_at DESC LIMIT 200`,
  ).bind(...(q ? [`%${q}%`] : [])).all();
  return c.json((rows.results as Record<string, unknown>[]).map((r) => ({
    id: r.id, phone: r.phone, name: r.name, city: r.city, createdAt: r.created_at,
    phoneVerified: Boolean(r.phone_verified), isStore: Boolean(r.is_store),
    isAdmin: Boolean(r.is_admin), banned: Boolean(r.banned),
    listingCount: Number(r.listing_count ?? 0), lastSeen: r.last_seen ?? null,
  })));
});

// --- Şikayet kuyruğu ---
adminRoutes.get("/reports", async (c) => {
  const status = c.req.query("status") ?? "open";
  const rows = await c.env.DB.prepare(
    `SELECT r.*, u.name AS reporter_name FROM reports r JOIN users u ON u.id = r.reporter_id
     WHERE r.status = ? ORDER BY r.created_at DESC LIMIT 100`,
  ).bind(status).all();
  return c.json((rows.results as Record<string, unknown>[]).map((r) => ({
    id: r.id, targetType: r.target_type, targetId: r.target_id, reason: r.reason,
    status: r.status, reporterName: r.reporter_name, createdAt: r.created_at,
  })));
});

adminRoutes.post("/reports/:id/resolve", async (c) => {
  await c.env.DB.prepare(`UPDATE reports SET status = 'resolved' WHERE id = ?`).bind(c.req.param("id")).run();
  return c.json({ ok: true as const });
});

// --- İlan kaldır ---
adminRoutes.post("/listings/:id/remove", async (c) => {
  const id = c.req.param("id");
  const row = await c.env.DB.prepare(`SELECT id FROM listings WHERE id = ?`).bind(id).first();
  if (!row) notFound("İlan yok");
  await c.env.DB.batch([
    c.env.DB.prepare(`UPDATE listings SET status = 'removed', updated_at = ? WHERE id = ?`).bind(now(), id),
    c.env.DB.prepare(`DELETE FROM listings_fts WHERE listing_id = ?`).bind(id),
  ]);
  return c.json({ ok: true as const });
});

// --- Kullanıcı ban / unban ---
adminRoutes.post("/users/:id/ban", async (c) => {
  const id = c.req.param("id");
  await c.env.DB.batch([
    c.env.DB.prepare(`UPDATE users SET banned = 1 WHERE id = ?`).bind(id),
    c.env.DB.prepare(`UPDATE listings SET status = 'removed' WHERE seller_id = ? AND status = 'active'`).bind(id),
    c.env.DB.prepare(`DELETE FROM listings_fts WHERE listing_id IN (SELECT id FROM listings WHERE seller_id = ?)`).bind(id),
  ]);
  return c.json({ ok: true as const });
});

adminRoutes.post("/users/:id/unban", async (c) => {
  await c.env.DB.prepare(`UPDATE users SET banned = 0 WHERE id = ?`).bind(c.req.param("id")).run();
  return c.json({ ok: true as const });
});

// --- Synonym yönetimi ---
adminRoutes.get("/synonyms", async (c) => {
  const rows = await c.env.DB.prepare(`SELECT * FROM synonyms ORDER BY created_at DESC`).all();
  return c.json((rows.results as Record<string, unknown>[]).map((r) => ({
    id: r.id, term: r.term, aliases: (r.aliases as string).split(",").filter(Boolean),
  })));
});

adminRoutes.post("/synonyms", async (c) => {
  const { term, aliases } = (await c.req.json().catch(() => ({}))) as { term?: string; aliases?: string[] };
  if (!term || !aliases?.length) badRequest("term ve aliases gerekli");
  await c.env.DB.prepare(`INSERT INTO synonyms (id, term, aliases, created_at) VALUES (?,?,?,?)`)
    .bind(newId("syn"), foldTr(term!), aliases!.map(foldTr).join(","), now()).run();
  return c.json({ ok: true as const }, 201);
});

adminRoutes.delete("/synonyms/:id", async (c) => {
  await c.env.DB.prepare(`DELETE FROM synonyms WHERE id = ?`).bind(c.req.param("id")).run();
  return c.json({ ok: true as const });
});
