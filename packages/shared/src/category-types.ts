/** Kategori taksonomi tipleri — categories.ts + data/*.ts ortak (döngüsel import'u önler). */

export type AttributeType = "text" | "number" | "select" | "boolean";

export interface AttributeDef {
  key: string;
  label: string;
  type: AttributeType;
  required?: boolean;
  unit?: string;
  options?: string[];
  /** Başka bir attribute'a bağlı seçenekler (ör. model, marka'ya bağlı). */
  dependsOn?: string;
  /** dependsOn değerine göre seçenekler (ör. { "BMW": ["3 Serisi", ...] }). */
  optionsByParent?: Record<string, string[]>;
}

export interface CategoryNode {
  id: string;
  slug: string;
  name: string;
  icon: string; // emoji (mobil kökte CATEGORY_VISUAL renkli ikonu kullanır)
  parentId: string | null;
  attributes?: AttributeDef[];
}

/** Çoğu üründe ortak "durum" özniteliği. */
export const CONDITION: AttributeDef = {
  key: "condition",
  label: "Durum",
  type: "select",
  required: true,
  options: ["Sıfır", "Yeni gibi", "İyi", "Orta", "Yıpranmış"],
};

/** Beden (giyim) — sık kullanılan hazır liste. */
export const CLOTHING_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];
