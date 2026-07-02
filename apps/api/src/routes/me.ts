import { Hono } from "hono";
import { savedSearchSchema, updateProfileSchema, STORE_MEMBERSHIP } from "@satiyo/shared";
import type { Env, Variables } from "../env.js";
import { badRequest, fail } from "../lib/http.js";
import { hydrateListings, rowToListing, rowToUser } from "../lib/db.js";
import { newId, now } from "../lib/id.js";
import { getPaymentProvider } from "../lib/payments.js";
import { requireAuth } from "../middleware/auth.js";

export const meRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

meRoutes.use("*", requireAuth);

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
       ORDER BY (CASE WHEN boosted_until > ? THEN 0 ELSE 1 END), created_at DESC LIMIT 12`,
    ).bind(user.id, ...catIds, user.id, ts).all();
  } else {
    rows = await c.env.DB.prepare(
      `SELECT * FROM listings WHERE status = 'active' AND seller_id != ?
       ORDER BY (CASE WHEN boosted_until > ? THEN 0 ELSE 1 END), created_at DESC LIMIT 12`,
    ).bind(user.id, ts).all();
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
