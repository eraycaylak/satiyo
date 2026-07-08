import { Hono } from "hono";
import type { Env, Variables } from "../env.js";
import { badRequest, notFound } from "../lib/http.js";
import { newId, now } from "../lib/id.js";
import { foldTr } from "@satiyo/shared";
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

  const [u, l, act, act24, conv, msg, fav, rev, rep, pay] = await Promise.all([
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
  });
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
