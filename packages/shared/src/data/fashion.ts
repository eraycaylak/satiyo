import type { CategoryNode } from "../category-types";
import { CONDITION, CLOTHING_SIZES } from "../category-types";

// Moda & Giyim alt ağacı. NOT: moda kök id'si KORUNUR (canlı ilanlar bağlı).
export const fashion: CategoryNode[] = [
  { id: "moda", slug: "moda", name: "Moda & Giyim", icon: "👕", parentId: null },

  {
    id: "kadin-giyim", slug: "kadin-giyim", name: "Kadın Giyim", icon: "👗", parentId: "moda",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Elbise", "Bluz & Gömlek", "Tişört", "Kazak & Hırka", "Pantolon", "Etek", "Ceket & Mont", "Tulum", "Eşofman", "Mayo & Bikini", "İç Giyim", "Diğer"] },
      { key: "size", label: "Beden", type: "select", required: true, options: CLOTHING_SIZES },
      { key: "color", label: "Renk", type: "text" },
      { key: "brand", label: "Marka", type: "text" },
      CONDITION,
    ],
  },

  {
    id: "erkek-giyim", slug: "erkek-giyim", name: "Erkek Giyim", icon: "👔", parentId: "moda",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Gömlek", "Tişört", "Kazak & Sweatshirt", "Pantolon", "Kot Pantolon", "Şort", "Ceket & Mont", "Takım Elbise", "Eşofman", "İç Giyim", "Diğer"] },
      { key: "size", label: "Beden", type: "select", required: true, options: CLOTHING_SIZES },
      { key: "color", label: "Renk", type: "text" },
      { key: "brand", label: "Marka", type: "text" },
      CONDITION,
    ],
  },

  {
    id: "cocuk-giyim", slug: "cocuk-giyim", name: "Çocuk Giyim", icon: "🧒", parentId: "moda",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Body & Zıbın", "Tişört", "Elbise", "Pantolon", "Şort & Etek", "Kazak & Sweatshirt", "Mont & Yağmurluk", "Takım", "Pijama", "Diğer"] },
      { key: "gender", label: "Cinsiyet", type: "select", options: ["Kız", "Erkek", "Unisex"] },
      { key: "age", label: "Yaş / Beden", type: "select", options: ["0-3 Ay", "3-6 Ay", "6-9 Ay", "9-12 Ay", "12-18 Ay", "18-24 Ay", "2-3 Yaş", "4-5 Yaş", "6-7 Yaş", "8-9 Yaş", "10-12 Yaş", "13-14 Yaş"] },
      { key: "color", label: "Renk", type: "text" },
      CONDITION,
    ],
  },

  {
    id: "ayakkabi", slug: "ayakkabi", name: "Ayakkabı", icon: "👟", parentId: "moda",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Spor Ayakkabı", "Sneaker", "Klasik", "Bot & Çizme", "Topuklu", "Babet", "Sandalet", "Terlik", "Loafer", "Diğer"] },
      { key: "gender", label: "Cinsiyet", type: "select", options: ["Kadın", "Erkek", "Çocuk", "Unisex"] },
      { key: "number", label: "Numara", type: "select", required: true, options: ["35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46"] },
      { key: "brand", label: "Marka", type: "select", options: ["Nike", "Adidas", "Puma", "New Balance", "Converse", "Vans", "Skechers", "Reebok", "Asics", "Lumberjack", "Kinetix", "Diğer"] },
      CONDITION,
    ],
  },

  {
    id: "canta", slug: "canta", name: "Çanta", icon: "👜", parentId: "moda",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Omuz Çantası", "El Çantası", "Sırt Çantası", "Cüzdan", "Clutch", "Bel Çantası", "Laptop Çantası", "Valiz", "Diğer"] },
      { key: "gender", label: "Cinsiyet", type: "select", options: ["Kadın", "Erkek", "Unisex"] },
      { key: "color", label: "Renk", type: "text" },
      { key: "brand", label: "Marka", type: "text" },
      CONDITION,
    ],
  },

  {
    id: "aksesuar", slug: "aksesuar", name: "Aksesuar", icon: "🧣", parentId: "moda",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Kemer", "Şapka & Bere", "Atkı & Şal", "Eldiven", "Kravat & Papyon", "Saç Aksesuarı", "Fular", "Çorap", "Diğer"] },
      { key: "color", label: "Renk", type: "text" },
      { key: "brand", label: "Marka", type: "text" },
      CONDITION,
    ],
  },

  {
    id: "saat", slug: "saat", name: "Saat", icon: "⌚", parentId: "moda",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Kol Saati", "Cep Saati", "Duvar Saati", "Diğer"] },
      { key: "gender", label: "Cinsiyet", type: "select", options: ["Kadın", "Erkek", "Unisex"] },
      { key: "brand", label: "Marka", type: "select", options: ["Casio", "Rolex", "Omega", "Seiko", "Citizen", "Tissot", "Fossil", "Guess", "Daniel Wellington", "Swatch", "Diğer"] },
      { key: "mechanism", label: "Mekanizma", type: "select", options: ["Kuvars", "Otomatik", "Mekanik", "Akıllı"] },
      CONDITION,
    ],
  },

  {
    id: "taki-mucevher", slug: "taki-mucevher", name: "Takı & Mücevher", icon: "💍", parentId: "moda",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Yüzük", "Kolye", "Küpe", "Bilezik & Bileklik", "Broş", "Set", "Diğer"] },
      { key: "material", label: "Materyal", type: "select", options: ["Altın", "Gümüş", "Pırlanta", "Çelik", "Bijuteri", "İnci", "Diğer"] },
      { key: "gender", label: "Cinsiyet", type: "select", options: ["Kadın", "Erkek", "Unisex"] },
      CONDITION,
    ],
  },

  {
    id: "gozluk", slug: "gozluk", name: "Gözlük", icon: "🕶️", parentId: "moda",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Güneş Gözlüğü", "Optik Çerçeve", "Okuma Gözlüğü", "Diğer"] },
      { key: "gender", label: "Cinsiyet", type: "select", options: ["Kadın", "Erkek", "Unisex"] },
      { key: "brand", label: "Marka", type: "select", options: ["Ray-Ban", "Oakley", "Gucci", "Prada", "Police", "Vogue", "Persol", "Diğer"] },
      CONDITION,
    ],
  },

  {
    id: "kozmetik-bakim", slug: "kozmetik-bakim", name: "Kozmetik & Kişisel Bakım", icon: "💄", parentId: "moda",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Makyaj", "Parfüm", "Cilt Bakımı", "Saç Bakımı", "Saç Şekillendirici", "Tıraş & Epilasyon", "Manikür & Pedikür", "Diğer"] },
      { key: "brand", label: "Marka", type: "text" },
      CONDITION,
    ],
  },
];
