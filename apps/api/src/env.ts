import type { ChatRoom } from "./durable/ChatRoom.js";

export interface Env {
  DB: D1Database;
  MEDIA: R2Bucket;
  CHAT: DurableObjectNamespace<ChatRoom>;
  ENVIRONMENT: string;
  PUBLIC_MEDIA_BASE: string;
  JWT_SECRET: string;
  PAYMENT_PROVIDER?: string;
  // SMS OTP sağlayıcısı (NetGSM) — `wrangler secret put` ile gelir; yoksa dev kodu döner.
  NETGSM_USERNAME?: string;
  NETGSM_PASSWORD?: string;
  NETGSM_HEADER?: string; // onaylı gönderici başlığı (msgheader)
  // SMS OTP sağlayıcısı (Twilio Verify) — global, şahıs şirketi/başlık onayı gerektirmez.
  // Varsa NetGSM'in önüne geçer; kodu Twilio üretir/doğrular (kendi otp_codes tablomuz kullanılmaz).
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_VERIFY_SERVICE_SID?: string;
  // AI ilan sihirbazı — Gemini Vision (foto → başlık/kategori/fiyat). `wrangler secret put GEMINI_API_KEY`.
  GEMINI_API_KEY?: string;
}

export interface AuthUser {
  id: string;
  phone: string;
}

export type Variables = {
  user: AuthUser;
};
