import type { CategoryNode } from "../category-types";
import { CONDITION } from "../category-types";

// Ev & Yaşam alt ağacı. NOT: ev-yasam/beyaz-esya/mobilya id'leri KORUNUR (canlı ilanlar bağlı).
export const home: CategoryNode[] = [
  { id: "ev-yasam", slug: "ev-yasam", name: "Ev & Yaşam", icon: "🛋️", parentId: null },

  {
    id: "beyaz-esya", slug: "beyaz-esya", name: "Beyaz Eşya", icon: "🧊", parentId: "ev-yasam",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Buzdolabı", "Çamaşır Makinesi", "Bulaşık Makinesi", "Fırın", "Kurutma Makinesi", "Derin Dondurucu", "Diğer"] },
      { key: "brand", label: "Marka", type: "select", options: ["Arçelik", "Beko", "Bosch", "Samsung", "LG", "Vestel", "Siemens", "Profilo", "Altus", "Regal", "Diğer"] },
      CONDITION,
    ],
  },

  {
    id: "mobilya", slug: "mobilya", name: "Mobilya", icon: "🛋️", parentId: "ev-yasam",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Koltuk", "Kanepe", "Yatak", "Yatak Odası Takımı", "Masa", "Sandalye", "Dolap", "Gardırop", "TV Ünitesi", "Diğer"] },
      { key: "material", label: "Malzeme", type: "select", options: ["Ahşap", "Sunta", "Metal", "Deri", "Kumaş", "Cam", "Rattan", "Diğer"] },
      CONDITION,
    ],
  },

  {
    id: "kucuk-ev-aletleri", slug: "kucuk-ev-aletleri", name: "Küçük Ev Aletleri", icon: "🔌", parentId: "ev-yasam",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Süpürge", "Robot Süpürge", "Ütü", "Su Isıtıcı", "Blender", "Mikser", "Kahve Makinesi", "Air Fryer", "Tost Makinesi", "Mikrodalga", "Diğer"] },
      { key: "brand", label: "Marka", type: "select", options: ["Arçelik", "Bosch", "Philips", "Fakir", "Karaca", "Tefal", "Braun", "Xiaomi", "Sinbo", "Diğer"] },
      CONDITION,
    ],
  },

  {
    id: "mutfak-gerecleri", slug: "mutfak-gerecleri", name: "Mutfak Gereçleri", icon: "🍽️", parentId: "ev-yasam",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Tencere & Tava", "Çaydanlık", "Çatal Bıçak Takımı", "Tabak & Kase", "Bardak", "Saklama Kabı", "Pişirme Gereçleri", "Diğer"] },
      { key: "material", label: "Malzeme", type: "select", options: ["Çelik", "Granit", "Döküm", "Seramik", "Cam", "Ahşap", "Diğer"] },
      CONDITION,
    ],
  },

  {
    id: "dekorasyon-aksesuar", slug: "dekorasyon-aksesuar", name: "Dekorasyon & Aksesuar", icon: "🖼️", parentId: "ev-yasam",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Tablo", "Ayna", "Vazo", "Biblo", "Mum & Şamdan", "Duvar Saati", "Çerçeve", "Yapay Çiçek", "Diğer"] },
      { key: "style", label: "Stil", type: "select", options: ["Modern", "Klasik", "Rustik", "Country", "Etnik", "Diğer"] },
      CONDITION,
    ],
  },

  {
    id: "ev-tekstili", slug: "ev-tekstili", name: "Ev Tekstili", icon: "🧵", parentId: "ev-yasam",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Nevresim Takımı", "Yatak Örtüsü", "Battaniye", "Yorgan", "Yastık", "Perde", "Halı & Kilim", "Havlu", "Masa Örtüsü", "Diğer"] },
      { key: "size", label: "Ebat", type: "select", options: ["Tek Kişilik", "Çift Kişilik", "King", "Standart", "Diğer"] },
      CONDITION,
    ],
  },

  {
    id: "aydinlatma", slug: "aydinlatma", name: "Aydınlatma", icon: "💡", parentId: "ev-yasam",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Avize", "Sarkıt", "Abajur", "Lambader", "Aplik", "Masa Lambası", "Spot", "LED Şerit", "Gece Lambası", "Diğer"] },
      { key: "style", label: "Stil", type: "select", options: ["Modern", "Klasik", "Rustik", "Endüstriyel", "Diğer"] },
      CONDITION,
    ],
  },

  {
    id: "banyo-yapi", slug: "banyo-yapi", name: "Banyo & Yapı", icon: "🚿", parentId: "ev-yasam",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Batarya & Musluk", "Duşakabin", "Klozet", "Lavabo", "Küvet", "Banyo Dolabı", "Ayna Dolabı", "Fayans & Seramik", "Diğer"] },
      { key: "brand", label: "Marka", type: "select", options: ["Artema", "ECA", "VitrA", "Creavit", "Grohe", "Kale", "Diğer"] },
      CONDITION,
    ],
  },

  {
    id: "bahce-yasam", slug: "bahce-yasam", name: "Bahçe & Yaşam", icon: "🪴", parentId: "ev-yasam",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Bahçe Mobilyası", "Şezlong", "Salıncak", "Şemsiye", "Mangal & Barbekü", "Çiçek & Saksı", "Bahçe Aletleri", "Çim Biçme Makinesi", "Havuz", "Diğer"] },
      { key: "material", label: "Malzeme", type: "select", options: ["Ahşap", "Metal", "Rattan", "Plastik", "Diğer"] },
      CONDITION,
    ],
  },

  {
    id: "isitma-sogutma", slug: "isitma-sogutma", name: "Isıtma & Soğutma", icon: "🔥", parentId: "ev-yasam",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Klima", "Kombi", "Soba", "Şofben", "Radyatör", "Isıtıcı", "Vantilatör", "Hava Temizleyici", "Termosifon", "Diğer"] },
      { key: "brand", label: "Marka", type: "select", options: ["Arçelik", "Vestel", "Bosch", "Baymak", "DemirDöküm", "Daikin", "Mitsubishi", "Samsung", "LG", "Diğer"] },
      CONDITION,
    ],
  },

  {
    id: "temizlik", slug: "temizlik", name: "Temizlik", icon: "🧹", parentId: "ev-yasam",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Temizlik Arabası", "Paspas & Kova", "Çamaşır Sepeti", "Ütü Masası", "Askı & Kurutmalık", "Çöp Kovası", "Süpürge & Faraş", "Diğer"] },
      { key: "material", label: "Malzeme", type: "select", options: ["Plastik", "Metal", "Hasır", "Kumaş", "Bambu", "Diğer"] },
      CONDITION,
    ],
  },
];
