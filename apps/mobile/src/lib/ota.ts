import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import * as Updates from "expo-updates";

/**
 * OTA güncellemelerini hızlı uygular. Açılıştaki kontrol expo-updates'in kendi
 * ON_LOAD davranışıyla yapılır; bu kanca kullanıcı uygulamaya GERİ DÖNDÜĞÜNDE
 * (arka plandan öne) yeni bir güncelleme yayınlanmışsa indirir ve sessizce yeniden
 * başlatır — böylece kullanıcı düzeltmeyi aynı gün alır, uygulamayı tamamen
 * kapatıp açmasını beklemeyiz.
 *
 * Yalnızca gerçek (embedded expo-updates) build'lerde çalışır; Expo Go / dev
 * client'ta `Updates.isEnabled` false olduğu için hiçbir şey yapmaz.
 */
export function useOtaUpdates(): void {
  const busy = useRef(false);

  useEffect(() => {
    if (!Updates.isEnabled) return;

    async function checkAndApply(): Promise<void> {
      if (busy.current) return;
      busy.current = true;
      try {
        const res = await Updates.checkForUpdateAsync();
        if (res.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch {
        // Sessiz: ağ yok / güncelleme yok — uygulama normal çalışmaya devam eder.
      } finally {
        busy.current = false;
      }
    }

    const sub = AppState.addEventListener("change", (s: AppStateStatus) => {
      if (s === "active") void checkAndApply();
    });
    return () => sub.remove();
  }, []);
}
