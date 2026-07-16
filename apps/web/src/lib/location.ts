import { TR_CITY_COORDS, TR_PROVINCES, foldTr, haversineKm } from "@satiyo/shared";

// İlk açılış kapsam tercihi. "local" = yalnız bulunduğu il, "all" = tüm Türkiye.
// Web'de localStorage ile kalıcı; URL'deki `city` param'ı asıl kaynak, bu yalnız
// "daha önce soruldu mu" + son seçimi hatırlamak için.
export type LocScope = "local" | "all";
export interface LocPref { scope: LocScope; city: string }

const KEY = "satiyo_loc_pref";

export function getLocationPref(): LocPref | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LocPref) : null;
  } catch {
    return null;
  }
}

export function setLocationPref(pref: LocPref): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(pref));
  } catch {
    // sessiz — kota/gizli mod
  }
}

/** Koordinattan en yakın TR ili (81 il merkezine haversine mesafesi). */
export function nearestProvince(lat: number, lng: number): string | null {
  let best: string | null = null;
  let bestKm = Infinity;
  for (const [foldedKey, coords] of Object.entries(TR_CITY_COORDS)) {
    const km = haversineKm([lat, lng], coords);
    if (km < bestKm) {
      bestKm = km;
      best = foldedKey;
    }
  }
  if (!best) return null;
  // Katlanmış anahtarı düzgün il adına eşle ("istanbul" → "İstanbul").
  return TR_PROVINCES.find((p) => foldTr(p) === best) ?? null;
}

/** Tarayıcı konumunu ister + en yakın ili döndürür. İzin yok/hata → null. */
export function detectProvince(): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(nearestProvince(pos.coords.latitude, pos.coords.longitude)),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  });
}
