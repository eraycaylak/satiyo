import type { CategoryNode } from "../category-types";
import { CONDITION } from "../category-types";

// İş & Sanayi alt ağacı. Tüm id'ler global benzersiz (is-* / *-ekipman gibi spesifik).
export const business: CategoryNode[] = [
  { id: "is-sanayi", slug: "is-sanayi", name: "İş & Sanayi", icon: "🔧", parentId: null },

  {
    id: "is-makineleri", slug: "is-makineleri", name: "İş Makineleri", icon: "🏗️", parentId: "is-sanayi",
    attributes: [
      { key: "type", label: "Tip", type: "select", required: true, options: ["Forklift", "Vinç", "Jeneratör", "Kompresör", "Kaynak Makinesi", "Diğer"] },
      { key: "brand", label: "Marka", type: "select", options: ["Caterpillar", "Komatsu", "JCB", "Hidromek", "Hyundai", "Bobcat", "Still", "Linde", "Toyota", "Atlas Copco", "Diğer"] },
      { key: "workingHours", label: "Çalışma Saati", type: "number", unit: "saat" },
      { key: "fuel", label: "Yakıt / Güç", type: "select", options: ["Dizel", "Elektrik", "LPG", "Benzin", "Diğer"] },
      CONDITION,
    ],
  },

  {
    id: "hirdavat-nalburiye", slug: "hirdavat-nalburiye", name: "Hırdavat & Nalburiye", icon: "🔩", parentId: "is-sanayi",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["El Aleti", "Elektrikli El Aleti", "Bağlantı Elemanı (Vida/Cıvata)", "Boya & Kimyasal", "Kesici & Aşındırıcı", "Ölçüm Aleti", "Diğer"] },
      { key: "brand", label: "Marka", type: "select", options: ["Bosch", "Makita", "DeWalt", "Stanley", "Ceta Form", "İzeltaş", "Milwaukee", "Metabo", "Hilti", "Diğer"] },
      { key: "power", label: "Güç Kaynağı", type: "select", options: ["Kablolu", "Akülü", "Manuel", "Pnömatik"] },
      CONDITION,
    ],
  },

  {
    id: "elektrik-malzemeleri", slug: "elektrik-malzemeleri", name: "Elektrik Malzemeleri", icon: "💡", parentId: "is-sanayi",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Kablo", "Şalt Malzemesi", "Priz & Anahtar", "Aydınlatma", "Pano & Kofre", "Sigorta", "Trafo", "Diğer"] },
      { key: "brand", label: "Marka", type: "select", options: ["Schneider", "Legrand", "Siemens", "ABB", "Viko", "Makel", "Nexans", "Diğer"] },
      { key: "voltage", label: "Gerilim", type: "select", options: ["220V (Monofaze)", "380V (Trifaze)", "Düşük Gerilim", "Diğer"] },
      CONDITION,
    ],
  },

  {
    id: "ofis-mobilya", slug: "ofis-mobilya", name: "Ofis Mobilyası", icon: "🪑", parentId: "is-sanayi",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Ofis Masası", "Ofis Koltuğu", "Toplantı Masası", "Dolap & Arşiv", "Sehpa", "Bölme & Paravan", "Diğer"] },
      { key: "material", label: "Malzeme", type: "select", options: ["Ahşap", "Metal", "MDF / Laminat", "Cam", "Karışık"] },
      CONDITION,
    ],
  },

  {
    id: "ticari-ekipman", slug: "ticari-ekipman", name: "Ticari Ekipman", icon: "🏪", parentId: "is-sanayi",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Yazarkasa & POS", "Vitrin & Reyon", "Ticari Soğutucu / Dolap", "Terazi", "Barkod & Etiket", "Endüstriyel Mutfak", "Diğer"] },
      { key: "brand", label: "Marka", type: "text" },
      CONDITION,
    ],
  },

  {
    id: "tarim-hayvancilik-ekipman", slug: "tarim-hayvancilik-ekipman", name: "Tarım & Hayvancılık Ekipmanı", icon: "🚜", parentId: "is-sanayi",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Traktör", "Biçerdöver", "Pulluk & Toprak İşleme", "Sulama Sistemi", "Süt Sağım Makinesi", "Kümes / Ahır Ekipmanı", "Diğer"] },
      { key: "brand", label: "Marka", type: "select", options: ["John Deere", "Massey Ferguson", "New Holland", "Case IH", "Fendt", "Türk Traktör", "Başak", "Diğer"] },
      CONDITION,
    ],
  },

  {
    id: "guvenlik-sistemleri", slug: "guvenlik-sistemleri", name: "Güvenlik Sistemleri", icon: "📹", parentId: "is-sanayi",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["Güvenlik Kamerası", "Alarm Sistemi", "Geçiş Kontrol", "Yangın Algılama", "Kayıt Cihazı (DVR/NVR)", "İnterkom & Diafon", "Diğer"] },
      { key: "brand", label: "Marka", type: "select", options: ["Hikvision", "Dahua", "Bosch", "Axis", "Honeywell", "Reolink", "Diğer"] },
      CONDITION,
    ],
  },

  {
    id: "endustriyel-urunler", slug: "endustriyel-urunler", name: "Endüstriyel Ürünler", icon: "⚙️", parentId: "is-sanayi",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["CNC Tezgahı", "Torna & Freze", "Pompa & Motor", "Konveyör & Bant", "Rulman & Yatak", "Hidrolik / Pnömatik", "Diğer"] },
      { key: "brand", label: "Marka", type: "text" },
      CONDITION,
    ],
  },

  {
    id: "insaat-yapi", slug: "insaat-yapi", name: "İnşaat & Yapı", icon: "🧱", parentId: "is-sanayi",
    attributes: [
      { key: "type", label: "Tür", type: "select", required: true, options: ["İskele & Kalıp", "Yapı Malzemesi", "İzolasyon", "Seramik & Fayans", "Kapı & Pencere", "Beton & Agrega Ekipmanı", "Diğer"] },
      { key: "brand", label: "Marka", type: "text" },
      CONDITION,
    ],
  },
];
