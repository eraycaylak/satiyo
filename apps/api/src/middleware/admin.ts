import type { MiddlewareHandler } from "hono";
import type { Env, Variables } from "../env.js";
import { forbidden } from "../lib/http.js";

/** requireAuth'tan SONRA kullanılır — kullanıcının admin olduğunu doğrular. */
export const requireAdmin: MiddlewareHandler<{ Bindings: Env; Variables: Variables }> =
  async (c, next) => {
    const user = c.get("user");
    const row = await c.env.DB.prepare(`SELECT is_admin FROM users WHERE id = ?`).bind(user.id).first();
    if (!row || !row.is_admin) forbidden("Admin yetkisi gerekli");
    await next();
  };
