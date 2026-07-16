import { newId, now } from "./id.js";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

type NotifyType = "message" | "offer" | "favorite" | "saved_search" | "system";

/**
 * İlgili kullanıcıya bildirim yazar: (1) uygulama-içi feed satırı (notifications tablosu),
 * (2) cihaz push bildirimi (Expo Push — kayıtlı tüm push_tokens'a).
 * BEST-EFFORT: her iki adım da hata yutar; asla tetikleyen ana işlemi (mesaj/teklif/favori) bozmaz.
 */
export async function notify(
  db: D1Database,
  userId: string,
  type: NotifyType,
  title: string,
  body: string | null,
  data?: Record<string, unknown>,
): Promise<void> {
  // 1) Uygulama-içi bildirim satırı
  try {
    await db
      .prepare(`INSERT INTO notifications (id, user_id, type, title, body, data, created_at) VALUES (?,?,?,?,?,?,?)`)
      .bind(newId("ntf"), userId, type, title, body, data ? JSON.stringify(data) : null, now())
      .run();
  } catch {
    // Bildirim yazımı başarısızsa sessizce geç — ana akış etkilenmemeli.
  }

  // 2) Cihaz push bildirimi (best-effort, ayrı try/catch)
  try {
    await sendExpoPush(db, userId, title, body, data);
  } catch {
    // Push gönderimi başarısızsa sessizce geç.
  }
}

/** Kullanıcının kayıtlı Expo push token'larına bildirim gönderir; ölü token'ları temizler. */
async function sendExpoPush(
  db: D1Database,
  userId: string,
  title: string,
  body: string | null,
  data?: Record<string, unknown>,
): Promise<void> {
  const rows = await db
    .prepare(`SELECT token FROM push_tokens WHERE user_id = ?`)
    .bind(userId)
    .all();
  const tokens = (rows.results as { token: string }[])
    .map((r) => r.token)
    .filter((t) => typeof t === "string" && t.startsWith("Expo"));
  if (tokens.length === 0) return;

  // Uygulama ikonu rozeti = kullanıcının okunmamış bildirim sayısı (best-effort).
  let badge: number | undefined;
  try {
    const cnt = await db
      .prepare(`SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL`)
      .bind(userId)
      .first<{ n: number }>();
    if (cnt && typeof cnt.n === "number") badge = cnt.n;
  } catch {
    // rozet sayısı alınamadıysa push'u yine gönder (badge'siz).
  }

  const messages = tokens.map((to) => ({
    to,
    title,
    body: body ?? undefined,
    sound: "default" as const,
    priority: "high" as const,
    channelId: "default",
    badge,
    data: data ?? {},
  }));

  const res = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(messages),
  });
  if (!res.ok) return;

  const json = (await res.json().catch(() => null)) as
    | { data?: { status?: string; details?: { error?: string } }[] }
    | null;
  const tickets = json?.data;
  if (!Array.isArray(tickets)) return;

  // Expo "DeviceNotRegistered" dönen token'lar geçersizdir → sil (hijyen).
  const dead: string[] = [];
  tickets.forEach((t, i) => {
    if (t?.status === "error" && t.details?.error === "DeviceNotRegistered" && tokens[i]) {
      dead.push(tokens[i]!);
    }
  });
  for (const tok of dead) {
    try {
      await db.prepare(`DELETE FROM push_tokens WHERE token = ?`).bind(tok).run();
    } catch {
      // yut
    }
  }
}
