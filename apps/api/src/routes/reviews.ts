import { Hono } from "hono";
import { createReviewSchema } from "@satiyo/shared";
import type { Env, Variables } from "../env.js";
import { badRequest, conflict, forbidden, notFound } from "../lib/http.js";
import { newId, now } from "../lib/id.js";
import { rowToReview } from "../lib/db.js";
import { requireAuth } from "../middleware/auth.js";

export const reviewRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// Satış sonrası değerlendirme — yalnızca satılmış/rezerve ilanlar üzerinden.
reviewRoutes.post("/", requireAuth, async (c) => {
  const parsed = createReviewSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) badRequest("Değerlendirme geçersiz", parsed.error.flatten());
  const input = parsed.data!;
  const user = c.get("user");
  if (input.reviewedId === user.id) badRequest("Kendinizi değerlendiremezsiniz");

  const listing = await c.env.DB.prepare(`SELECT * FROM listings WHERE id = ?`).bind(input.listingId).first();
  if (!listing) notFound("İlan bulunamadı");

  // Değerlendiren ya satıcı ya da bu ilanda konuşmuş bir alıcı olmalı
  const isSeller = listing!.seller_id === user.id;
  const conv = await c.env.DB.prepare(
    `SELECT 1 FROM conversations WHERE listing_id = ? AND (buyer_id = ? OR seller_id = ?)`,
  ).bind(input.listingId, user.id, user.id).first();
  if (!isSeller && !conv) forbidden("Bu ilanla ilgili işleminiz yok");

  try {
    const id = newId("rev");
    await c.env.DB.prepare(
      `INSERT INTO reviews (id, listing_id, reviewer_id, reviewed_id, rating, comment, created_at)
       VALUES (?,?,?,?,?,?,?)`,
    ).bind(id, input.listingId, user.id, input.reviewedId, input.rating, input.comment ?? null, now()).run();

    // Güven skoru: değerlendirme sayısı + ortalama puan basit bileşeni
    await c.env.DB.prepare(
      `UPDATE users SET trust_score = (
         SELECT CAST(AVG(rating) * 20 AS INTEGER) + COUNT(*) FROM reviews WHERE reviewed_id = ?
       ) WHERE id = ?`,
    ).bind(input.reviewedId, input.reviewedId).run();

    const row = await c.env.DB.prepare(`SELECT * FROM reviews WHERE id = ?`).bind(id).first();
    return c.json(rowToReview(row as Record<string, unknown>), 201);
  } catch (e) {
    if (String(e).includes("UNIQUE")) conflict("Bu ilanı zaten değerlendirdiniz");
    throw e;
  }
});
