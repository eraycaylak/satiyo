import type { Env } from "../env.js";
import { getSetting } from "./settings.js";

/**
 * Zamanlanmış pazarlama/ikna bildirimleri (Cloudflare Cron ile günün belirli saatlerinde).
 * Sunucu tarafı — tüm kayıtlı Expo push token'larına gider, uygulama güncellemesi/OTA GEREKMEZ.
 * Admin panelden `marketing_push_enabled = "false"` yazılınca durur (varsayılan: açık).
 */

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

type Slot = "morning" | "noon" | "evening" | "night";
interface Msg { title: string; body: string; }

// Slogan/ikna havuzu — her slot için birkaç varyant, günlük deterministik rotasyon.
const POOL: Record<Slot, Msg[]> = {
  morning: [
    { title: "☀️ Günaydın!", body: "Evinde para var. Kullanmadığın bir şeyi bugün sat, cebini doldur." },
    { title: "Yeni gün, yeni fırsat ☕", body: "Aradığın ikinci el Satıyo'da — hem de yarı fiyatına." },
    { title: "Sabah sabah kazan 💸", body: "Dolapta duran eşyalar paraya dönüşsün. 2 dakikada ilan ver." },
    { title: "Bugün ne satıyoruz? 📦", body: "Fotoğrafını çek, ilanını ver, alıcı ayağına gelsin." },
  ],
  noon: [
    { title: "🛍️ Öğle molası fırsatı", body: "Yakınındaki en yeni ilanlara göz at, kaçırma." },
    { title: "Canın bir şey mi çekti? 👀", body: "Aradığın ürün komşunda olabilir — Satıyo'da ara." },
    { title: "Öğlen keşfi ✨", body: "Bugün eklenen ikinci el hazineleri seni bekliyor." },
    { title: "Ara, bul, anlaş 🤝", body: "Güvenle mesajlaş, yarı fiyatına al." },
  ],
  evening: [
    { title: "🔥 Akşam vitrini açıldı", body: "En taze ilanlar şimdi Satıyo'da — ilk göz atan sen ol." },
    { title: "İşten çıktın, bir bak 🌆", body: "Belki aradığın fırsat tam şu an eklendi." },
    { title: "Akşama özel 💥", body: "Kullanmadıklarını sat, hafta sonuna harçlık çıkar." },
    { title: "Bu akşam bir şey sat 🛒", body: "2 dakika, 3 fotoğraf, ilanın hazır." },
  ],
  night: [
    { title: "🌙 Uyumadan önce", body: "Kullanmadığın eşyalar Satıyo'da paraya dönüşsün." },
    { title: "Günü kârla kapat 💤", body: "Bir ilan ver, yarın alıcın hazır olsun." },
    { title: "Gece keşfi 🌌", body: "Yatmadan yeni ilanlara bir göz at, fırsatı kaçırma." },
    { title: "Yarına fırsatla başla ⭐", body: "Favorine ekle, sabaha kaçırma." },
  ],
};

/** UTC cron ifadesini slot'a eşler (TR = UTC+3). Bilinmeyen cron → null (gönderme yok). */
export function cronToSlot(cron: string): Slot | null {
  switch (cron.trim()) {
    case "0 7 * * *": return "morning";  // 10:00 TR
    case "0 10 * * *": return "noon";    // 13:00 TR
    case "0 16 * * *": return "evening"; // 19:00 TR
    case "30 18 * * *": return "night";  // 21:30 TR
    default: return null;
  }
}

/** O günkü (deterministik) mesajı seçer — aynı slot her gün farklı varyant. */
function pickMessage(slot: Slot, scheduledTime: number): Msg {
  const arr = POOL[slot];
  const dayIndex = Math.floor(scheduledTime / 86_400_000); // epoch-gün
  return arr[dayIndex % arr.length]!;
}

export const MARKETING_SLOTS: Slot[] = ["morning", "noon", "evening", "night"];

/** Cron tetiğinde çağrılır: cron→slot eşler, kapatma anahtarını kontrol eder, gönderir. */
export async function runScheduledMarketingPush(env: Env, cron: string, scheduledTime: number): Promise<void> {
  const slot = cronToSlot(cron);
  if (!slot) return;
  // Kapatma anahtarı — admin panelden "false" yazınca durur (yoksa açık kabul edilir).
  const enabled = (await getSetting(env.DB, "marketing_push_enabled")) !== "false";
  if (!enabled) return;
  await sendMarketingSlot(env, slot, scheduledTime);
}

/** Belirli bir slot'un o günkü mesajını tüm token'lara gönderir (cron + admin-test ortak). */
export async function sendMarketingSlot(env: Env, slot: Slot, scheduledTime: number): Promise<{ sent: number; tokens: number; cleaned: number }> {
  const { title, body } = pickMessage(slot, scheduledTime);
  const data = { kind: "marketing", slot };

  const rows = await env.DB.prepare(`SELECT token FROM push_tokens`).all();
  const tokens = (rows.results as { token: string }[])
    .map((r) => r.token)
    .filter((t) => typeof t === "string" && t.startsWith("Expo"));
  if (tokens.length === 0) return { sent: 0, tokens: 0, cleaned: 0 };

  let sent = 0;
  const dead: string[] = [];
  for (let i = 0; i < tokens.length; i += 100) {
    const chunk = tokens.slice(i, i + 100);
    const messages = chunk.map((to) => ({
      to, title, body, sound: "default" as const, priority: "high" as const, channelId: "default", data,
    }));
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(messages),
      });
      const json = (await res.json().catch(() => null)) as
        | { data?: { status?: string; details?: { error?: string } }[] }
        | null;
      (json?.data ?? []).forEach((tk, j) => {
        if (tk?.status === "ok") sent++;
        else if (tk?.details?.error === "DeviceNotRegistered" && chunk[j]) dead.push(chunk[j]!);
      });
    } catch {
      // grup başarısız → devam
    }
  }
  for (const tok of dead) {
    try { await env.DB.prepare(`DELETE FROM push_tokens WHERE token = ?`).bind(tok).run(); } catch { /* yut */ }
  }
  return { sent, tokens: tokens.length, cleaned: dead.length };
}
