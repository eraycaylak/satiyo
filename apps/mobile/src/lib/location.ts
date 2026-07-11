import * as Location from "expo-location";
import { foldTr, TR_PROVINCES } from "@satiyo/shared";

export interface Coords { lat: number; lng: number }

/** Konum izni ister + mevcut koordinatı döndürür. İzin yoksa/hata olursa null. */
export async function getCurrentCoords(): Promise<Coords | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}

/** Koordinattan Türkiye ili (reverse geocode → 81 il listesine eşle). */
export async function coordsToProvince(c: Coords): Promise<string | null> {
  try {
    const res = await Location.reverseGeocodeAsync({ latitude: c.lat, longitude: c.lng });
    const first = res[0];
    if (!first) return null;
    const candidates = [first.region, first.subregion, first.city].filter(Boolean) as string[];
    for (const name of candidates) {
      const match = TR_PROVINCES.find((p) => foldTr(p) === foldTr(name) || foldTr(name).includes(foldTr(p)));
      if (match) return match;
    }
    return null;
  } catch {
    return null;
  }
}

/** İlçe/semt tahmini (reverse geocode). */
export async function coordsToDistrict(c: Coords): Promise<string | null> {
  try {
    const res = await Location.reverseGeocodeAsync({ latitude: c.lat, longitude: c.lng });
    return res[0]?.district ?? res[0]?.subregion ?? null;
  } catch {
    return null;
  }
}

/** İzin ister + koordinat + il + ilçeyi birlikte döndürür. */
export async function detectLocation(): Promise<{ coords: Coords; province: string | null; district: string | null } | null> {
  const coords = await getCurrentCoords();
  if (!coords) return null;
  const [province, district] = await Promise.all([coordsToProvince(coords), coordsToDistrict(coords)]);
  return { coords, province, district };
}
