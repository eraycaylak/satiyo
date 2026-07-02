import { Hono } from "hono";
import { createReportSchema } from "@satiyo/shared";
import type { Env, Variables } from "../env.js";
import { badRequest } from "../lib/http.js";
import { newId, now } from "../lib/id.js";
import { requireAuth } from "../middleware/auth.js";

export const reportRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

reportRoutes.post("/", requireAuth, async (c) => {
  const parsed = createReportSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) badRequest("Şikayet geçersiz", parsed.error.flatten());
  const input = parsed.data!;
  const user = c.get("user");

  await c.env.DB.prepare(
    `INSERT INTO reports (id, reporter_id, target_type, target_id, reason, status, created_at)
     VALUES (?,?,?,?,?, 'open', ?)`,
  ).bind(newId("rpt"), user.id, input.targetType, input.targetId, input.reason, now()).run();

  return c.json({ ok: true as const });
});
