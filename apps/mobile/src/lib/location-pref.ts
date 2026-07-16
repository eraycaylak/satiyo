import AsyncStorage from "@react-native-async-storage/async-storage";

// İlk açılışta sorulan "kapsam" tercihi. "local" = yalnız bulunduğu il,
// "all" = tüm Türkiye. Küçük bir in-memory önbellek + AsyncStorage kalıcılığı +
// abonelik ile home ekranı, gate modal'ı seçimi yapar yapmaz güncellenir.
export type LocScope = "local" | "all";
export interface LocPref { scope: LocScope; city: string }

const KEY = "satiyo_loc_pref";

let cache: LocPref | null = null;
let loaded = false;
const listeners = new Set<() => void>();

/** Diskteki tercihi bir kez okur (idempotent). Yoksa null. */
export async function loadLocationPref(): Promise<LocPref | null> {
  if (loaded) return cache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as LocPref) : null;
  } catch {
    cache = null;
  }
  loaded = true;
  return cache;
}

/** Önbellekteki tercihi senkron döndürür (loadLocationPref sonrası anlamlı). */
export function getLocationPref(): LocPref | null {
  return cache;
}

/** Tercihi kaydeder + tüm abonelere haber verir. */
export async function setLocationPref(pref: LocPref): Promise<void> {
  cache = pref;
  loaded = true;
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(pref));
  } catch {
    // sessiz — kalıcılık başarısız olsa bile oturum içi tercih geçerli
  }
  listeners.forEach((fn) => fn());
}

/** Tercih değişince tetiklenir. Aboneliği bırakmak için dönen fonksiyonu çağır. */
export function subscribeLocationPref(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
