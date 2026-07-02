import { CATEGORIES, DEFAULT_SYNONYMS, foldTr, getChildren, type CategoryNode } from "@satiyo/shared";

/** Yaprak kategoriler (alt kategorisi olmayanlar). */
export function leafCategories(): CategoryNode[] {
  return CATEGORIES.filter((c) => getChildren(c.id).length === 0);
}

/** Başlıktan kategori tahmini — ad + synonym eşleşmesi (basit, yeterli). */
export function guessCategory(title: string): string | null {
  const t = foldTr(title);
  if (!t) return null;
  let best: { id: string; score: number } | null = null;
  for (const cat of leafCategories()) {
    const terms = [foldTr(cat.name), ...(DEFAULT_SYNONYMS[foldTr(cat.name)] ?? []).map(foldTr)];
    let score = 0;
    for (const term of terms) {
      for (const word of term.split(" ")) if (word.length > 2 && t.includes(word)) score += word.length;
    }
    // Marka/anahtar ipuçları
    const hints: Record<string, string[]> = {
      telefon: ["iphone", "ayfon", "samsung", "xiaomi", "telefon", "redmi"],
      bilgisayar: ["laptop", "ram", "ekran karti", "macbook", "pc", "dizustu"],
      otomobil: ["km", "dizel", "benzin", "otomatik", "model"],
      "beyaz-esya": ["buzdolabi", "dolap", "camasir", "bulasik", "firin"],
    };
    for (const h of hints[cat.id] ?? []) if (t.includes(foldTr(h))) score += 6;
    if (score > 0 && (!best || score > best.score)) best = { id: cat.id, score };
  }
  return best?.id ?? null;
}
