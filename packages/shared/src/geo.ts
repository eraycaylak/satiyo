/** TR 81 il yaklaşık koordinatları — il-merkezi tabanlı konum/mesafe için (tam adres yok). */
import { foldTr } from "./search";

// Anahtarlar foldTr(il adı) ile eşleşir (ç→c, ğ→g, ı→i, ö→o, ş→s, ü→u, aksan yok).
export const TR_CITY_COORDS: Record<string, [number, number]> = {
  adana: [37.0, 35.3213], adiyaman: [37.7636, 38.2773], afyonkarahisar: [38.7638, 30.5403],
  agri: [39.7191, 43.0503], aksaray: [38.3687, 34.037], amasya: [40.6499, 35.8353],
  ankara: [39.9334, 32.8597], antalya: [36.8969, 30.7133], ardahan: [41.1105, 42.7022],
  artvin: [41.1828, 41.8183], aydin: [37.856, 27.8416], balikesir: [39.6484, 27.8826],
  bartin: [41.6344, 32.3375], batman: [37.8812, 41.1351], bayburt: [40.2552, 40.2249],
  bilecik: [40.1426, 29.9793], bingol: [38.8847, 40.4966], bitlis: [38.4938, 42.1232],
  bolu: [40.576, 31.5788], burdur: [37.7203, 30.2908], bursa: [40.1885, 29.061],
  canakkale: [40.1553, 26.4142], cankiri: [40.6013, 33.6134], corum: [40.5506, 34.9556],
  denizli: [37.7765, 29.0864], diyarbakir: [37.9144, 40.2306], duzce: [40.8438, 31.1565],
  edirne: [41.6771, 26.5557], elazig: [38.681, 39.2264], erzincan: [39.75, 39.5],
  erzurum: [39.9, 41.27], eskisehir: [39.7767, 30.5206], gaziantep: [37.0662, 37.3833],
  giresun: [40.9128, 38.3895], gumushane: [40.4386, 39.5086], hakkari: [37.5744, 43.7408],
  hatay: [36.2027, 36.16], igdir: [39.9237, 44.045], isparta: [37.7648, 30.5566],
  istanbul: [41.0082, 28.9784], izmir: [38.4237, 27.1428], kahramanmaras: [37.5858, 36.9371],
  karabuk: [41.2061, 32.6204], karaman: [37.1759, 33.2287], kars: [40.6167, 43.1],
  kastamonu: [41.3887, 33.7827], kayseri: [38.7312, 35.4787], kirikkale: [39.8468, 33.5153],
  kirklareli: [41.7333, 27.2167], kirsehir: [39.1425, 34.1709], kilis: [36.7184, 37.1212],
  kocaeli: [40.8533, 29.8815], konya: [37.8714, 32.4846], kutahya: [39.42, 29.9833],
  malatya: [38.3552, 38.3095], manisa: [38.6191, 27.4289], mardin: [37.3212, 40.7245],
  mersin: [36.8121, 34.6415], mugla: [37.2153, 28.3636], mus: [38.7432, 41.4906],
  nevsehir: [38.6939, 34.6857], nigde: [37.9667, 34.6833], ordu: [40.9839, 37.8764],
  osmaniye: [37.0742, 36.2467], rize: [41.0201, 40.5234], sakarya: [40.7569, 30.3783],
  samsun: [41.2867, 36.33], siirt: [37.9333, 41.95], sinop: [42.0231, 35.1531],
  sivas: [39.7477, 37.0179], sanliurfa: [37.1591, 38.7969], sirnak: [37.5164, 42.4611],
  tekirdag: [40.9833, 27.5167], tokat: [40.3167, 36.5544], trabzon: [41.0015, 39.7178],
  tunceli: [39.1079, 39.5401], usak: [38.6823, 29.4082], van: [38.4891, 43.4089],
  yalova: [40.65, 29.2667], yozgat: [39.8181, 34.8147], zonguldak: [41.4564, 31.7987],
};

/** Şehir adından yaklaşık koordinat (bilinmeyen şehir → null). */
export function cityToCoords(city?: string | null): [number, number] | null {
  if (!city) return null;
  return TR_CITY_COORDS[foldTr(city)] ?? null;
}

/** Aynı şehirdeki ilanların üst üste binmemesi için deterministik küçük kaydırma. */
export function jitter(coords: [number, number], seed: string): [number, number] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const dx = ((h % 1000) / 1000 - 0.5) * 0.08;
  const dy = (((h >> 10) % 1000) / 1000 - 0.5) * 0.08;
  return [coords[0] + dy, coords[1] + dx];
}

/** İki koordinat arası büyük-daire mesafesi (km). */
export function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** İki şehir arası yaklaşık mesafe (km) — ikisi de bilinmiyorsa null. */
export function cityDistanceKm(a?: string | null, b?: string | null): number | null {
  const ca = cityToCoords(a);
  const cb = cityToCoords(b);
  if (!ca || !cb) return null;
  return haversineKm(ca, cb);
}
