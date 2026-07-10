import { Hono } from "hono";
import { savedSearchSchema, updateProfileSchema, STORE_MEMBERSHIP } from "@satiyo/shared";
import type { Env, Variables } from "../env.js";
import { badRequest, fail } from "../lib/http.js";
import { hydrateListings, rowToListing, rowToSeller, rowToUser } from "../lib/db.js";
import { newId, now } from "../lib/id.js";
import { getPaymentProvider } from "../lib/payments.js";
import { requireAuth } from "../middleware/auth.js";

export const meRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

meRoutes.use("*", requireAuth);

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
    c.env.DB.prepare(`DELETE FROM sessions WHERE user_id = ?`).bind(uid),
    c.env.DB.prepare(`DELETE FROM users WHERE id = ?`).bind(uid),
  ]);
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
  const rows = await c.env.DB.prepare(
    `SELECT * FROM listings WHERE seller_id = ? AND status != 'removed' ORDER BY created_at DESC`,
  ).bind(user.id).all();
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
  return c.json({ items: listings, basedOn: catIds });
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
