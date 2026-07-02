import type { PriceType } from "@satiyo/shared";

/** Hermes'te Intl.NumberFormat/RelativeTimeFormat güvenilir değil — elle biçimlendir. */
export function formatNumber(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function formatPrice(kurus: number, priceType?: PriceType): string {
  if (priceType === "free") return "Ücretsiz";
  if (priceType === "trade") return "Takas";
  return formatNumber(kurus / 100) + " ₺";
}

export function timeAgo(ts: number): string {
  const past = Date.now() - ts;
  const min = 60_000, hr = 60 * min, day = 24 * hr;
  if (past < min) return "az önce";
  if (past < hr) return `${Math.round(past / min)} dakika önce`;
  if (past < day) return `${Math.round(past / hr)} saat önce`;
  if (past < 30 * day) return `${Math.round(past / day)} gün önce`;
  const d = new Date(ts);
  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
}

export function locationText(city?: string | null, district?: string | null): string {
  return [district, city].filter(Boolean).join(", ") || "Konum yok";
}

export const conditionLabel: Record<string, string> = { new: "Sıfır", used: "İkinci el" };
export const priceTypeLabel: Record<PriceType, string> = {
  fixed: "Sabit fiyat", negotiable: "Pazarlık olur", trade: "Takas", free: "Ücretsiz",
};
