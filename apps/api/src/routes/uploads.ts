import { Hono } from "hono";
import type { Env, Variables } from "../env.js";
import { badRequest, forbidden, notFound } from "../lib/http.js";
import { newId, now } from "../lib/id.js";
import { requireAuth } from "../middleware/auth.js";

export const uploadRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

/**
 * 1) İstemci POST /uploads {contentType} → imageId + uploadUrl + publicUrl alır.
 * 2) İstemci PUT uploadUrl (ham bayt) → R2'ye yazılır.
 * 3) İlan oluştururken imageId'yi imageIds[] içinde gönderir → ilana bağlanır.
 *
 * Not (prod): görsel resize/WebP/EXIF temizleme için Cloudflare Images veya
 * /cdn-cgi/image dönüşümü buraya takılır. MVP'de orijinal saklanır.
 */
uploadRoutes.post("/", requireAuth, async (c) => {
  const { contentType } = (await c.req.json().catch(() => ({}))) as { contentType?: string };
  if (!contentType || !ALLOWED.has(contentType)) badRequest("Desteklenmeyen görsel türü (jpeg/png/webp)");
  const user = c.get("user");

  const imageId = newId("img");
  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const key = `images/${imageId}.${ext}`;
  const publicUrl = `${c.env.PUBLIC_MEDIA_BASE}/${key}`;
  const origin = new URL(c.req.url).origin;

  await c.env.DB.prepare(
    `INSERT INTO listing_images (id, listing_id, owner_id, url, r2_key, position, created_at)
     VALUES (?, NULL, ?, ?, ?, 0, ?)`,
  ).bind(imageId, user.id, publicUrl, key, now()).run();

  return c.json({ imageId, uploadUrl: `${origin}/uploads/${imageId}`, publicUrl });
});

uploadRoutes.put("/:imageId", requireAuth, async (c) => {
  const imageId = c.req.param("imageId");
  const user = c.get("user");
  const row = await c.env.DB.prepare(`SELECT * FROM listing_images WHERE id = ?`).bind(imageId).first();
  if (!row) notFound("Görsel kaydı yok");
  if (row!.owner_id !== user.id) forbidden();

  const contentType = c.req.header("content-type") ?? "application/octet-stream";
  if (!ALLOWED.has(contentType)) badRequest("Desteklenmeyen görsel türü");
  const body = await c.req.arrayBuffer();
  if (body.byteLength === 0) badRequest("Boş içerik");
  if (body.byteLength > MAX_BYTES) badRequest("Görsel 8 MB'tan büyük");

  await c.env.MEDIA.put(row!.r2_key as string, body, { httpMetadata: { contentType } });
  return c.json({ ok: true as const, url: row!.url as string });
});
