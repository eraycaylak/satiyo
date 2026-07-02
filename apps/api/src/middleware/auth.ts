import type { MiddlewareHandler } from "hono";
import type { Env, Variables } from "../env.js";
import { verifyJwt } from "../lib/crypto.js";
import { unauthorized } from "../lib/http.js";

/** Bearer jetonu doğrular, geçerliyse c.set("user", ...) yapar. */
export const requireAuth: MiddlewareHandler<{ Bindings: Env; Variables: Variables }> =
  async (c, next) => {
    const auth = c.req.header("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) unauthorized();
    const payload = await verifyJwt(token!, c.env.JWT_SECRET);
    if (!payload) unauthorized("Geçersiz veya süresi dolmuş oturum");
    c.set("user", { id: payload!.sub, phone: payload!.phone });
    await next();
  };

/** İsteğe bağlı kimlik — varsa set eder, yoksa devam. */
export const optionalAuth: MiddlewareHandler<{ Bindings: Env; Variables: Variables }> =
  async (c, next) => {
    const auth = c.req.header("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
    if (token) {
      const payload = await verifyJwt(token, c.env.JWT_SECRET);
      if (payload) c.set("user", { id: payload.sub, phone: payload.phone });
    }
    await next();
  };
