import { Platform } from "react-native";
import { API_BASE, tokenStore } from "./client";

// Birinci-parti analytics: olayları kendi API'mize (POST /events) gönderir.
// Üçüncü-parti SDK yok. Ateşle-unut: ASLA throw etmez, kullanıcı akışını bloklamaz.
export function track(name: string, props?: Record<string, unknown>): void {
  try {
    const token = tokenStore.get();
    void fetch(`${API_BASE}/events`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ name, props, platform: Platform.OS }),
    }).catch(() => {});
  } catch {
    /* analytics hatası uygulamayı etkilemez */
  }
}
