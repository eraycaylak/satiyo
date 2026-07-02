/** Kaydedilen arama ↔ yeni ilan eşleştirme (bildirim üretimi için). */
import { tokenize, expandSynonyms, foldTr } from "@satiyo/shared";

export interface SavedQuery {
  q?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  city?: string;
  condition?: "new" | "used";
}

export interface MatchableListing {
  title: string;
  description: string;
  categoryId: string;
  price: number;
  city: string | null;
  condition: string;
  attributesText?: string;
}

/** Yeni ilan, kaydedilen aramanın filtrelerine uyuyor mu? */
export function listingMatchesQuery(q: SavedQuery, l: MatchableListing): boolean {
  if (q.categoryId && q.categoryId !== l.categoryId) return false;
  if (q.minPrice != null && l.price < q.minPrice) return false;
  if (q.maxPrice != null && l.price > q.maxPrice) return false;
  if (q.city && q.city !== l.city) return false;
  if (q.condition && q.condition !== l.condition) return false;

  if (q.q && q.q.trim()) {
    const haystack = foldTr(`${l.title} ${l.description} ${l.attributesText ?? ""}`);
    const tokens = tokenize(q.q);
    // Genişletilmiş token kümesinden en az biri başlık/gövdede geçmeli (her token için)
    return tokens.every((tok) => {
      const variants = expandSynonyms([tok]);
      return variants.some((v) => haystack.includes(v));
    });
  }
  return true;
}
