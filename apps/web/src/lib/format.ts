import type { PriceType } from "@satiyo/shared";

/** Kuruş → "1.850 ₺" */
export function formatPrice(kurus: number, priceType?: PriceType): string {
  if (priceType === "free") return "Ücretsiz";
  if (priceType === "trade") return "Takas";
  const tl = Math.round(kurus / 100);
  return new Intl.NumberFormat("tr-TR").format(tl) + " ₺";
}

const rtf = new Intl.RelativeTimeFormat("tr-TR", { numeric: "auto" });
export function timeAgo(ts: number): string {
  const diff = ts - Date.now();
  const min = 60_000, hr = 60 * min, day = 24 * hr;
  const abs = Math.abs(diff);
  if (abs < hr) return rtf.format(Math.round(diff / min), "minute");
  if (abs < day) return rtf.format(Math.round(diff / hr), "hour");
  if (abs < 30 * day) return rtf.format(Math.round(diff / day), "day");
  return new Date(ts).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
}

export function locationText(city?: string | null, district?: string | null): string {
  return [district, city].filter(Boolean).join(", ") || "Konum belirtilmemiş";
}

export const conditionLabel: Record<string, string> = { new: "Sıfır", used: "İkinci el" };
export const priceTypeLabel: Record<PriceType, string> = {
  fixed: "Sabit fiyat", negotiable: "Pazarlık olur", trade: "Takas", free: "Ücretsiz",
};
