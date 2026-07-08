import type { Env } from "../env.js";

// Twilio Verify — OTP kodunu Twilio üretir, gönderir ve doğrular.
// Global sağlayıcı olduğu için Türk numaralarına uluslararası hat üzerinden
// teslim eder; yerel operatör kaydı / şahıs şirketi / başlık onayı gerektirmez.
const VERIFY_BASE = "https://verify.twilio.com/v2/Services";
const TIMEOUT_MS = 10_000;

/** Twilio Verify yapılandırılmış mı? */
export function twilioConfigured(env: Env): boolean {
  return Boolean(
    env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_VERIFY_SERVICE_SID,
  );
}

function authHeader(env: Env): string {
  return "Basic " + btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`);
}

interface StartResult {
  ok: boolean;
  error?: string;
}

/** Telefona doğrulama kodu gönder (Channel=sms, Locale=tr). */
export async function startVerification(env: Env, phone: string): Promise<StartResult> {
  try {
    const res = await fetch(`${VERIFY_BASE}/${env.TWILIO_VERIFY_SERVICE_SID}/Verifications`, {
      method: "POST",
      headers: {
        authorization: authHeader(env),
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: phone, Channel: "sms", Locale: "tr" }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const data = (await res.json().catch(() => ({}))) as { status?: string; message?: string };
    if (!res.ok) return { ok: false, error: data.message ?? `twilio_${res.status}` };
    return { ok: data.status === "pending" };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Kullanıcının girdiği kodu doğrula. approved → true. */
export async function checkVerification(env: Env, phone: string, code: string): Promise<boolean> {
  try {
    const res = await fetch(`${VERIFY_BASE}/${env.TWILIO_VERIFY_SERVICE_SID}/VerificationCheck`, {
      method: "POST",
      headers: {
        authorization: authHeader(env),
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: phone, Code: code }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return false; // 404 = süresi doldu / bulunamadı
    const data = (await res.json().catch(() => ({}))) as { status?: string };
    return data.status === "approved";
  } catch {
    return false;
  }
}
