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
    // A1 — son görülme (koşullu, 30sn debounce; yanıtı bloklamaz, write-amp önler)
    touchLastSeen(c, payload!.sub);
    await next();
  };

/** last_seen'i en fazla 30sn'de bir günceller; yanıtı beklemez (waitUntil). */
function touchLastSeen(c: { env: Env; executionCtx?: { waitUntil(p: Promise<unknown>): void } }, userId: string): void {
  const now = Date.now();
  const p = c.env.DB.prepare(
    "UPDATE users SET last_seen = ?1 WHERE id = ?2 AND (last_seen IS NULL OR last_seen < ?1 - 30000)",
  ).bind(now, userId).run().then(() => undefined).catch(() => undefined);
  try {
    c.executionCtx?.waitUntil(p);
  } catch {
    // executionCtx yoksa (ör. test) sessizce yut — sonucu beklemeye gerek yok
    void p;
  }
}

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
