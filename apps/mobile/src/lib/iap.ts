import { useCallback } from "react";

// react-native-iap native modülü bu build'e DAHİL DEĞİL: uygulama içi satın alma
// (StoreKit / Play Billing) entegrasyonu henüz tamamlanmadı ve modülün eski sürümü
// RN 0.81 ile derlenmiyor. Bu yüzden kredi ekranı "yakında" mesajı gösterir
// (available:false). IAP tamamlanınca burası gerçek react-native-iap ile değiştirilecek;
// tüketen arayüz (useCredits dönüşü) aynı kalsın diye şekil korunuyor.
export const IAP_AVAILABLE = false;

interface CreditProduct {
  productId: string;
  localizedPrice: string;
}

/**
 * Kredi satın alma kancası — şu an devre dışı. Native IAP modülü olmadığından
 * available:false döner (kredi ekranı uygun mesajı gösterir); buy çağrılırsa hata fırlatır.
 */
export function useCredits(): {
  products: CreditProduct[];
  loading: boolean;
  purchasing: string | null;
  buy: (sku: string) => Promise<number>;
  available: boolean;
} {
  const buy = useCallback(async (_sku: string): Promise<number> => {
    throw new Error("Kredi yükleme bu sürümde kullanılamaz");
  }, []);
  return { products: [], loading: false, purchasing: null, buy, available: IAP_AVAILABLE };
}
