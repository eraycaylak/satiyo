import type { MiddlewareHandler } from "hono";
import type { Env, Variables } from "../env.js";
import { verifyJwt } from "../lib/crypto.js";
import { fail, unauthorized } from "../lib/http.js";
import { now } from "../lib/id.js";

/** Bearer jetonu doğrular, geçerliyse c.set("user", ...) yapar. */
export const requireAuth: MiddlewareHandler<{ Bindings: Env; Variables: Variables }> =
  async (c, next) => {
    const auth = c.req.header("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) unauthorized();
    const payload = await verifyJwt(token!, c.env.JWT_SECRET);
    if (!payload) unauthorized("Geçersiz veya süresi dolmuş oturum");

    // Ban + oturum-iptali kontrolü: imza geçerli olsa da, kullanıcı banlıysa veya
    // oturum kaydı silinmişse (hesap silme / admin iptali) erişimi reddet.
    // (JWT stateless olduğundan bu kontrol olmadan ban/silme aktif token'ı geçersizleştiremiyordu.)
    const acct = await c.env.DB.prepare(
      `SELECT u.banned AS banned,
              (SELECT 1 FROM sessions WHERE id = ?2 AND user_id = u.id AND expires_at > ?3) AS session_ok
       FROM users u WHERE u.id = ?1`,
    ).bind(payload!.sub, payload!.jti, now()).first();
    if (!acct) unauthorized("Oturum geçersiz");
    if ((acct as Record<string, unknown>).banned) fail(403, "banned", "Hesabınız askıya alındı");
    if (!(acct as Record<string, unknown>).session_ok) unauthorized("Oturum sonlandırılmış, tekrar giriş yapın");

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
