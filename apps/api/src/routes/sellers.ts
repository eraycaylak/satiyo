import { Hono } from "hono";
import type { Env, Variables } from "../env.js";
import { notFound } from "../lib/http.js";
import { hydrateListings, rowToListing, rowToReview, rowToSeller } from "../lib/db.js";
import { optionalAuth } from "../middleware/auth.js";

export const sellerRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

sellerRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const row = await c.env.DB.prepare(
    `SELECT u.*, AVG(r.rating) AS rating_avg, COUNT(r.id) AS rating_count
     FROM users u LEFT JOIN reviews r ON r.reviewed_id = u.id
     WHERE u.id = ? GROUP BY u.id`,
  ).bind(id).first();
  if (!row) notFound("Satıcı bulunamadı");
  return c.json(rowToSeller(row as Record<string, unknown>));
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
