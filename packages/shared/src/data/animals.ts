import type { CategoryNode } from "../category-types";
import { CONDITION } from "../category-types";

// Hayvanlar Alemi alt ağacı. Malzeme + sahiplendirme odaklı (canlı hayvan ticareti değil).
export const animals: CategoryNode[] = [
  { id: "hayvanlar-alemi", slug: "hayvanlar-alemi", name: "Hayvanlar Alemi", icon: "🐾", parentId: null },

  {
    id: "kedi-malzeme", slug: "kedi-malzeme", name: "Kedi Malzemeleri", icon: "🐱", parentId: "hayvanlar-alemi",
    attributes: [
      { key: "type", label: "Ürün Türü", type: "select", required: true, options: ["Mama", "Kedi Kumu", "Kum Kabı", "Tırmalama Tahtası", "Kedi Yatağı", "Taşıma Çantası", "Oyuncak", "Mama Kabı", "Tasma", "Diğer"] },
      { key: "brand", label: "Marka", type: "select", options: ["Whiskas", "Felix", "Royal Canin", "Pro Plan", "N&D", "Reflex", "Brit", "Sheba", "Diğer"] },
      CONDITION,
    ],
  },

  {
    id: "kopek-malzeme", slug: "kopek-malzeme", name: "Köpek Malzemeleri", icon: "🐶", parentId: "hayvanlar-alemi",
    attributes: [
      { key: "type", label: "Ürün Türü", type: "select", required: true, options: ["Mama", "Tasma & Kayış", "Köpek Yatağı", "Kulübe", "Taşıma Kafesi", "Oyuncak", "Mama Kabı", "Ağızlık", "Diğer"] },
      { key: "brand", label: "Marka", type: "select", options: ["Pedigree", "Royal Canin", "Pro Plan", "N&D", "Reflex", "Brit", "Acana", "Dr. Clauder's", "Diğer"] },
      { key: "size", label: "Irk Boyu", type: "select", options: ["Küçük Irk", "Orta Irk", "Büyük Irk"] },
      CONDITION,
    ],
  },

  {
    id: "kus-malzeme", slug: "kus-malzeme", name: "Kuş Malzemeleri", icon: "🐦", parentId: "hayvanlar-alemi",
    attributes: [
      { key: "type", label: "Ürün Türü", type: "select", required: true, options: ["Kafes", "Yem", "Yem Kabı", "Tünek", "Oyuncak", "Kuş Yuvası", "Diğer"] },
      { key: "birdType", label: "Kuş Türü", type: "select", options: ["Muhabbet Kuşu", "Kanarya", "Papağan", "Sultan Papağanı", "Güvercin", "Bülbül", "Diğer"] },
      CONDITION,
    ],
  },

  {
    id: "akvaryum-balik", slug: "akvaryum-balik", name: "Akvaryum & Balık", icon: "🐠", parentId: "hayvanlar-alemi",
    attributes: [
      { key: "type", label: "Ürün Türü", type: "select", required: true, options: ["Akvaryum", "Filtre", "Isıtıcı", "Aydınlatma", "Hava Motoru", "Balık Yemi", "Dekor", "Su Bitkisi", "Diğer"] },
      { key: "volume", label: "Hacim", type: "select", options: ["10 L altı", "10-30 L", "30-60 L", "60-100 L", "100 L üstü"] },
      CONDITION,
    ],
  },

  {
    id: "kemirgen", slug: "kemirgen", name: "Kemirgen & Tavşan", icon: "🐹", parentId: "hayvanlar-alemi",
    attributes: [
      { key: "type", label: "Ürün Türü", type: "select", required: true, options: ["Kafes", "Yem", "Talaş & Altlık", "Su Kabı", "Koşu Tekerleği", "Oyuncak", "Diğer"] },
      { key: "animalType", label: "Hayvan Türü", type: "select", options: ["Hamster", "Tavşan", "Ginepig (Cavia)", "Fare", "Sincap", "Chinchilla", "Diğer"] },
      CONDITION,
    ],
  },

  {
    id: "ciftlik-hayvanlari", slug: "ciftlik-hayvanlari", name: "Çiftlik Hayvanları", icon: "🐔", parentId: "hayvanlar-alemi",
    attributes: [
      { key: "type", label: "Ürün Türü", type: "select", required: true, options: ["Kümes", "Yemlik", "Suluk", "Kuluçka Makinesi", "Yem", "Bakım Ekipmanı", "Diğer"] },
      { key: "animalType", label: "Hayvan Türü", type: "select", options: ["Tavuk", "Horoz", "Ördek", "Kaz", "Hindi", "Keçi", "Koyun", "Diğer"] },
      CONDITION,
    ],
  },

  {
    id: "veteriner-bakim", slug: "veteriner-bakim", name: "Veteriner & Bakım", icon: "🩺", parentId: "hayvanlar-alemi",
    attributes: [
      { key: "type", label: "Ürün Türü", type: "select", required: true, options: ["Vitamin & Takviye", "Şampuan", "Parazit Damla/Tasma", "Diş Bakım", "Tırnak Makası", "Tüy Fırçası", "İlk Yardım", "Diğer"] },
      { key: "targetAnimal", label: "Hedef Hayvan", type: "select", options: ["Kedi", "Köpek", "Kuş", "Kemirgen", "Genel", "Diğer"] },
      CONDITION,
    ],
  },

  {
    id: "hayvan-aksesuar", slug: "hayvan-aksesuar", name: "Hayvan Aksesuar", icon: "🦴", parentId: "hayvanlar-alemi",
    attributes: [
      { key: "type", label: "Ürün Türü", type: "select", required: true, options: ["Tasma", "Kıyafet", "İsim Etiketi", "Taşıma Çantası", "Otomatik Mama/Su", "GPS Takip", "Diğer"] },
      { key: "brand", label: "Marka", type: "text" },
      CONDITION,
    ],
  },

  {
    id: "hayvan-sahiplendirme", slug: "hayvan-sahiplendirme", name: "Sahiplendirme (Ücretsiz)", icon: "🏠", parentId: "hayvanlar-alemi",
    attributes: [
      { key: "animalType", label: "Hayvan Türü", type: "select", required: true, options: ["Kedi", "Köpek", "Kuş", "Kemirgen", "Balık", "Diğer"] },
      { key: "ageRange", label: "Yaş", type: "select", options: ["Yavru (0-1 yaş)", "Genç (1-3 yaş)", "Yetişkin (3-7 yaş)", "Yaşlı (7+ yaş)"] },
      { key: "vaccinated", label: "Aşıları Tam", type: "boolean" },
      { key: "neutered", label: "Kısırlaştırılmış", type: "boolean" },
    ],
  },
];
