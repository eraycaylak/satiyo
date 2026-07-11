import { Hono } from "hono";
import type { Env, Variables } from "../env.js";
import { badRequest, notFound } from "../lib/http.js";
import { newId, now } from "../lib/id.js";
import { foldTr } from "@satiyo/shared";
import { getSetting, setSetting, getGeminiKey } from "../lib/settings.js";
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
