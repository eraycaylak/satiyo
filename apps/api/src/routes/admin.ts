import { Hono } from "hono";
import type { Env, Variables } from "../env.js";
import { badRequest, notFound } from "../lib/http.js";
import { newId, now } from "../lib/id.js";
import { foldTr } from "@satiyo/shared";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";

export const adminRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();
adminRoutes.use("*", requireAuth, requireAdmin);

// --- Özet metrikler ---
adminRoutes.get("/stats", async (c) => {
  const q = (sql: string) => c.env.DB.prepare(sql).first().then((r) => (r?.n as number) ?? 0);
  const [users, listings, openReports, payments] = await Promise.all([
    q("SELECT COUNT(*) AS n FROM users"),
    q("SELECT COUNT(*) AS n FROM listings WHERE status = 'active'"),
    q("SELECT COUNT(*) AS n FROM reports WHERE status = 'open'"),
    q("SELECT COALESCE(SUM(amount),0) AS n FROM payments WHERE status = 'paid'"),
  ]);
  return c.json({ users, activeListings: listings, openReports, revenue: payments });
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
