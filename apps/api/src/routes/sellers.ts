import { Hono } from "hono";
import type { Env, Variables } from "../env.js";
import { badRequest, notFound } from "../lib/http.js";
import { now } from "../lib/id.js";
import { hydrateListings, rowToListing, rowToReview, rowToSeller } from "../lib/db.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";

export const sellerRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

sellerRoutes.get("/:id", optionalAuth, async (c) => {
  const id = c.req.param("id");
  const viewer = c.get("user");
  const row = await c.env.DB.prepare(
    `SELECT u.*, AVG(r.rating) AS rating_avg, COUNT(r.id) AS rating_count
     FROM users u LEFT JOIN reviews r ON r.reviewed_id = u.id
     WHERE u.id = ? GROUP BY u.id`,
  ).bind(id).first();
  if (!row) notFound("Satıcı bulunamadı");
  const fc = await c.env.DB.prepare(`SELECT COUNT(*) AS n FROM follows WHERE following_id = ?`).bind(id).first();
  const sc = await c.env.DB.prepare(`SELECT COUNT(*) AS n FROM listings WHERE seller_id = ? AND status = 'sold'`).bind(id).first();
  const isFollowing = viewer
    ? !!(await c.env.DB.prepare(`SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?`).bind(viewer.id, id).first())
    : false;
  return c.json({ ...rowToSeller(row as Record<string, unknown>), followerCount: Number(fc?.n ?? 0), salesCount: Number(sc?.n ?? 0), isFollowing });
});

// Satıcıyı takip et / bırak
sellerRoutes.post("/:id/follow", requireAuth, async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");
  if (id === user.id) badRequest("Kendinizi takip edemezsiniz");
  const exists = await c.env.DB.prepare(`SELECT 1 FROM users WHERE id = ?`).bind(id).first();
  if (!exists) notFound("Kullanıcı bulunamadı");
  await c.env.DB.prepare(
    `INSERT INTO follows (follower_id, following_id, created_at) VALUES (?,?,?) ON CONFLICT DO NOTHING`,
  ).bind(user.id, id, now()).run();
  return c.json({ ok: true as const });
});

sellerRoutes.delete("/:id/follow", requireAuth, async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");
  await c.env.DB.prepare(`DELETE FROM follows WHERE follower_id = ? AND following_id = ?`).bind(user.id, id).run();
  return c.json({ ok: true as const });
});

sellerRoutes.get("/:id/listings", optionalAuth, async (c) => {
  const id = c.req.param("id");
  const rows = await c.env.DB.prepare(
    `SELECT * FROM listings WHERE seller_id = ? AND status = 'active' ORDER BY created_at DESC`,
  ).bind(id).all();
  let listings = (rows.results as Record<string, unknown>[]).map(rowToListing);
  const user = c.get("user");
  listings = await hydrateListings(c.env.DB, listings, { favoriteUserId: user?.id ?? null });
  return c.json({ items: listings, page: 1, pageSize: listings.length, total: listings.length, hasMore: false });
});

sellerRoutes.get("/:id/reviews", async (c) => {
  const id = c.req.param("id");
  const rows = await c.env.DB.prepare(
    `SELECT r.*, u.name AS reviewer_name, u.avatar_url AS reviewer_avatar
     FROM reviews r JOIN users u ON u.id = r.reviewer_id
     WHERE r.reviewed_id = ? ORDER BY r.created_at DESC LIMIT 50`,
  ).bind(id).all();
  const reviews = (rows.results as Record<string, unknown>[]).map((r) => ({
    ...rowToReview(r),
    reviewer: { id: r.reviewer_id as string, name: r.reviewer_name as string, avatarUrl: (r.reviewer_avatar as string) ?? null },
  }));
  return c.json(reviews);
});
