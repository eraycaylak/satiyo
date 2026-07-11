import type { CategoryNode } from "../category-types";
import { CONDITION } from "../category-types";

// Elektronik alt ağacı. NOT: elektronik/telefon/bilgisayar id'leri KORUNUR (canlı ilanlar bağlı).
export const electronics: CategoryNode[] = [
  { id: "elektronik", slug: "elektronik", name: "Elektronik", icon: "📱", parentId: null },

  {
    id: "telefon", slug: "telefon", name: "Cep Telefonu", icon: "📱", parentId: "elektronik",
    attributes: [
      { key: "brand", label: "Marka", type: "select", required: true, options: ["Apple", "Samsung", "Xiaomi", "Huawei", "Oppo", "Realme", "Vivo", "Tecno", "Reeder", "Diğer"] },
      {
        key: "model", label: "Model", type: "select", dependsOn: "brand",
        optionsByParent: {
          Apple: ["iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15 Plus", "iPhone 15", "iPhone 14 Pro Max", "iPhone 14 Pro", "iPhone 14", "iPhone 13", "iPhone 12", "iPhone SE", "Diğer"],
          Samsung: ["Galaxy S24 Ultra", "Galaxy S24+", "Galaxy S24", "Galaxy S23", "Galaxy A54", "Galaxy A34", "Galaxy A24", "Galaxy Z Flip", "Galaxy Z Fold", "Diğer"],
          Xiaomi: ["14 Pro", "14", "13T Pro", "Redmi Note 13 Pro", "Redmi Note 13", "Redmi 13C", "POCO X6 Pro", "POCO F5", "Diğer"],
          Huawei: ["P60 Pro", "Nova 12", "Nova 11", "Mate 50", "Diğer"],
          Oppo: ["Reno 11", "Reno 10", "A98", "A78", "Diğer"],
          Realme: ["12 Pro", "11 Pro", "C55", "C53", "Diğer"],
          Vivo: ["V29", "V27", "Y36", "Diğer"],
        },
      },
      { key: "storage", label: "Hafıza", type: "select", options: ["32 GB", "64 GB", "128 GB", "256 GB", "512 GB", "1 TB"] },
      CONDITION,
    ],
  },

  {
    id: "bilgisayar", slug: "bilgisayar", name: "Bilgisayar", icon: "💻", parentId: "elektronik",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Dizüstü", "Masaüstü", "All-in-One", "Bileşen/Parça"] },
      { key: "brand", label: "Marka", type: "select", options: ["Apple", "Asus", "Lenovo", "HP", "Dell", "Casper", "MSI", "Monster", "Acer", "Huawei", "Diğer"] },
      { key: "ram", label: "RAM", type: "select", options: ["4 GB", "8 GB", "16 GB", "32 GB", "64 GB"] },
      { key: "storage", label: "Depolama", type: "select", options: ["128 GB SSD", "256 GB SSD", "512 GB SSD", "1 TB SSD", "1 TB HDD", "2 TB+"] },
      CONDITION,
    ],
  },

  {
    id: "tablet", slug: "tablet", name: "Tablet", icon: "📲", parentId: "elektronik",
    attributes: [
      { key: "brand", label: "Marka", type: "select", options: ["Apple", "Samsung", "Xiaomi", "Huawei", "Lenovo", "Diğer"] },
      { key: "storage", label: "Hafıza", type: "select", options: ["32 GB", "64 GB", "128 GB", "256 GB", "512 GB+"] },
      CONDITION,
    ],
  },

  {
    id: "televizyon", slug: "televizyon", name: "Televizyon", icon: "📺", parentId: "elektronik",
    attributes: [
      { key: "brand", label: "Marka", type: "select", options: ["Samsung", "LG", "Sony", "Vestel", "Arçelik", "Philips", "TCL", "Diğer"] },
      { key: "screen", label: "Ekran Boyutu", type: "select", options: ['32"', '43"', '50"', '55"', '65"', '75"+'] },
      { key: "panel", label: "Panel", type: "select", options: ["LED", "QLED", "OLED", "Diğer"] },
      CONDITION,
    ],
  },

  {
    id: "ses-goruntu", slug: "ses-goruntu", name: "Ses & Görüntü", icon: "🎧", parentId: "elektronik",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Kulaklık", "Bluetooth Hoparlör", "Soundbar", "Ev Sinema", "Mikrofon", "Diğer"] },
      { key: "brand", label: "Marka", type: "text" },
      CONDITION,
    ],
  },

  {
    id: "oyun-konsol", slug: "oyun-konsol", name: "Oyun & Konsol", icon: "🎮", parentId: "elektronik",
    attributes: [
      { key: "platform", label: "Platform", type: "select", required: true, options: ["PlayStation 5", "PlayStation 4", "Xbox Series X/S", "Xbox One", "Nintendo Switch", "Oyun (Disk)", "Aksesuar", "Diğer"] },
      CONDITION,
    ],
  },

  {
    id: "fotograf", slug: "fotograf", name: "Fotoğraf & Kamera", icon: "📷", parentId: "elektronik",
    attributes: [
      { key: "type", label: "Tür", type: "select", options: ["DSLR", "Aynasız", "Kompakt", "Aksiyon Kamera", "Drone", "Lens", "Diğer"] },
      { key: "brand", label: "Marka", type: "select", options: ["Canon", "Nikon", "Sony", "Fujifilm", "GoPro", "DJI", "Diğer"] },
      CONDITION,
    ],
  },

  {
    id: "giyilebilir", slug: "giyilebilir", name: "Akıllı Saat & Bileklik", icon: "⌚", parentId: "elektronik",
    attributes: [
      { key: "brand", label: "Marka", type: "select", options: ["Apple", "Samsung", "Xiaomi", "Huawei", "Amazfit", "Garmin", "Diğer"] },
      CONDITION,
    ],
  },
];
