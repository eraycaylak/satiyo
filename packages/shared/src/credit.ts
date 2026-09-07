/**
 * Kredi paketleri — kredi tek para birimidir (minor = kuruş, 1 TL = 100 kredi).
 * Referans → kredi verir, IAP/iyzico → kredi satın alır, boost → kredi harcar.
 * `creditsMinor` sunucuda güvenle uygulanır (satın alım productId'den map edilir,
 * uygulama miktarı belirleyemez). Apple/iyzico gerçek fiyatı ayrıca belirler.
 */

export interface CreditPackage {
  /** iOS App Store Connect consumable ürün kimliği. */
  productId: string;
  /** Kullanıcıya gösterilen ad. */
  label: string;
  /** Verilecek kredi (minor = kuruş). */
  creditsMinor: number;
  /** Yaklaşık TL fiyatı (UI ipucu; kesin fiyat mağazadan gelir). */
  approxTry: number;
  /** Bonus vurgusu (ör. "%20 bonus"). */
  bonus?: string;
  highlight?: string;
}

/** Tüm platformlarda ortak kredi paketleri. */
export const CREDIT_PACKAGES: CreditPackage[] = [
  { productId: "com.satiyo.credit.t1", label: "50 Kredi", creditsMinor: 5000, approxTry: 49.99 },
  { productId: "com.satiyo.credit.t2", label: "110 Kredi", creditsMinor: 11000, approxTry: 99.99, bonus: "%10 bonus", highlight: "En popüler" },
  { productId: "com.satiyo.credit.t3", label: "300 Kredi", creditsMinor: 30000, approxTry: 249.99, bonus: "%20 bonus", highlight: "En avantajlı" },
];

/** productId → kredi paketi (sunucu doğrulamasında güvenli miktar kaynağı). */
export function getCreditPackage(productId: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((p) => p.productId === productId);
}

/** Tüm iOS ürün kimlikleri (react-native-iap `getProducts` için). */
export const CREDIT_PRODUCT_IDS = CREDIT_PACKAGES.map((p) => p.productId);
