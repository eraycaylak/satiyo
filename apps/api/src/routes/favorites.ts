import { Hono } from "hono";
import type { Env, Variables } from "../env.js";
import { notFound } from "../lib/http.js";
import { now } from "../lib/id.js";
import { requireAuth } from "../middleware/auth.js";

// Mount: /listings/:id/favorite
export const favoriteRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

favoriteRoutes.post("/:id/favorite", requireAuth, async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");
  const exists = await c.env.DB.prepare(`SELECT 1 FROM listings WHERE id = ? AND status = 'active'`).bind(id).first();
  if (!exists) notFound("İlan bulunamadı");
  await c.env.DB.prepare(
    `INSERT INTO favorites (user_id, listing_id, created_at) VALUES (?, ?, ?)
     ON CONFLICT(user_id, listing_id) DO NOTHING`,
  ).bind(user.id, id, now()).run();
  return c.json({ ok: true as const });
});

favoriteRoutes.delete("/:id/favorite", requireAuth, async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");
  await c.env.DB.prepare(`DELETE FROM favorites WHERE user_id = ? AND listing_id = ?`).bind(user.id, id).run();
  return c.json({ ok: true as const });
});
