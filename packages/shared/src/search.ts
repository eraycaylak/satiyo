/**
 * Satıyo arama çekirdeği — Türkçe normalizasyon + synonym genişletme + FTS sorgu üretimi.
 *
 * Ürünün kalbi: "ram" yazınca ekran kartı çıkmamalı; "ayfon" → iPhone bulmalı.
 * Bu modül backend (D1 FTS5) ve istemcilerde ortak kullanılır. Saf fonksiyon —
 * platform bağımsız, böylece test edilebilir ve ileride Meilisearch'e taşınabilir.
 */

/** Türkçe küçük harfe çevirme (İ→i, I→ı doğru çalışsın). */
export function trLower(input: string): string {
  return input
    .replace(/İ/g, "i")
    .replace(/I/g, "ı")
    .toLocaleLowerCase("tr-TR");
}

/**
 * Aramada eşleştirme için aksanları ASCII'ye katlar (fold).
 * "şarj" ve "sarj", "ağ" ve "ag" aynı sonuca gitsin diye. İndeksleme ve sorgu
 * tarafında AYNI fonksiyon kullanılmalı.
 */
export function foldTr(input: string): string {
  return trLower(input)
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, ""); // kalan kombine aksanlar
}

/** Metni arama token'larına ayır (noktalama temizlenir, boşluk daraltılır). */
export function tokenize(input: string): string[] {
  return foldTr(input)
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Eş anlamlı sözlüğü — yönetilebilir, genişletilebilir.
 * Anahtar ve değerler fold edilmiş (ASCII) biçimde tutulur.
 * Çift yönlü kabul edilir: "telefon" arandığında "cep" eşleşir, tersi de.
 */
export const DEFAULT_SYNONYMS: Record<string, string[]> = {
  telefon: ["cep", "ceptelefonu", "smartphone", "akilli telefon"],
  iphone: ["ayfon", "apple telefon"],
  bilgisayar: ["pc", "kompüter", "komputer", "laptop", "dizustu", "notebook"],
  ram: ["bellek", "hafiza ram"],
  "ekran karti": ["gpu", "grafik karti", "vga"],
  buzdolabi: ["dolap", "soguk hava dolabi"],
  televizyon: ["tv", "tivi"],
  bisiklet: ["bicycle", "velespit"],
  araba: ["otomobil", "araç", "vasita", "araç"],
  koltuk: ["kanepe", "berjer"],
  "camasir makinesi": ["camasir", "beyaz esya"],
  oyun: ["konsol", "playstation", "ps", "xbox"],
};

/** Verilen token kümesini eş anlamlılarıyla genişletir (geri yönlü dahil). */
export function expandSynonyms(
  tokens: string[],
  dict: Record<string, string[]> = DEFAULT_SYNONYMS,
): string[] {
  const out = new Set(tokens);
  const joined = tokens.join(" ");
  for (const [key, vals] of Object.entries(dict)) {
    const foldedKey = foldTr(key);
    const foldedVals = vals.map(foldTr);
    const all = [foldedKey, ...foldedVals];
    // Sorguda anahtarlardan/değerlerden biri geçiyorsa tüm grubu ekle
    if (all.some((term) => joined.includes(term))) {
      for (const term of all) for (const t of term.split(" ")) out.add(t);
    }
  }
  return [...out].filter(Boolean);
}

/**
 * SQLite FTS5 MATCH sorgusu üretir.
 * - Her token prefix araması olur ("sams*" → samsung), typo'ya kısmi tolerans.
 * - Eş anlamlı genişletme OR ile eklenir.
 * - FTS özel karakterleri ("/-,.) zaten tokenize'da temizlenir.
 *
 * Örnek: "ayfon 13" → ( ayfon* OR iphone* OR apple* ) ( 13* )  (AND mantığı)
 */
export function buildFtsQuery(
  query: string,
  dict: Record<string, string[]> = DEFAULT_SYNONYMS,
): string {
  const tokens = tokenize(query);
  if (tokens.length === 0) return "";

  const groups = tokens.map((token) => {
    const variants = new Set<string>([token]);
    const expanded = expandSynonyms([token], dict);
    for (const e of expanded) variants.add(e);
    const ors = [...variants]
      .filter(Boolean)
      .map((v) => `${v}*`)
      .join(" OR ");
    return `(${ors})`;
  });

  // Token'lar arası açık AND. (Parantezli grupları boşlukla ayırmak FTS5'te
  // sözdizimi hatası verir; "AND" ile birleştirmek güvenli.)
  return groups.join(" AND ");
}

export type SortOption =
  | "relevance"
  | "newest"
  | "price_asc"
  | "price_desc"
  | "nearest";

export interface SearchFilters {
  q?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  city?: string;
  district?: string;
  condition?: "new" | "used";
  sellerType?: "individual" | "store";
  priceTypes?: string[];
  withImageOnly?: boolean;
  /** Yalnızca öne çıkan (boost'lu) ilanlar. */
  boostedOnly?: boolean;
  /** Kategori özniteliği eşitlik filtreleri (ör. { marka: "BMW", yakit: "Dizel" }). */
  attrs?: Record<string, string>;
  sort?: SortOption;
  page?: number;
  pageSize?: number;
  lat?: number;
  lng?: number;
  /**
   * Anasayfa "taze karışım" tohumu. Yalnız sorgusuz relevance akışında kullanılır:
   * her açılışta yeni bir tohum → aynı liste sabit sırayla değil, karışık gelir
   * (yeni ilanlar üstte kalır). Sayfalar arası tutarlılık için aynı tohum kullanılmalı.
   */
  seed?: number;
}
