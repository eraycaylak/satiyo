/**
 * Kategori ağacı ve kategoriye-özel öznitelik şemaları.
 * İlan ver akışındaki dinamik alanlar ve arama filtreleri bunu kullanır.
 * Şema admin panelinden DB'ye taşınana kadar tek doğruluk kaynağı burası.
 */

export type AttributeType = "text" | "number" | "select" | "boolean";

export interface AttributeDef {
  key: string;
  label: string;
  type: AttributeType;
  required?: boolean;
  unit?: string;
  options?: string[];
}

export interface CategoryNode {
  id: string;
  slug: string;
  name: string;
  icon: string;
  parentId: string | null;
  attributes?: AttributeDef[];
}

const CONDITION: AttributeDef = {
  key: "condition",
  label: "Durum",
  type: "select",
  required: true,
  options: ["Sıfır", "Yeni gibi", "İyi", "Orta", "Yıpranmış"],
};

export const CATEGORIES: CategoryNode[] = [
  // Kök kategoriler
  { id: "elektronik", slug: "elektronik", name: "Elektronik", icon: "📱", parentId: null },
  { id: "ev-yasam", slug: "ev-yasam", name: "Ev & Yaşam", icon: "🛋️", parentId: null },
  { id: "moda", slug: "moda", name: "Moda & Giyim", icon: "👕", parentId: null },
  { id: "vasita", slug: "vasita", name: "Vasıta", icon: "🚗", parentId: null },
  { id: "hobi", slug: "hobi", name: "Hobi & Oyun", icon: "🎮", parentId: null },
  { id: "bebek", slug: "bebek", name: "Anne & Bebek", icon: "🍼", parentId: null },

  // Elektronik alt
  {
    id: "telefon",
    slug: "telefon",
    name: "Cep Telefonu",
    icon: "📱",
    parentId: "elektronik",
    attributes: [
      { key: "brand", label: "Marka", type: "select", required: true, options: ["Apple", "Samsung", "Xiaomi", "Huawei", "Oppo", "Diğer"] },
      { key: "model", label: "Model", type: "text", required: true },
      { key: "storage", label: "Hafıza", type: "select", options: ["64 GB", "128 GB", "256 GB", "512 GB", "1 TB"] },
      CONDITION,
    ],
  },
  {
    id: "bilgisayar",
    slug: "bilgisayar",
    name: "Bilgisayar",
    icon: "💻",
    parentId: "elektronik",
    attributes: [
      { key: "type", label: "Tür", type: "select", options: ["Dizüstü", "Masaüstü", "Tablet", "Bileşen"] },
      { key: "brand", label: "Marka", type: "text" },
      { key: "ram", label: "RAM", type: "select", options: ["4 GB", "8 GB", "16 GB", "32 GB", "64 GB"] },
      CONDITION,
    ],
  },

  // Vasıta alt
  {
    id: "otomobil",
    slug: "otomobil",
    name: "Otomobil",
    icon: "🚙",
    parentId: "vasita",
    attributes: [
      { key: "brand", label: "Marka", type: "text", required: true },
      { key: "model", label: "Model", type: "text", required: true },
      { key: "year", label: "Yıl", type: "number", required: true },
      { key: "km", label: "Kilometre", type: "number", unit: "km" },
      { key: "fuel", label: "Yakıt", type: "select", options: ["Benzin", "Dizel", "LPG", "Hibrit", "Elektrik"] },
      { key: "gear", label: "Vites", type: "select", options: ["Manuel", "Otomatik"] },
    ],
  },

  // Ev & Yaşam alt
  {
    id: "beyaz-esya",
    slug: "beyaz-esya",
    name: "Beyaz Eşya",
    icon: "🧊",
    parentId: "ev-yasam",
    attributes: [
      { key: "type", label: "Tür", type: "select", options: ["Buzdolabı", "Çamaşır Makinesi", "Bulaşık Makinesi", "Fırın", "Diğer"] },
      { key: "brand", label: "Marka", type: "text" },
      CONDITION,
    ],
  },
  {
    id: "mobilya",
    slug: "mobilya",
    name: "Mobilya",
    icon: "🛏️",
    parentId: "ev-yasam",
    attributes: [
      { key: "type", label: "Tür", type: "select", options: ["Koltuk", "Yatak", "Masa", "Dolap", "Sandalye", "Diğer"] },
      CONDITION,
    ],
  },
];

export function getCategory(id: string): CategoryNode | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

export function getChildren(parentId: string | null): CategoryNode[] {
  return CATEGORIES.filter((c) => c.parentId === parentId);
}

export function getAttributeSchema(categoryId: string): AttributeDef[] {
  return getCategory(categoryId)?.attributes ?? [];
}
