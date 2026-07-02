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
}

export interface AuthUser {
  id: string;
  phone: string;
}

export type Variables = {
  user: AuthUser;
};
