/** Boost (öne çıkarma) paketleri — web + mobil + API ortak. Fiyat kuruş. */

export interface BoostPackage {
  id: string;
  label: string;
  days: number;
  price: number; // kuruş
  urgentBadge: boolean;
  highlight?: string;
}

export const BOOST_PACKAGES: BoostPackage[] = [
  { id: "1g", label: "1 Gün Öne Çıkar", days: 1, price: 1500, urgentBadge: false },
  { id: "7g", label: "7 Gün Öne Çıkar", days: 7, price: 5900, urgentBadge: false, highlight: "En popüler" },
  { id: "acil7", label: "7 Gün + Acil Rozeti", days: 7, price: 9900, urgentBadge: true, highlight: "En hızlı satış" },
];

export function getBoostPackage(id: string): BoostPackage | undefined {
  return BOOST_PACKAGES.find((p) => p.id === id);
}

/** Mağaza/kurumsal üyelik (aylık). Fiyat kuruş. */
export const STORE_MEMBERSHIP = {
  price: 29900,
  label: "Mağaza Üyeliği",
  perks: [
    "Mağaza vitrini ve mağaza rozeti",
    "Sınırsız ilan kotası",
    "Öne çıkan satıcı profili",
    "Gelişmiş istatistikler",
  ],
};
