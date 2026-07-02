// Çok sayıda örnek ilan üretir (geliştirme). Çıktı: SQL → wrangler d1 execute ile uygulanır.
// Görseller loremflickr (kategori anahtarlı gerçek fotoğraflar) — kredi harcamaz.
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";

function foldTr(s) {
  return s.toLocaleLowerCase("tr-TR")
    .replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i")
    .replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u")
    .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}
const q = (s) => (s == null ? "NULL" : `'${String(s).replace(/'/g, "''")}'`);
const pick = (arr, i) => arr[i % arr.length];

// İlan başlığından konuyla-alakalı görsel anahtarı (loremflickr için)
const KW_MAP = [
  ["iphone", "iphone"], ["samsung", "samsung,phone"], ["xiaomi", "xiaomi,smartphone"], ["huawei", "huawei,smartphone"], ["oppo", "smartphone"],
  ["macbook", "macbook"], ["lenovo", "laptop"], ["asus rog", "gaming,laptop"], ["dell", "laptop"], ["ram", "computer,ram"], ["rtx", "graphics,card,gpu"], ["hp pavilion", "laptop"], ["monster", "gaming,laptop"],
  ["golf", "volkswagen,car"], ["clio", "renault,car"], ["egea", "fiat,car"], ["bmw", "bmw,car"], ["corolla", "toyota,car"], ["civic", "honda,car"], ["focus", "ford,car"], ["astra", "opel,car"],
  ["buzdolab", "refrigerator"], ["çamaşır", "washing,machine"], ["bulaşık", "dishwasher"], ["fırın", "oven"],
  ["koltuk", "sofa"], ["kanepe", "couch"], ["masa", "dining,table"], ["gardırop", "wardrobe"], ["tv ünite", "tv,stand"], ["berjer", "armchair"], ["yatak", "bed"],
  ["ayakkab", "sneakers"], ["ceket", "leather,jacket"], ["elbise", "dress"], ["mont", "winter,coat"], ["eşofman", "tracksuit"], ["saat", "wristwatch"], ["gözlük", "sunglasses"],
  ["bisiklet", "bicycle"], ["playstation", "playstation"], ["gitar", "acoustic,guitar"], ["xbox", "xbox"], ["çadır", "camping,tent"], ["drone", "drone"], ["raket", "tennis,racket"],
  ["arabası", "baby,stroller"], ["mama sandalye", "high,chair"], ["oyun parkı", "playpen"], ["beşik", "baby,crib"], ["puset", "stroller"], ["ana kucağı", "baby,bouncer"],
];
function imgKeyword(baseTitle, fallback) {
  const t = baseTitle.toLocaleLowerCase("tr-TR");
  for (const [needle, kw] of KW_MAP) if (t.includes(needle)) return kw;
  return fallback;
}

const CITIES = [
  ["İstanbul", "Kadıköy"], ["Ankara", "Çankaya"], ["İzmir", "Bornova"], ["Bursa", "Nilüfer"],
  ["Antalya", "Muratpaşa"], ["Adana", "Seyhan"], ["Konya", "Selçuklu"], ["Gaziantep", "Şahinbey"],
  ["Kayseri", "Melikgazi"], ["Mersin", "Yenişehir"], ["Eskişehir", "Odunpazarı"], ["Samsun", "Atakum"],
  ["Denizli", "Pamukkale"], ["Trabzon", "Ortahisar"],
];

const CATS = [
  { id: "telefon", kw: "smartphone", titles: ["iPhone 13 128 GB", "iPhone 14 Pro", "Samsung Galaxy S23", "Xiaomi Redmi Note 12", "Huawei P40 Lite", "iPhone 11 64 GB", "Samsung A54", "Oppo Reno 8"], attrs: { brand: ["Apple","Samsung","Xiaomi","Huawei","Oppo"], storage: ["64 GB","128 GB","256 GB"], condition: ["İyi","Yeni gibi","Sıfır"] }, price: [400000, 4500000] },
  { id: "bilgisayar", kw: "laptop", titles: ["MacBook Air M1", "Lenovo ThinkPad", "Asus ROG Gaming", "Dell XPS 13", "16 GB DDR4 RAM", "Nvidia RTX 3060", "HP Pavilion", "Monster Abra"], attrs: { type: ["Dizüstü","Masaüstü","Bileşen"], ram: ["8 GB","16 GB","32 GB"], condition: ["İyi","Yeni gibi"] }, price: [90000, 6000000] },
  { id: "otomobil", kw: "car", titles: ["Volkswagen Golf 1.6 TDI", "Renault Clio", "Fiat Egea 2020", "BMW 3.20i", "Toyota Corolla Hybrid", "Honda Civic", "Ford Focus", "Opel Astra"], attrs: { brand: ["Volkswagen","Renault","Fiat","BMW","Toyota"], year: ["2016","2018","2020","2022"], fuel: ["Benzin","Dizel","Hibrit"], gear: ["Manuel","Otomatik"] }, price: [50000000, 250000000] },
  { id: "beyaz-esya", kw: "refrigerator", titles: ["Arçelik No-Frost Buzdolabı", "Bosch Çamaşır Makinesi", "Siemens Bulaşık Makinesi", "Samsung Buzdolabı", "Beko Fırın", "Vestel Çamaşır Makinesi"], attrs: { type: ["Buzdolabı","Çamaşır Makinesi","Bulaşık Makinesi","Fırın"], brand: ["Arçelik","Bosch","Siemens","Beko"], condition: ["İyi","Yeni gibi"] }, price: [300000, 2500000] },
  { id: "mobilya", kw: "sofa", titles: ["Deri Koltuk Takımı", "Çekyat Kanepe", "Yemek Masası 6 Kişilik", "Gardırop", "Tv Ünitesi", "Berjer Koltuk", "Yatak Odası Takımı"], attrs: { type: ["Koltuk","Yatak","Masa","Dolap"], condition: ["İyi","Yeni gibi","Orta"] }, price: [150000, 3000000] },
  { id: "moda", kw: "clothing", titles: ["Nike Spor Ayakkabı", "Deri Ceket", "Zara Elbise", "Kışlık Mont", "Adidas Eşofman", "Kol Saati", "Güneş Gözlüğü"], attrs: {}, price: [20000, 500000] },
  { id: "hobi", kw: "bicycle", titles: ["Trek Dağ Bisikleti", "PlayStation 5 Slim", "Akustik Gitar", "Xbox Series S", "Kamp Çadırı", "Drone DJI Mini", "Tenis Raketi"], attrs: {}, price: [80000, 2000000] },
  { id: "bebek", kw: "stroller", titles: ["Chicco Bebek Arabası", "Mama Sandalyesi", "Oyun Parkı", "Bebek Beşiği", "Puset", "Ana Kucağı"], attrs: {}, price: [30000, 600000] },
];

const SELLERS = ["usr_seed1", "usr_seed2"];
const NOW = 1718500000000;

let listings = [], images = [], fts = [], attrs = [];
let n = 0;
const target = 180;
let idx = 0;
const counts = {};
while (n < target) {
  for (const cat of CATS) {
    if (n >= target) break;
    // kategori-içi sayaç — her kategori kendi başlıklarını sırayla dolaşsın
    const ci = counts[cat.id] = (counts[cat.id] ?? -1) + 1;
    const id = "lst_big_" + randomUUID().replace(/-/g, "").slice(0, 16);
    const baseTitle = pick(cat.titles, ci);
    const title = baseTitle + (ci % 3 === 0 ? " - Temiz" : ci % 3 === 1 ? " Sahibinden" : "");
    const [city, district] = pick(CITIES, n);
    const seller = pick(SELLERS, n);
    const price = Math.round((cat.price[0] + Math.random() * (cat.price[1] - cat.price[0])) / 1000) * 1000;
    const ptype = n % 4 === 0 ? "negotiable" : "fixed";
    const created = NOW - n * 3_600_000;
    const desc = `${baseTitle} satılık. Az kullanılmış, bakımlı. ${city} içinde elden teslim.`;

    // öznitelikler
    const attrPairs = {};
    for (const [k, vals] of Object.entries(cat.attrs)) attrPairs[k] = pick(vals, ci + k.length);

    listings.push(`('${id}','${seller}',${q(title)},${q(desc)},'${cat.id}',${price},'${ptype}','used',${q(city)},${q(district)},'active',${Math.floor(Math.random()*200)},${created},${created})`);
    // 1-3 görsel (loremflickr kategori anahtarlı)
    const imgCount = 1 + (idx % 3);
    const kw = imgKeyword(baseTitle, cat.kw);
    for (let p = 0; p < imgCount; p++) {
      const url = `https://loremflickr.com/640/480/${kw}?lock=${(n * 7 + p) % 900 + 1}`;
      images.push(`('${randomUUID().replace(/-/g,"").slice(0,16)}','${id}',${q(url)},${p},NULL)`);
    }
    const body = foldTr(`${cat.id} ${Object.values(attrPairs).join(" ")} ${desc}`);
    fts.push(`('${id}',${q(foldTr(title))},${q(body)})`);
    for (const [k, v] of Object.entries(attrPairs)) attrs.push(`('${id}',${q(k)},${q(v)})`);
    n++; idx++;
  }
}

const sql = [
  "DELETE FROM listing_attributes WHERE listing_id LIKE 'lst_big_%';",
  "DELETE FROM listing_images WHERE listing_id LIKE 'lst_big_%';",
  "DELETE FROM listings_fts WHERE listing_id LIKE 'lst_big_%';",
  "DELETE FROM listings WHERE id LIKE 'lst_big_%';",
  `INSERT INTO listings (id,seller_id,title,description,category_id,price,price_type,condition,city,district,status,view_count,created_at,updated_at) VALUES\n${listings.join(",\n")};`,
  `INSERT INTO listing_images (id,listing_id,url,position,blurhash) VALUES\n${images.join(",\n")};`,
  `INSERT INTO listings_fts (listing_id,title,body) VALUES\n${fts.join(",\n")};`,
  attrs.length ? `INSERT INTO listing_attributes (listing_id,key,value) VALUES\n${attrs.join(",\n")};` : "",
].join("\n\n");

writeFileSync("/tmp/satiyo-bigseed.sql", sql);
console.log(`${n} ilan, ${images.length} görsel, ${attrs.length} öznitelik → /tmp/satiyo-bigseed.sql`);
