import type { CategoryNode } from "../category-types";
import { CONDITION } from "../category-types";

// Hobi & Oyun alt ağacı. NOT: hobi kök id'i KORUNUR (canlı ilanlar + CATEGORY_VISUAL bağlı).
export const hobby: CategoryNode[] = [
  { id: "hobi", slug: "hobi", name: "Hobi & Oyun", icon: "🎮", parentId: null },

  {
    id: "muzik-enstruman", slug: "muzik-enstruman", name: "Müzik & Enstrüman", icon: "🎸", parentId: "hobi",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Gitar", "Bağlama", "Piyano/Org", "Davul/Perküsyon", "Yaylı", "Üflemeli", "Diğer"] },
      {
        key: "brand", label: "Marka", type: "select", dependsOn: "type",
        optionsByParent: {
          Gitar: ["Fender", "Gibson", "Ibanez", "Yamaha", "Cort", "Squier", "SX", "Kozmos", "Diğer"],
          Bağlama: ["Ada", "Arif Durmuş", "Kelami", "Divan", "Yerli Yapım", "Diğer"],
          "Piyano/Org": ["Yamaha", "Casio", "Roland", "Korg", "Kawai", "Diğer"],
          "Davul/Perküsyon": ["Pearl", "Tama", "Mapex", "Yamaha", "Meinl", "Diğer"],
          Yaylı: ["Stentor", "Cremona", "Sandner", "Yerli Yapım", "Diğer"],
          Üflemeli: ["Yamaha", "Jupiter", "Selmer", "Roy Benson", "Diğer"],
        },
      },
      CONDITION,
    ],
  },

  {
    id: "kitap-dergi", slug: "kitap-dergi", name: "Kitap & Dergi", icon: "📚", parentId: "hobi",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Roman", "Ders/Sınav Kitabı", "Çocuk Kitabı", "Dergi", "Çizgi Roman", "Akademik", "Kişisel Gelişim", "Diğer"] },
      { key: "language", label: "Dil", type: "select", options: ["Türkçe", "İngilizce", "Almanca", "Arapça", "Diğer"] },
      { key: "cover", label: "Cilt", type: "select", options: ["Ciltli", "Karton Kapak"] },
      CONDITION,
    ],
  },

  {
    id: "film-muzik", slug: "film-muzik", name: "Film & Müzik", icon: "🎬", parentId: "hobi",
    attributes: [
      { key: "type", label: "Format", type: "select", required: true, options: ["Plak (LP)", "CD", "DVD/Blu-ray", "Kaset", "VHS", "Diğer"] },
      { key: "genre", label: "Tür", type: "select", options: ["Rock", "Pop", "Klasik", "Arabesk", "Türk Halk Müziği", "Film Müziği", "Diğer"] },
      CONDITION,
    ],
  },

  {
    id: "koleksiyon", slug: "koleksiyon", name: "Koleksiyon", icon: "🪙", parentId: "hobi",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Pul", "Madeni Para", "Kağıt Para", "Kartpostal", "Rozet", "Kibrit/Çakmak", "Biblo/Figür", "Diğer"] },
      { key: "era", label: "Dönem", type: "select", options: ["Osmanlı", "Cumhuriyet", "1950 Öncesi", "1950-2000", "2000 Sonrası", "Bilinmiyor"] },
      CONDITION,
    ],
  },

  {
    id: "el-sanatlari", slug: "el-sanatlari", name: "El Sanatları & Örgü", icon: "🧶", parentId: "hobi",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Örgü/Nakış", "Takı Yapımı", "Dikiş", "Ahşap Boyama", "Seramik/Kil", "Diğer"] },
      { key: "material", label: "Malzeme", type: "select", options: ["İp/Yün", "Boncuk", "Kumaş", "Ahşap", "Kil", "Diğer"] },
      CONDITION,
    ],
  },

  {
    id: "model-maket-hobi", slug: "model-maket-hobi", name: "Model & Maket", icon: "🛩️", parentId: "hobi",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Uçak Maketi", "Araba Maketi", "Gemi Maketi", "Diecast", "Puzzle", "Yapı Blokları/Lego", "Diğer"] },
      { key: "scale", label: "Ölçek", type: "select", options: ['1:18', '1:24', '1:32', '1:43', '1:72', "Diğer"] },
      { key: "brand", label: "Marka", type: "select", options: ["Revell", "Tamiya", "Bburago", "Maisto", "Lego", "Diğer"] },
      CONDITION,
    ],
  },

  {
    id: "resim-sanat", slug: "resim-sanat", name: "Resim & Sanat", icon: "🎨", parentId: "hobi",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Tablo", "Boya/Fırça", "Tuval", "Heykel", "Baskı/Poster", "Diğer"] },
      { key: "technique", label: "Teknik", type: "select", options: ["Yağlı Boya", "Akrilik", "Suluboya", "Karakalem", "Dijital", "Diğer"] },
      CONDITION,
    ],
  },

  {
    id: "kirtasiye-ofis", slug: "kirtasiye-ofis", name: "Kırtasiye & Ofis", icon: "🖊️", parentId: "hobi",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Dolma Kalem", "Defter/Ajanda", "Ofis Malzemesi", "Sanat Malzemesi", "Hesap Makinesi", "Diğer"] },
      { key: "brand", label: "Marka", type: "select", options: ["Faber-Castell", "Parker", "Pelikan", "Rotring", "Scrikss", "Moleskine", "Diğer"] },
      CONDITION,
    ],
  },

  {
    id: "antika", slug: "antika", name: "Antika", icon: "🏺", parentId: "hobi",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Mobilya", "Saat", "Gramofon/Radyo", "Porselen/Seramik", "Bakır/Pirinç", "Tablo", "Diğer"] },
      { key: "era", label: "Dönem", type: "select", options: ["Osmanlı", "Erken Cumhuriyet", "1950 Öncesi", "1950-1980", "Bilinmiyor"] },
      CONDITION,
    ],
  },
];
