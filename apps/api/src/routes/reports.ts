import { Hono } from "hono";
import { createReportSchema } from "@satiyo/shared";
import type { Env, Variables } from "../env.js";
import { badRequest, fail } from "../lib/http.js";
import { newId, now } from "../lib/id.js";
import { requireAuth } from "../middleware/auth.js";

export const reportRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

reportRoutes.post("/", requireAuth, async (c) => {
  const parsed = createReportSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) badRequest("Şikayet geçersiz", parsed.error.flatten());
  const input = parsed.data!;
  const user = c.get("user");

  // Dedup — aynı raporlayanın aynı hedefte (targetType+targetId) zaten açık şikayeti varsa
  // yeni satır açma, sessiz ok dön (idempotent).
  const existing = await c.env.DB.prepare(
    `SELECT 1 FROM reports WHERE reporter_id = ? AND target_type = ? AND target_id = ? AND status = 'open'`,
  ).bind(user.id, input.targetType, input.targetId).first();
  if (existing) return c.json({ ok: true as const });

  // Hız sınırı — kısa pencerede aşırı şikayet spam'ini engelle.
  const REPORT_WINDOW_MS = 60 * 60 * 1000; // 1 saat
  const REPORT_MAX = 20;
  const recent = await c.env.DB.prepare(
    `SELECT COUNT(*) AS n FROM reports WHERE reporter_id = ? AND created_at > ?`,
  ).bind(user.id, now() - REPORT_WINDOW_MS).first();
  if (recent && Number(recent.n) >= REPORT_MAX) {
    fail(429, "report_rate", "Çok fazla şikayet gönderdiniz, lütfen daha sonra tekrar deneyin");
  }

  await c.env.DB.prepare(
    `INSERT INTO reports (id, reporter_id, target_type, target_id, reason, status, created_at)
     VALUES (?,?,?,?,?, 'open', ?)`,
  ).bind(newId("rpt"), user.id, input.targetType, input.targetId, input.reason, now()).run();

  return c.json({ ok: true as const });
});
