/**
 * Filtrele ekranı ↔ Keşfet (ExploreScreen) arasında filtre taşıma köprüsü.
 *
 * expo-router modal'ından geri değer döndürmenin yerleşik bir yolu yok ve
 * projede global bir state store yok. `attrs` gibi nesne alanlar URL param'ına
 * temiz sığmadığından, iki yönlü küçük bir modül-seviyesi ref tutuyoruz:
 *   • Keşfet → filtrele:  setInitialFilters (aç) / takeInitialFilters (mount)
 *   • filtrele → Keşfet:  setResultFilters (Uygula) / takeResultFilters (focus)
 * Değerler "bir kez tüketilir" (take → null'la), böylece bayat okuma olmaz.
 */
import type { SortOption } from "@satiyo/shared";

/** Filtrele ekranının düzenlediği taslak — SearchFilters'ın kullanıcı-görünür alt kümesi. */
export interface FilterDraft {
  q: string;
  categoryId?: string;
  city: string; // "" = Tüm Türkiye
  boostedOnly: boolean;
  minPrice?: number;
  maxPrice?: number;
  condition?: "new" | "used";
  sellerType?: "individual" | "store";
  attrs: Record<string, string>;
  sort: SortOption;
}

/** Boş taslak — her çağrıda TAZE nesne (paylaşılan referans mutasyonunu önler). */
export function emptyDraft(): FilterDraft {
  return { q: "", city: "", boostedOnly: false, attrs: {}, sort: "relevance" };
}

let initial: FilterDraft | null = null;
let result: FilterDraft | null = null;

/** Keşfet, filtrele'yi açmadan hemen önce mevcut filtreleri buraya yazar. */
export function setInitialFilters(draft: FilterDraft): void {
  initial = draft;
}

/** filtrele mount olunca başlangıç taslağını alır (bir kez tüketilir). */
export function takeInitialFilters(): FilterDraft | null {
  const draft = initial;
  initial = null;
  return draft;
}

/** filtrele "Uygula" → sonucu kuyruğa koyar; ardından router.back(). */
export function setResultFilters(draft: FilterDraft): void {
  result = draft;
}

/** Keşfet yeniden odaklanınca uygulanan filtreleri alır (bir kez tüketilir). */
export function takeResultFilters(): FilterDraft | null {
  const draft = result;
  result = null;
  return draft;
}
