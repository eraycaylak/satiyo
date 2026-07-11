import type { CategoryNode } from "../category-types";
import { CONDITION } from "../category-types";

// Vasıta alt ağacı. NOT: vasita/otomobil id'leri KORUNUR (canlı ilanlar bağlı).
export const vehicles: CategoryNode[] = [
  { id: "vasita", slug: "vasita", name: "Vasıta", icon: "🚗", parentId: null },

  {
    id: "otomobil", slug: "otomobil", name: "Otomobil", icon: "🚗", parentId: "vasita",
    attributes: [
      { key: "brand", label: "Marka", type: "select", required: true, options: ["BMW", "Mercedes-Benz", "Audi", "Volkswagen", "Ford", "Renault", "Fiat", "Opel", "Toyota", "Honda", "Hyundai", "Peugeot", "Citroën", "Dacia", "Skoda", "Diğer"] },
      {
        key: "model", label: "Model", type: "select", dependsOn: "brand",
        optionsByParent: {
          BMW: ["1 Serisi", "2 Serisi", "3 Serisi", "4 Serisi", "5 Serisi", "6 Serisi", "7 Serisi", "X1", "X3", "X5", "Diğer"],
          "Mercedes-Benz": ["A Serisi", "B Serisi", "C Serisi", "E Serisi", "S Serisi", "CLA", "GLA", "GLC", "GLE", "Vito", "Diğer"],
          Audi: ["A1", "A3", "A4", "A5", "A6", "Q2", "Q3", "Q5", "Q7", "Diğer"],
          Volkswagen: ["Polo", "Golf", "Passat", "Jetta", "Tiguan", "T-Roc", "Touareg", "Caddy", "Amarok", "Diğer"],
          Ford: ["Fiesta", "Focus", "Mondeo", "Kuga", "Puma", "Transit", "Ranger", "Tourneo", "Diğer"],
          Renault: ["Clio", "Megane", "Symbol", "Fluence", "Captur", "Kadjar", "Talisman", "Taliant", "Diğer"],
          Fiat: ["Egea", "Punto", "Linea", "Doblo", "Fiorino", "500", "Panda", "Diğer"],
          Opel: ["Corsa", "Astra", "Insignia", "Mokka", "Crossland", "Grandland", "Combo", "Diğer"],
          Toyota: ["Corolla", "Yaris", "Auris", "C-HR", "RAV4", "Camry", "Hilux", "Proace", "Diğer"],
          Honda: ["Civic", "Jazz", "City", "Accord", "CR-V", "HR-V", "Diğer"],
          Hyundai: ["i10", "i20", "i30", "Accent Blue", "Elantra", "Tucson", "Kona", "Bayon", "Diğer"],
          Peugeot: ["208", "301", "308", "2008", "3008", "5008", "Partner", "Rifter", "Diğer"],
          "Citroën": ["C3", "C4", "C-Elysee", "C5 Aircross", "Berlingo", "Diğer"],
          Dacia: ["Sandero", "Duster", "Logan", "Lodgy", "Dokker", "Jogger", "Diğer"],
          Skoda: ["Fabia", "Octavia", "Superb", "Scala", "Kamiq", "Karoq", "Kodiaq", "Diğer"],
        },
      },
      { key: "year", label: "Yıl", type: "number", required: true },
      { key: "km", label: "Kilometre", type: "number", unit: "km" },
      { key: "fuel", label: "Yakıt", type: "select", options: ["Benzin", "Dizel", "LPG", "Hibrit", "Elektrik"] },
      { key: "gear", label: "Vites", type: "select", options: ["Manuel", "Otomatik", "Yarı Otomatik"] },
      { key: "renk", label: "Renk", type: "select", options: ["Beyaz", "Siyah", "Gri", "Gümüş", "Kırmızı", "Mavi", "Lacivert", "Yeşil", "Kahverengi", "Bej", "Diğer"] },
    ],
  },

  {
    id: "arazi-suv-pickup", slug: "arazi-suv-pickup", name: "Arazi, SUV & Pickup", icon: "🚙", parentId: "vasita",
    attributes: [
      { key: "brand", label: "Marka", type: "select", required: true, options: ["Toyota", "Nissan", "Land Rover", "Jeep", "Hyundai", "Kia", "Volkswagen", "BMW", "Mercedes-Benz", "Dacia", "Diğer"] },
      { key: "year", label: "Yıl", type: "number", required: true },
      { key: "km", label: "Kilometre", type: "number", unit: "km" },
      { key: "fuel", label: "Yakıt", type: "select", options: ["Benzin", "Dizel", "LPG", "Hibrit", "Elektrik"] },
      { key: "gear", label: "Vites", type: "select", options: ["Manuel", "Otomatik", "Yarı Otomatik"] },
      { key: "cekis", label: "Çekiş", type: "select", options: ["Önden Çekiş", "Arkadan İtiş", "4x4"] },
    ],
  },

  {
    id: "motosiklet", slug: "motosiklet", name: "Motosiklet", icon: "🏍️", parentId: "vasita",
    attributes: [
      { key: "brand", label: "Marka", type: "select", required: true, options: ["Honda", "Yamaha", "Kawasaki", "Suzuki", "Kuba", "Mondial", "RKS", "Diğer"] },
      {
        key: "model", label: "Model", type: "select", dependsOn: "brand",
        optionsByParent: {
          Honda: ["PCX 125", "CBR 250", "CB 125", "Forza 250", "Africa Twin", "Diğer"],
          Yamaha: ["YZF-R25", "MT-07", "NMAX 125", "Tracer 900", "XMAX 250", "Diğer"],
          Kawasaki: ["Ninja 250", "Ninja 400", "Z650", "Z900", "Versys 650", "Diğer"],
          Suzuki: ["GSX-R125", "V-Strom 650", "Burgman 400", "GSX-S750", "Diğer"],
          Kuba: ["CG 125", "Superlight 200", "GY6", "Diğer"],
          Mondial: ["125 Drift", "150 MG", "250 GT", "Diğer"],
          RKS: ["Fever 125", "RKS 200", "Diğer"],
        },
      },
      { key: "engine", label: "Motor Hacmi", type: "select", options: ["50cc altı", "50-125cc", "125-250cc", "250-600cc", "600cc üstü"] },
      { key: "year", label: "Yıl", type: "number", required: true },
      { key: "km", label: "Kilometre", type: "number", unit: "km" },
    ],
  },

  {
    id: "minivan-panelvan", slug: "minivan-panelvan", name: "Minivan & Panelvan", icon: "🚐", parentId: "vasita",
    attributes: [
      { key: "brand", label: "Marka", type: "select", required: true, options: ["Volkswagen", "Ford", "Fiat", "Citroën", "Peugeot", "Renault", "Opel", "Mercedes-Benz", "Diğer"] },
      { key: "year", label: "Yıl", type: "number", required: true },
      { key: "km", label: "Kilometre", type: "number", unit: "km" },
      { key: "fuel", label: "Yakıt", type: "select", options: ["Benzin", "Dizel", "LPG", "Hibrit", "Elektrik"] },
      { key: "gear", label: "Vites", type: "select", options: ["Manuel", "Otomatik", "Yarı Otomatik"] },
      { key: "seats", label: "Koltuk Sayısı", type: "select", options: ["2", "5", "7", "8", "9+"] },
    ],
  },

  {
    id: "ticari-arac", slug: "ticari-arac", name: "Ticari Araç", icon: "🚚", parentId: "vasita",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Kamyon", "Kamyonet", "Çekici", "Otobüs", "Midibüs", "Minibüs", "Tanker", "Diğer"] },
      { key: "brand", label: "Marka", type: "select", options: ["Ford", "Mercedes-Benz", "Iveco", "MAN", "Isuzu", "Otokar", "BMC", "Volvo", "Scania", "Diğer"] },
      { key: "year", label: "Yıl", type: "number", required: true },
      { key: "km", label: "Kilometre", type: "number", unit: "km" },
      { key: "fuel", label: "Yakıt", type: "select", options: ["Dizel", "Benzin", "LPG", "Elektrik"] },
    ],
  },

  {
    id: "elektrikli-araclar", slug: "elektrikli-araclar", name: "Elektrikli Araçlar", icon: "🔌", parentId: "vasita",
    attributes: [
      { key: "brand", label: "Marka", type: "select", required: true, options: ["Tesla", "Togg", "BYD", "MG", "Hyundai", "Volkswagen", "Renault", "Kia", "Diğer"] },
      { key: "year", label: "Yıl", type: "number", required: true },
      { key: "km", label: "Kilometre", type: "number", unit: "km" },
      { key: "range", label: "Menzil", type: "select", options: ["0-200 km", "200-350 km", "350-500 km", "500 km üstü"] },
      { key: "renk", label: "Renk", type: "select", options: ["Beyaz", "Siyah", "Gri", "Gümüş", "Kırmızı", "Mavi", "Lacivert", "Diğer"] },
    ],
  },

  {
    id: "deniz-araclari", slug: "deniz-araclari", name: "Deniz Araçları", icon: "🛥️", parentId: "vasita",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Sürat Teknesi", "Yelkenli", "Şişme Bot", "Jet Ski", "Balıkçı Teknesi", "Yat", "Diğer"] },
      { key: "year", label: "Yıl", type: "number" },
      { key: "length", label: "Boy", type: "number", unit: "m" },
      { key: "motor", label: "Motor", type: "select", options: ["Motorlu", "Motorsuz"] },
      CONDITION,
    ],
  },

  {
    id: "karavan", slug: "karavan", name: "Karavan", icon: "🏕️", parentId: "vasita",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Çekme Karavan", "Motorkaravan", "Çadır Karavan", "Karavan Aksesuarı", "Diğer"] },
      { key: "year", label: "Yıl", type: "number" },
      { key: "km", label: "Kilometre", type: "number", unit: "km" },
      { key: "beds", label: "Yatak Sayısı", type: "select", options: ["2", "4", "6+"] },
      CONDITION,
    ],
  },

  {
    id: "atv-utv", slug: "atv-utv", name: "ATV & UTV", icon: "🛺", parentId: "vasita",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["ATV", "UTV", "Buggy", "Diğer"] },
      { key: "brand", label: "Marka", type: "select", options: ["Yamaha", "Honda", "Polaris", "CFMoto", "Can-Am", "Kymco", "Diğer"] },
      { key: "year", label: "Yıl", type: "number" },
      { key: "engine", label: "Motor Hacmi", type: "select", options: ["50cc altı", "50-125cc", "125-250cc", "250-600cc", "600cc üstü"] },
      CONDITION,
    ],
  },

  {
    id: "hasarli-araclar", slug: "hasarli-araclar", name: "Hasarlı Araçlar", icon: "🚧", parentId: "vasita",
    attributes: [
      { key: "type", label: "Araç Tipi", type: "select", required: true, options: ["Otomobil", "SUV", "Motosiklet", "Ticari", "Diğer"] },
      { key: "brand", label: "Marka", type: "text" },
      { key: "year", label: "Yıl", type: "number" },
      { key: "damage", label: "Hasar Durumu", type: "select", options: ["Pert", "Ağır Hasarlı", "Orta Hasarlı", "Az Hasarlı", "Motor Arızalı"] },
      { key: "km", label: "Kilometre", type: "number", unit: "km" },
    ],
  },

  {
    id: "yedek-parca-aksesuar", slug: "yedek-parca-aksesuar", name: "Yedek Parça & Aksesuar", icon: "🔧", parentId: "vasita",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Motor Parçası", "Kaporta", "Lastik & Jant", "Multimedya", "Aksesuar", "Yağ & Kimyasal", "Diğer"] },
      { key: "vehicle", label: "Araç Türü", type: "select", options: ["Otomobil", "SUV", "Motosiklet", "Ticari", "Deniz Aracı", "Genel"] },
      { key: "brand", label: "Marka", type: "text" },
      CONDITION,
    ],
  },
];
