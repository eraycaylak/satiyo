import { Hono } from "hono";
import type { Env, Variables } from "../env.js";
import { optionalAuth } from "../middleware/auth.js";
import { newId, now } from "../lib/id.js";

export const eventRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

const NAME_RE = /^[a-z0-9_]{1,40}$/;
const PLATFORMS = new Set(["ios", "android", "web"]);
const MAX_PROPS_BYTES = 2048;

// Uygulama-içi olay kaydı. Oturum varsa user_id iliştirilir, yoksa anonim.
// Analytics asla kullanıcı akışını bozmamalı: her durumda 200 döner, hata yutulur.
eventRoutes.post("/", optionalAuth, async (c) => {
  try {
    const body = (await c.req.json().catch(() => ({}))) as {
      name?: string;
      props?: unknown;
      platform?: string;
    };
    const name = typeof body.name === "string" ? body.name : "";
    if (!NAME_RE.test(name)) return c.json({ ok: false as const });

    let props: string | null = null;
    if (body.props && typeof body.props === "object") {
      const s = JSON.stringify(body.props);
      props = s.length <= MAX_PROPS_BYTES ? s : null;
    }
    const platform = PLATFORMS.has(body.platform ?? "") ? body.platform! : null;
    const user = c.get("user");

    await c.env.DB.prepare(
      `INSERT INTO events (id, user_id, name, props, platform, created_at) VALUES (?,?,?,?,?,?)`,
    ).bind(newId("evt"), user?.id ?? null, name, props, platform, now()).run();

    return c.json({ ok: true as const });
  } catch {
    return c.json({ ok: false as const });
  }
});
