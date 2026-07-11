import type { Env } from "../env.js";
import { now } from "./id.js";

/** Runtime ayar oku (settings tablosu). Yoksa null. */
export async function getSetting(db: D1Database, key: string): Promise<string | null> {
  const r = await db.prepare(`SELECT value FROM settings WHERE key = ?`).bind(key).first();
  return (r?.value as string) ?? null;
}

/** Runtime ayar yaz (upsert). */
export async function setSetting(db: D1Database, key: string, value: string): Promise<void> {
  const ts = now();
  await db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?`,
  ).bind(key, value, ts, value, ts).run();
}

/**
 * Gemini anahtarı: ÖNCE panel (settings tablosu), sonra Cloudflare secret (env).
 * Panelden değiştirilirse deploy/store güncellemesi gerekmez.
 */
export async function getGeminiKey(env: Env, db: D1Database): Promise<string | null> {
  return (await getSetting(db, "gemini_api_key")) ?? env.GEMINI_API_KEY ?? null;
}
