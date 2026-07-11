import type { CategoryNode } from "../category-types";
import { CONDITION, CLOTHING_SIZES } from "../category-types";

// Spor & Outdoor alt ağacı. Kök YENİ: spor-outdoor (parentId null), alt düğümler parentId "spor-outdoor".
export const sports: CategoryNode[] = [
  { id: "spor-outdoor", slug: "spor-outdoor", name: "Spor & Outdoor", icon: "⚽", parentId: null },

  {
    id: "fitness-kondisyon", slug: "fitness-kondisyon", name: "Fitness & Kondisyon", icon: "🏋️", parentId: "spor-outdoor",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Koşu Bandı", "Kondisyon Bisikleti", "Eliptik Bisiklet", "Dumbbell / Halter", "Kettlebell", "Ağırlık Seti", "Direnç Bandı", "Yoga / Pilates", "Kürek Çekme", "Diğer"] },
      { key: "brand", label: "Marka", type: "select", options: ["Domyos", "Kettler", "Reebok", "Voit", "Delta", "Life Fitness", "Technogym", "Diğer"] },
      CONDITION,
    ],
  },

  {
    id: "bisiklet", slug: "bisiklet", name: "Bisiklet", icon: "🚲", parentId: "spor-outdoor",
    attributes: [
      { key: "type", label: "Tip", type: "select", required: true, options: ["Dağ", "Yol", "Şehir", "Katlanır", "Elektrikli", "Çocuk"] },
      { key: "brand", label: "Marka", type: "select", options: ["Salcano", "Bianchi", "Kron", "Corelli", "Carraro", "Mosso", "Trek", "Specialized", "Cube", "Diğer"] },
      { key: "wheel", label: "Jant", type: "select", options: ['20"', '24"', '26"', '28"', '29"'] },
      CONDITION,
    ],
  },

  {
    id: "kamp-outdoor", slug: "kamp-outdoor", name: "Kamp & Outdoor", icon: "⛺", parentId: "spor-outdoor",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Çadır", "Uyku Tulumu", "Kamp Sandalyesi", "Kamp Masası", "Mat / Matras", "Termos / Matara", "Kamp Ocağı", "Sırt Çantası", "Fener", "Diğer"] },
      { key: "brand", label: "Marka", type: "select", options: ["Quechua", "Coleman", "Deuter", "Salewa", "The North Face", "Forclaz", "Diğer"] },
      { key: "capacity", label: "Kişi Kapasitesi", type: "select", options: ["1 Kişilik", "2 Kişilik", "3 Kişilik", "4 Kişilik", "5+ Kişilik"] },
      CONDITION,
    ],
  },

  {
    id: "su-sporlari", slug: "su-sporlari", name: "Su Sporları", icon: "🏄", parentId: "spor-outdoor",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Yüzme", "Dalış / Şnorkel", "Sörf", "SUP / Kano", "Yelken", "Can Yeleği", "Diğer"] },
      { key: "brand", label: "Marka", type: "text" },
      CONDITION,
    ],
  },

  {
    id: "kis-sporlari", slug: "kis-sporlari", name: "Kış Sporları", icon: "🎿", parentId: "spor-outdoor",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Kayak", "Snowboard", "Kayak Botu", "Kask", "Gözlük", "Kış Giyimi", "Diğer"] },
      { key: "brand", label: "Marka", type: "select", options: ["Rossignol", "Salomon", "Atomic", "Head", "Burton", "Fischer", "Diğer"] },
      CONDITION,
    ],
  },

  {
    id: "takim-sporlari", slug: "takim-sporlari", name: "Takım Sporları", icon: "🏀", parentId: "spor-outdoor",
    attributes: [
      { key: "branch", label: "Branş", type: "select", required: true, options: ["Futbol", "Basketbol", "Voleybol", "Hentbol", "Tenis", "Masa Tenisi", "Badminton", "Diğer"] },
      { key: "type", label: "Ürün Tipi", type: "select", options: ["Top", "Forma", "Krampon / Ayakkabı", "Raket", "File", "Ekipman", "Diğer"] },
      { key: "brand", label: "Marka", type: "select", options: ["Nike", "Adidas", "Puma", "Wilson", "Molten", "Mikasa", "Diğer"] },
      CONDITION,
    ],
  },

  {
    id: "fitness-giyim", slug: "fitness-giyim", name: "Spor Giyim", icon: "👕", parentId: "spor-outdoor",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Tişört", "Şort / Tayt", "Eşofman", "Spor Ayakkabı", "Mont / Rüzgarlık", "Sporcu Sütyeni", "Diğer"] },
      { key: "gender", label: "Cinsiyet", type: "select", options: ["Kadın", "Erkek", "Unisex"] },
      { key: "size", label: "Beden", type: "select", options: CLOTHING_SIZES },
      { key: "brand", label: "Marka", type: "select", options: ["Nike", "Adidas", "Puma", "Under Armour", "Reebok", "Decathlon", "Diğer"] },
      CONDITION,
    ],
  },

  {
    id: "avcilik-olta", slug: "avcilik-olta", name: "Avcılık & Olta", icon: "🎣", parentId: "spor-outdoor",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Olta Kamışı", "Olta Makinesi", "Yem / Sahte", "Olta Takımı", "Kamuflaj Giyim", "Balıkçı Çantası", "Diğer"] },
      { key: "brand", label: "Marka", type: "select", options: ["Shimano", "Daiwa", "Okuma", "Penn", "Diğer"] },
      CONDITION,
    ],
  },

  {
    id: "scooter-paten", slug: "scooter-paten", name: "Scooter & Paten", icon: "🛴", parentId: "spor-outdoor",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Elektrikli Scooter", "Katlanır Scooter", "Paten (Inline)", "Kaykay", "Longboard", "Koruyucu Set", "Diğer"] },
      { key: "brand", label: "Marka", type: "select", options: ["Xiaomi", "Segway / Ninebot", "Micro", "Oxelo", "Nils", "Diğer"] },
      CONDITION,
    ],
  },
];
