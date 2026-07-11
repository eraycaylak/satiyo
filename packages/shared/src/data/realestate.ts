import type { CategoryNode } from "../category-types";

// Emlak alt ağacı. NOT: emlakta "durum" (CONDITION) özniteliği anlamsız olduğu için kullanılmaz.
export const realestate: CategoryNode[] = [
  { id: "emlak", slug: "emlak", name: "Emlak", icon: "🏠", parentId: null },

  {
    id: "konut-satilik", slug: "konut-satilik", name: "Satılık Konut", icon: "🏡", parentId: "emlak",
    attributes: [
      { key: "tip", label: "Konut Tipi", type: "select", required: true, options: ["Daire", "Müstakil Ev", "Villa", "Rezidans", "Yazlık", "Dubleks"] },
      { key: "oda", label: "Oda Sayısı", type: "select", options: ["1+0", "1+1", "2+1", "3+1", "4+1", "5+1 ve üzeri"] },
      { key: "m2", label: "Metrekare (Brüt)", type: "number", unit: "m²", required: true },
      { key: "binaYasi", label: "Bina Yaşı", type: "select", options: ["0", "1-5", "6-10", "11-20", "21+"] },
      { key: "kat", label: "Bulunduğu Kat", type: "number" },
      { key: "isitma", label: "Isıtma", type: "select", options: ["Doğalgaz", "Kombi", "Merkezi", "Klima", "Soba", "Yok"] },
      { key: "esyali", label: "Eşyalı", type: "boolean" },
    ],
  },

  {
    id: "konut-kiralik", slug: "konut-kiralik", name: "Kiralık Konut", icon: "🔑", parentId: "emlak",
    attributes: [
      { key: "tip", label: "Konut Tipi", type: "select", required: true, options: ["Daire", "Müstakil Ev", "Villa", "Rezidans", "Yazlık", "Dubleks"] },
      { key: "oda", label: "Oda Sayısı", type: "select", options: ["1+0", "1+1", "2+1", "3+1", "4+1", "5+1 ve üzeri"] },
      { key: "m2", label: "Metrekare (Brüt)", type: "number", unit: "m²", required: true },
      { key: "binaYasi", label: "Bina Yaşı", type: "select", options: ["0", "1-5", "6-10", "11-20", "21+"] },
      { key: "kat", label: "Bulunduğu Kat", type: "number" },
      { key: "isitma", label: "Isıtma", type: "select", options: ["Doğalgaz", "Kombi", "Merkezi", "Klima", "Soba", "Yok"] },
      { key: "esyali", label: "Eşyalı", type: "boolean" },
    ],
  },

  {
    id: "isyeri-satilik", slug: "isyeri-satilik", name: "Satılık İşyeri", icon: "🏢", parentId: "emlak",
    attributes: [
      { key: "tip", label: "İşyeri Tipi", type: "select", required: true, options: ["Dükkan", "Ofis", "Büro", "Depo", "Fabrika", "Atölye", "Plaza Katı", "Diğer"] },
      { key: "m2", label: "Metrekare", type: "number", unit: "m²", required: true },
      { key: "kat", label: "Bulunduğu Kat", type: "number" },
      { key: "isitma", label: "Isıtma", type: "select", options: ["Doğalgaz", "Kombi", "Merkezi", "Klima", "Yok"] },
    ],
  },

  {
    id: "isyeri-kiralik", slug: "isyeri-kiralik", name: "Kiralık İşyeri", icon: "🏬", parentId: "emlak",
    attributes: [
      { key: "tip", label: "İşyeri Tipi", type: "select", required: true, options: ["Dükkan", "Ofis", "Büro", "Depo", "Fabrika", "Atölye", "Plaza Katı", "Diğer"] },
      { key: "m2", label: "Metrekare", type: "number", unit: "m²", required: true },
      { key: "kat", label: "Bulunduğu Kat", type: "number" },
      { key: "isitma", label: "Isıtma", type: "select", options: ["Doğalgaz", "Kombi", "Merkezi", "Klima", "Yok"] },
    ],
  },

  {
    id: "arsa", slug: "arsa", name: "Arsa", icon: "🌍", parentId: "emlak",
    attributes: [
      { key: "m2", label: "Metrekare", type: "number", unit: "m²", required: true },
      { key: "imarDurumu", label: "İmar Durumu", type: "select", required: true, options: ["Konut", "Ticari", "Tarla", "Bağ-Bahçe", "Diğer"] },
      { key: "tapuDurumu", label: "Tapu Durumu", type: "select", options: ["Müstakil Tapulu", "Hisseli Tapulu", "Tahsis", "Yok"] },
    ],
  },

  {
    id: "bina", slug: "bina", name: "Komple Bina", icon: "🏗️", parentId: "emlak",
    attributes: [
      { key: "m2", label: "Toplam Metrekare", type: "number", unit: "m²", required: true },
      { key: "katSayisi", label: "Kat Sayısı", type: "number" },
      { key: "daireSayisi", label: "Daire Sayısı", type: "number" },
      { key: "binaYasi", label: "Bina Yaşı", type: "select", options: ["0", "1-5", "6-10", "11-20", "21+"] },
    ],
  },

  {
    id: "devremulk", slug: "devremulk", name: "Devremülk", icon: "🏖️", parentId: "emlak",
    attributes: [
      { key: "donem", label: "Dönem", type: "select", required: true, options: ["Yaz", "Kış", "Bahar", "Sabit", "Değişken"] },
      { key: "oda", label: "Oda Sayısı", type: "select", options: ["1+0", "1+1", "2+1", "3+1"] },
      { key: "m2", label: "Metrekare", type: "number", unit: "m²" },
    ],
  },

  {
    id: "turistik-tesis", slug: "turistik-tesis", name: "Turistik Tesis", icon: "🏨", parentId: "emlak",
    attributes: [
      { key: "tip", label: "Tesis Tipi", type: "select", required: true, options: ["Otel", "Apart", "Pansiyon", "Motel", "Tatil Köyü", "Diğer"] },
      { key: "odaSayisi", label: "Oda Sayısı", type: "number" },
      { key: "m2", label: "Metrekare", type: "number", unit: "m²" },
    ],
  },

  {
    id: "gunluk-kiralik", slug: "gunluk-kiralik", name: "Günlük Kiralık", icon: "🛎️", parentId: "emlak",
    attributes: [
      { key: "tip", label: "Konut Tipi", type: "select", required: true, options: ["Daire", "Villa", "Yazlık", "Bungalov", "Oda", "Diğer"] },
      { key: "oda", label: "Oda Sayısı", type: "select", options: ["1+0", "1+1", "2+1", "3+1", "4+1 ve üzeri"] },
      { key: "kapasite", label: "Kişi Kapasitesi", type: "number", unit: "kişi" },
      { key: "esyali", label: "Eşyalı", type: "boolean" },
    ],
  },
];
