import { Hono } from "hono";
import { requestOtpSchema, verifyOtpSchema } from "@satiyo/shared";
import type { Env, Variables } from "../env.js";
import { badRequest, fail } from "../lib/http.js";
import { sha256, signJwt } from "../lib/crypto.js";
import { newId, now } from "../lib/id.js";
import { rowToUser } from "../lib/db.js";
import { sendSms } from "../lib/sms.js";

const OTP_TTL_MS = 3 * 60 * 1000; // 3 dk
const SESSION_TTL_S = 60 * 60 * 24 * 30; // 30 gün

// App Store / Play denetçisi için sabit demo hesabı: SMS gelmeden normal telefon
// akışından giriş yapabilsin diye. Bu numara + kod App Review notlarında belgelenir.
// Gerçek SMS (NetGSM) devreye girince bu bypass kaldırılabilir.
const REVIEWER_PHONE = "+905550000000";
const REVIEWER_CODE = "424242";

export const authRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

/** Demo/denetçi kullanıcısını oluştur/getir → JWT oturum dön. */
async function issueSession(c: { env: Env }, phone: string, name: string, city?: string) {
  let userRow = await c.env.DB.prepare(`SELECT * FROM users WHERE phone = ?`).bind(phone).first();
  if (!userRow) {
    const id = newId("usr");
    await c.env.DB.prepare(
      `INSERT INTO users (id, phone, name, city, created_at, phone_verified) VALUES (?,?,?,?,?,1)`,
    ).bind(id, phone, name, city ?? null, now()).run();
    userRow = await c.env.DB.prepare(`SELECT * FROM users WHERE id = ?`).bind(id).first();
  }
  const user = rowToUser(userRow as Record<string, unknown>);
  const iat = Math.floor(now() / 1000);
  const exp = iat + SESSION_TTL_S;
  const jti = newId("ses");
  await c.env.DB.prepare(`INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?,?,?,?)`)
    .bind(jti, user.id, now(), exp * 1000).run();
  const token = await signJwt({ sub: user.id, phone: user.phone, jti, iat, exp }, c.env.JWT_SECRET);
  return { token, user, expiresAt: exp * 1000 };
}

/**
 * GEÇİCİ — numarasız hızlı giriş (sadece geliştirme). SMS OTP gelince KALDIRILACAK.
 * Sabit bir demo kullanıcısıyla oturum açar.
 */
authRoutes.post("/dev-login", async (c) => {
  if (c.env.ENVIRONMENT === "production") fail(403, "disabled", "Dev giriş prod'da kapalı");
  const phone = "+905550000000";
  let userRow = await c.env.DB.prepare(`SELECT * FROM users WHERE phone = ?`).bind(phone).first();
  if (!userRow) {
    const id = newId("usr");
    await c.env.DB.prepare(
      `INSERT INTO users (id, phone, name, city, created_at, phone_verified) VALUES (?,?,?,?,?,1)`,
    ).bind(id, phone, "Demo Kullanıcı", "İstanbul", now()).run();
    userRow = await c.env.DB.prepare(`SELECT * FROM users WHERE id = ?`).bind(id).first();
  }
  const user = rowToUser(userRow as Record<string, unknown>);
  const iat = Math.floor(now() / 1000);
  const exp = iat + SESSION_TTL_S;
  const jti = newId("ses");
  await c.env.DB.prepare(`INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?,?,?,?)`)
    .bind(jti, user.id, now(), exp * 1000).run();
  const token = await signJwt({ sub: user.id, phone: user.phone, jti, iat, exp }, c.env.JWT_SECRET);
  return c.json({ token, user, expiresAt: exp * 1000 });
});

/** Telefona OTP gönder (gerçek SMS sağlayıcısı prod'da takılır). */
authRoutes.post("/otp/request", async (c) => {
  const parsed = requestOtpSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) badRequest("Geçersiz telefon", parsed.error.flatten());
  const { phone } = parsed.data!;

  // Denetçi demo numarası: SMS gönderme, sabit kod kullanılacak.
  if (phone === REVIEWER_PHONE) return c.json({ ok: true as const, delivered: false });

  // 6 haneli kod. Geliştirmede sabit 000000 yerine rastgele üretip dev'de döneriz.
  const code = (Math.floor(crypto.getRandomValues(new Uint32Array(1))[0]! % 1_000_000))
    .toString()
    .padStart(6, "0");
  const codeHash = await sha256(`${phone}:${code}`);
  const ts = now();

  await c.env.DB.prepare(
    `INSERT INTO otp_codes (phone, code_hash, expires_at, attempts, created_at)
     VALUES (?, ?, ?, 0, ?)
     ON CONFLICT(phone) DO UPDATE SET code_hash=excluded.code_hash, expires_at=excluded.expires_at, attempts=0, created_at=excluded.created_at`,
  )
    .bind(phone, codeHash, ts + OTP_TTL_MS, ts)
    .run();

  // Gerçek SMS (NetGSM) — secret varsa gönder. Secret yoksa (henüz kurulmadı) 500 atma;
  // akış kırılmasın diye ok dön. Kodu prod'da asla döndürme.
  const isProd = c.env.ENVIRONMENT === "production";
  const sent = await sendSms(c.env, phone, `Satiyo dogrulama kodunuz: ${code}. Kimseyle paylasmayin.`);
  const devCode = isProd ? undefined : code;
  return c.json({ ok: true as const, devCode, delivered: sent });
});

/** OTP doğrula → kullanıcı oluştur/getir → JWT oturum dön. */
authRoutes.post("/otp/verify", async (c) => {
  const parsed = verifyOtpSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) badRequest("Geçersiz kod", parsed.error.flatten());
  const { phone, code } = parsed.data!;

  // Denetçi demo hesabı: sabit kodla SMS'siz giriş.
  if (phone === REVIEWER_PHONE && code === REVIEWER_CODE) {
    return c.json(await issueSession(c, REVIEWER_PHONE, "Demo Kullanıcı", "İstanbul"));
  }

  const row = await c.env.DB.prepare(`SELECT * FROM otp_codes WHERE phone = ?`).bind(phone).first();
  if (!row) fail(400, "otp_not_found", "Önce kod isteyin");
  if ((row!.attempts as number) >= 5) fail(429, "otp_locked", "Çok fazla deneme, yeni kod isteyin");
  if ((row!.expires_at as number) < now()) fail(400, "otp_expired", "Kodun süresi doldu");

  const codeHash = await sha256(`${phone}:${code}`);
  if (codeHash !== (row!.code_hash as string)) {
    await c.env.DB.prepare(`UPDATE otp_codes SET attempts = attempts + 1 WHERE phone = ?`).bind(phone).run();
    fail(400, "otp_invalid", "Kod hatalı");
  }

  await c.env.DB.prepare(`DELETE FROM otp_codes WHERE phone = ?`).bind(phone).run();

  let userRow = await c.env.DB.prepare(`SELECT * FROM users WHERE phone = ?`).bind(phone).first();
  if (!userRow) {
    const id = newId("usr");
    await c.env.DB.prepare(
      `INSERT INTO users (id, phone, name, created_at, phone_verified) VALUES (?, ?, ?, ?, 1)`,
    )
      .bind(id, phone, "Satıyo Kullanıcısı", now())
      .run();
    userRow = await c.env.DB.prepare(`SELECT * FROM users WHERE id = ?`).bind(id).first();
  } else if (!userRow.phone_verified) {
    await c.env.DB.prepare(`UPDATE users SET phone_verified = 1 WHERE id = ?`).bind(userRow.id).run();
  }

  if ((userRow as Record<string, unknown>).banned) fail(403, "banned", "Hesabınız askıya alındı");

  const user = rowToUser(userRow as Record<string, unknown>);
  const iat = Math.floor(now() / 1000);
  const exp = iat + SESSION_TTL_S;
  const jti = newId("ses");
  await c.env.DB.prepare(
    `INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`,
  )
    .bind(jti, user.id, now(), exp * 1000)
    .run();

  const token = await signJwt({ sub: user.id, phone: user.phone, jti, iat, exp }, c.env.JWT_SECRET);
  return c.json({ token, user, expiresAt: exp * 1000 });
});
