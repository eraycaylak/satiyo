import { newId, now } from "./id.js";

/**
 * İlgili kullanıcıya bildirim satırı yazar. BEST-EFFORT: bir hata olursa yutulur,
 * asla tetikleyen ana işlemi (mesaj/teklif/favori) bozmaz.
 */
export async function notify(
  db: D1Database,
  userId: string,
  type: "message" | "offer" | "favorite" | "saved_search" | "system",
  title: string,
  body: string | null,
  data?: Record<string, unknown>,
): Promise<void> {
  try {
    await db
      .prepare(`INSERT INTO notifications (id, user_id, type, title, body, data, created_at) VALUES (?,?,?,?,?,?,?)`)
      .bind(newId("ntf"), userId, type, title, body, data ? JSON.stringify(data) : null, now())
      .run();
  } catch {
    // Bildirim yazımı başarısızsa sessizce geç — ana akış etkilenmemeli.
  }
}
