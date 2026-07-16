import { Hono } from "hono";
import { requestOtpSchema, verifyOtpSchema } from "@satiyo/shared";
import type { Env, Variables } from "../env.js";
import { badRequest, fail } from "../lib/http.js";
import { sha256, signJwt } from "../lib/crypto.js";
import { newId, now } from "../lib/id.js";
import { rowToUser } from "../lib/db.js";
import { grantSignupBonusOnce } from "../lib/credit.js";
import { sendSms } from "../lib/sms.js";
import { twilioConfigured, startVerification, checkVerification } from "../lib/twilio.js";

const OTP_TTL_MS = 3 * 60 * 1000; // 3 dk
const SESSION_TTL_S = 60 * 60 * 24 * 30; // 30 gün

// App Store / Play denetçisi için sabit demo hesabı: SMS gelmeden normal telefon
// akışından giriş yapabilsin diye. Bu numara + kod App Review notlarında belgelenir.
// Gerçek SMS (NetGSM) devreye girince bu bypass kaldırılabilir.
const REVIEWER_PHONE = "+905550000000";
const REVIEWER_CODE = "424242";

// OTP istek hız sınırı (SMS bombardımanı / maliyet istismarı önlemi)
const OTP_WINDOW_MS = 60 * 60 * 1000; // 1 saat
const OTP_MAX_PER_WINDOW = 5;
const OTP_COOLDOWN_MS = 60 * 1000; // 60 sn

/** Numara başına OTP isteği hız sınırı: 60sn cooldown + saatlik pencerede en fazla 5. */
async function checkOtpRate(
  db: D1Database,
  phone: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const nowMs = now();
  const row = await db.prepare(`SELECT window_start, count, last_sent FROM otp_rate WHERE phone = ?`).bind(phone).first();
  if (row) {
    const lastSent = row.last_sent as number;
    const windowStart = row.window_start as number;
    const count = row.count as number;
    if (nowMs - lastSent < OTP_COOLDOWN_MS) {
      return { ok: false, message: "Çok sık kod istediniz. Lütfen bir dakika bekleyip tekrar deneyin." };
    }
    if (nowMs - windowStart < OTP_WINDOW_MS && count >= OTP_MAX_PER_WINDOW) {
      return { ok: false, message: "Saatlik kod isteği sınırına ulaştınız. Lütfen daha sonra tekrar deneyin." };
    }
  }
  await db.prepare(
    `INSERT INTO otp_rate (phone, window_start, count, last_sent) VALUES (?1, ?2, 1, ?2)
     ON CONFLICT(phone) DO UPDATE SET
       count = CASE WHEN ?2 - window_start < ${OTP_WINDOW_MS} THEN count + 1 ELSE 1 END,
       window_start = CASE WHEN ?2 - window_start < ${OTP_WINDOW_MS} THEN window_start ELSE ?2 END,
       last_sent = ?2`,
  ).bind(phone, nowMs).run();
  return { ok: true };
}

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
  // Üye ol → 100 TL reklam kredisi (numara başına 1 kez; idempotent, best-effort)
  await grantSignupBonusOnce(c.env.DB, user.id, user.phone);
  const iat = Math.floor(now() / 1000);
  const exp = iat + SESSION_TTL_S;
  const jti = newId("ses");
  await c.env.DB.prepare(`INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?,?,?,?)`)
    .bind(jti, user.id, now(), exp * 1000).run();
  const token = await signJwt({ sub: user.id, phone: user.phone, jti, iat, exp }, c.env.JWT_SECRET);
  return { token, user, expiresAt: exp * 1000 };
}

/** Davet kodunu yakala — yalnızca YENİ kullanıcı için, kendini davet değilse (best-effort). */
async function captureReferral(env: Env, newUserId: string, ref?: string): Promise<void> {
  if (!ref) return;
  try {
    const referrer = await env.DB.prepare(`SELECT id FROM users WHERE ref_code = ?`).bind(ref.trim()).first<{ id: string }>();
    if (!referrer || referrer.id === newUserId) return;
    await env.DB.prepare(
      `INSERT OR IGNORE INTO referrals (referred_user_id, referrer_user_id, status, created_at) VALUES (?,?, 'pending', ?)`,
    ).bind(newUserId, referrer.id, now()).run();
  } catch {
    // referans yakalanamadıysa girişi bozma
  }
}

/** OTP doğrulandıktan sonra: gerçek kullanıcıyı oluştur/getir, banlıysa reddet, oturum aç. */
async function finishLogin(c: { env: Env }, phone: string, ref?: string) {
  let userRow = await c.env.DB.prepare(`SELECT * FROM users WHERE phone = ?`).bind(phone).first();
  let created = false;
  if (!userRow) {
    created = true;
    const id = newId("usr");
    await c.env.DB.prepare(
      `INSERT INTO users (id, phone, name, created_at, phone_verified) VALUES (?, ?, ?, ?, 1)`,
    ).bind(id, phone, "Satıyo Kullanıcısı", now()).run();
    userRow = await c.env.DB.prepare(`SELECT * FROM users WHERE id = ?`).bind(id).first();
    await captureReferral(c.env, id, ref);
  } else if (!userRow.phone_verified) {
    await c.env.DB.prepare(`UPDATE users SET phone_verified = 1 WHERE id = ?`).bind(userRow.id).run();
  }
  if ((userRow as Record<string, unknown>).banned) fail(403, "banned", "Hesabınız askıya alındı");

  const user = rowToUser(userRow as Record<string, unknown>);
  // Üye ol → 100 TL reklam kredisi (numara başına 1 kez; idempotent, best-effort)
  await grantSignupBonusOnce(c.env.DB, user.id, user.phone);
  const iat = Math.floor(now() / 1000);
  const exp = iat + SESSION_TTL_S;
  const jti = newId("ses");
  await c.env.DB.prepare(`INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`)
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
  // Üye ol → 100 TL reklam kredisi (numara başına 1 kez; idempotent, best-effort)
  await grantSignupBonusOnce(c.env.DB, user.id, user.phone);
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

  // Hız sınırı: numara başına 60sn ara + saatte 5 istek (SMS bombardımanı/maliyet istismarı önlemi).
  const rate = await checkOtpRate(c.env.DB, phone);
  if (!rate.ok) fail(429, "rate_limited", rate.message);

  // Twilio Verify varsa: kodu Twilio üretir/gönderir (kendi tablomuzu kullanmayız).
  if (twilioConfigured(c.env)) {
    const r = await startVerification(c.env, phone);
    if (!r.ok) fail(400, "sms_failed", "Doğrulama kodu gönderilemedi. Numaranı kontrol edip tekrar dene.");
    return c.json({ ok: true as const, delivered: true });
  }

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
  // akış kırılmasın diye ok dön.
  const sent = await sendSms(c.env, phone, `Satiyo dogrulama kodunuz: ${code}. Kimseyle paylasmayin.`);
  // devCode YALNIZ açıkça geliştirme ortamında dönür (ENVIRONMENT tanımsız/yanlış olsa bile sızdırmaz).
  const devCode = c.env.ENVIRONMENT === "development" ? code : undefined;
  return c.json({ ok: true as const, devCode, delivered: sent });
});

/** OTP doğrula → kullanıcı oluştur/getir → JWT oturum dön. */
authRoutes.post("/otp/verify", async (c) => {
  const parsed = verifyOtpSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) badRequest("Geçersiz kod", parsed.error.flatten());
  const { phone, code, ref } = parsed.data!;

  // Denetçi demo hesabı: sabit kodla SMS'siz giriş.
  if (phone === REVIEWER_PHONE && code === REVIEWER_CODE) {
    return c.json(await issueSession(c, REVIEWER_PHONE, "Demo Kullanıcı", "İstanbul"));
  }

  // Twilio Verify ile doğrula (kodu Twilio saklar; kendi tablomuza bakmayız).
  if (twilioConfigured(c.env)) {
    const approved = await checkVerification(c.env, phone, code);
    if (!approved) fail(400, "otp_invalid", "Kod hatalı veya süresi doldu");
    return c.json(await finishLogin(c, phone, ref));
  }

  // Yerel OTP tablosu (Twilio yoksa — dev / NetGSM fallback).
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

  return c.json(await finishLogin(c, phone, ref));
});
