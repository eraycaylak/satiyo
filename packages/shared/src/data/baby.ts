import type { CategoryNode } from "../category-types";
import { CONDITION } from "../category-types";

// Anne & Bebek alt ağacı. NOT: kök id "bebek" KORUNUR (canlı ilanlar bağlı).
export const baby: CategoryNode[] = [
  { id: "bebek", slug: "bebek", name: "Anne & Bebek", icon: "🍼", parentId: null },

  {
    id: "bebek-arabasi", slug: "bebek-arabasi", name: "Bebek Arabası", icon: "🚼", parentId: "bebek",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Travel Sistem", "Puset", "İkiz Arabası", "Çift Yönlü", "Portbebe", "Diğer"] },
      { key: "brand", label: "Marka", type: "select", options: ["Chicco", "Joie", "Cybex", "Maxi-Cosi", "Prego", "Kraft", "Baby Jogger", "Bugaboo", "Graco", "Diğer"] },
      CONDITION,
    ],
  },

  {
    id: "oto-koltugu", slug: "oto-koltugu", name: "Oto Koltuğu", icon: "🚗", parentId: "bebek",
    attributes: [
      { key: "brand", label: "Marka", type: "select", options: ["Chicco", "Maxi-Cosi", "Cybex", "Joie", "Britax Römer", "Prego", "Kraft", "Diğer"] },
      { key: "weightGroup", label: "Ağırlık Grubu", type: "select", options: ["0-13 kg (Grup 0+)", "9-18 kg (Grup 1)", "15-36 kg (Grup 2-3)", "0-36 kg", "Diğer"] },
      { key: "isofix", label: "Isofix", type: "boolean" },
      CONDITION,
    ],
  },

  {
    id: "bebek-giyim", slug: "bebek-giyim", name: "Bebek Giyim", icon: "👶", parentId: "bebek",
    attributes: [
      { key: "size", label: "Beden", type: "select", required: true, options: ["0-3 ay", "3-6 ay", "6-9 ay", "9-12 ay", "12-18 ay", "18-24 ay", "2-3 yaş", "4-5 yaş"] },
      { key: "gender", label: "Cinsiyet", type: "select", options: ["Kız", "Erkek", "Unisex"] },
      { key: "type", label: "Tür", type: "select", options: ["Body / Zıbın", "Tulum", "Takım", "Elbise", "Dış Giyim", "Pijama", "Diğer"] },
      CONDITION,
    ],
  },

  {
    id: "bebek-odasi-mobilya", slug: "bebek-odasi-mobilya", name: "Bebek Odası & Mobilya", icon: "🛏️", parentId: "bebek",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Beşik", "Park Yatak", "Bebek Yatağı", "Şifonyer / Alt Açma", "Dolap", "Oda Takımı", "Diğer"] },
      { key: "brand", label: "Marka", type: "text" },
      CONDITION,
    ],
  },

  {
    id: "emzirme-beslenme", slug: "emzirme-beslenme", name: "Emzirme & Beslenme", icon: "🍼", parentId: "bebek",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Göğüs Pompası", "Biberon", "Biberon Isıtıcı", "Sterilizatör", "Mama Hazırlama", "Emzirme Yastığı", "Diğer"] },
      { key: "brand", label: "Marka", type: "select", options: ["Philips Avent", "Chicco", "Medela", "Mamajoo", "Wee Baby", "Diğer"] },
      CONDITION,
    ],
  },

  {
    id: "bebek-bakim", slug: "bebek-bakim", name: "Bebek Bakım", icon: "🧴", parentId: "bebek",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Küvet", "Alt Açma Minderi", "Bebek Tartısı", "Termometre", "Bakım Seti", "Burun Aspiratörü", "Diğer"] },
      CONDITION,
    ],
  },

  {
    id: "oyuncak", slug: "oyuncak", name: "Oyuncak & Eğitici", icon: "🧸", parentId: "bebek",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Oyun Halısı", "Eğitici Oyuncak", "Peluş", "Aktivite Merkezi", "Yürüteç / Zıp Zıp", "Diğer"] },
      { key: "ageRange", label: "Yaş Aralığı", type: "select", options: ["0-6 ay", "6-12 ay", "1-2 yaş", "2-3 yaş", "3+ yaş"] },
      CONDITION,
    ],
  },

  {
    id: "mama-sandalyesi", slug: "mama-sandalyesi", name: "Mama Sandalyesi", icon: "🪑", parentId: "bebek",
    attributes: [
      { key: "brand", label: "Marka", type: "select", options: ["Chicco", "Kraft", "Prego", "Joie", "Graco", "Diğer"] },
      { key: "type", label: "Tür", type: "select", options: ["Standart", "Portatif", "Yükseltici", "Diğer"] },
      CONDITION,
    ],
  },

  {
    id: "tasima-kanguru", slug: "tasima-kanguru", name: "Taşıma & Kanguru", icon: "🎒", parentId: "bebek",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Kanguru", "Taşıma Şalı", "Ergonomik Taşıyıcı", "Hipseat", "Diğer"] },
      { key: "brand", label: "Marka", type: "text" },
      CONDITION,
    ],
  },

  {
    id: "bebek-guvenlik", slug: "bebek-guvenlik", name: "Bebek Güvenlik & Monitör", icon: "📹", parentId: "bebek",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Bebek Telsizi / Monitör", "Güvenlik Bariyeri", "Kapı / Çekmece Kilidi", "Köşe Koruyucu", "Diğer"] },
      CONDITION,
    ],
  },

  {
    id: "gebelik-lohusa", slug: "gebelik-lohusa", name: "Gebelik & Lohusa", icon: "🤰", parentId: "bebek",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Hamile Giyim", "Emzirme Giyim", "Destek Yastığı", "Lohusa Kuşağı", "Diğer"] },
      { key: "size", label: "Beden", type: "select", options: ["S", "M", "L", "XL", "XXL"] },
      CONDITION,
    ],
  },
];
