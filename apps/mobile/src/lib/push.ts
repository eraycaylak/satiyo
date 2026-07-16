import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { api } from "./client";

// Uygulama ön plandayken de banner + ses + rozet göster (SDK 52 alanlarını da içerir).
// try/catch ile sarılı: native bildirim modülü bir şekilde yoksa (ör. OTA JS'i eski
// binary'ye düşerse) modül yüklenirken çökmemek için — uygulama açılışı asla bu
// yüzden patlamamalı.
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch {
  // sessiz — bildirim özelliği devre dışı kalır ama uygulama açılır
}

// Bu cihazın backend'e kayıtlı olan Expo push token'ı (çıkışta silmek için tutulur).
let currentToken: string | null = null;

function resolveProjectId(): string | undefined {
  return (
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
    (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId
  );
}

/** İzin ister, Expo push token alır ve backend'e kaydeder. Simülatörde/izin yoksa sessizce null döner. */
export async function registerPushToken(): Promise<string | null> {
  // Push yalnızca gerçek cihazda çalışır (simülatör/emülatör desteklemez).
  if (!Device.isDevice) return null;

  const settings = await Notifications.getPermissionsAsync();
  let granted = settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  if (!granted && settings.canAskAgain) {
    const req = await Notifications.requestPermissionsAsync();
    granted = req.granted || req.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  }
  if (!granted) return null;

  // Android bildirim kanalı (kanal olmadan Android'de push gösterilmez).
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Genel bildirimler",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#f0434c",
    });
  }

  try {
    const projectId = resolveProjectId();
    const tokenResp = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    currentToken = tokenResp.data;
    await api.registerPushToken(currentToken, Platform.OS);
    return currentToken;
  } catch {
    // Token alınamadı / ağ hatası → sessizce geç, bir sonraki açılışta tekrar denenir.
    return null;
  }
}

/** Çıkışta bu cihazın token'ını backend'den siler (başka kullanıcıya push gitmesin). */
export async function unregisterPushToken(): Promise<void> {
  if (!currentToken) return;
  try {
    await api.removePushToken(currentToken);
  } catch {
    // yut
  }
  currentToken = null;
}

/**
 * Oturum açıkken push token'ı kaydeder; bildirime dokununca ilgili sohbete/ilana yönlendirir.
 * RootLayout içinde bir kez kullanılır (auth + router context gerektirir).
 */
export function usePushNotifications(user: { id: string } | null): void {
  const router = useRouter();
  const registered = useRef(false);

  // Giriş yapıldığında bir kez kaydol; çıkışta bayrağı sıfırla.
  useEffect(() => {
    if (user && !registered.current) {
      registered.current = true;
      void registerPushToken();
    } else if (!user) {
      registered.current = false;
    }
  }, [user]);

  // Bildirime dokununca yönlendirme (uygulama kapalıyken açılışta da çalışır).
  useEffect(() => {
    function route(data: unknown) {
      const d = (data ?? {}) as { conversationId?: string; listingId?: string };
      if (d.conversationId) router.push(`/sohbet/${d.conversationId}`);
      else if (d.listingId) router.push(`/ilan/${d.listingId}`);
    }

    // Uygulama kapalıyken bildirimle açıldıysa
    void Notifications.getLastNotificationResponseAsync().then((resp) => {
      if (resp) route(resp.notification.request.content.data);
    });

    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      route(resp.notification.request.content.data);
    });
    return () => sub.remove();
  }, [router]);
}
