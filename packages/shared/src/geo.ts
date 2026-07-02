/** TR şehir yaklaşık koordinatları — haritada yaklaşık konum için (tam adres yok). */
import { foldTr } from "./search";

export const TR_CITY_COORDS: Record<string, [number, number]> = {
  istanbul: [41.0082, 28.9784],
  ankara: [39.9334, 32.8597],
  izmir: [38.4237, 27.1428],
  bursa: [40.1885, 29.061],
  antalya: [36.8969, 30.7133],
  adana: [37.0, 35.3213],
  konya: [37.8714, 32.4846],
  gaziantep: [37.0662, 37.3833],
  kayseri: [38.7312, 35.4787],
  mersin: [36.8121, 34.6415],
  eskisehir: [39.7767, 30.5206],
  diyarbakir: [37.9144, 40.2306],
  samsun: [41.2867, 36.33],
  denizli: [37.7765, 29.0864],
  trabzon: [41.0015, 39.7178],
  yozgat: [39.8181, 34.8147],
};

/** Şehir adından yaklaşık koordinat (bilinmeyen şehir → null). */
export function cityToCoords(city?: string | null): [number, number] | null {
  if (!city) return null;
  return TR_CITY_COORDS[foldTr(city)] ?? null;
}

/** Aynı şehirdeki ilanların üst üste binmemesi için deterministik küçük kaydırma. */
export function jitter(coords: [number, number], seed: string): [number, number] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const dx = ((h % 1000) / 1000 - 0.5) * 0.08;
  const dy = (((h >> 10) % 1000) / 1000 - 0.5) * 0.08;
  return [coords[0] + dy, coords[1] + dx];
}
