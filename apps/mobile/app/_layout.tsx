import { Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Providers } from "@/lib/providers";
import { SplashIntro } from "@/components/SplashIntro";
import { LocationGate } from "@/components/LocationGate";
import { VersionGate } from "@/components/VersionGate";
import { track } from "@/lib/analytics";
import { useOtaUpdates } from "@/lib/ota";
import { useAuth } from "@/lib/auth";
import { usePushNotifications } from "@/lib/push";

// Oturum açıkken push token'ı kaydeder + bildirime dokununca yönlendirir.
// Providers (AuthProvider) içinde render edilmeli.
function PushRegistrar() {
  const { user } = useAuth();
  usePushNotifications(user);
  return null;
}

// Uygulama açılışı + ekran görüntüleme olaylarını birinci-parti analytics'e gönderir.
function AnalyticsTracker() {
  const pathname = usePathname();
  const opened = useRef(false);
  useEffect(() => {
    if (!opened.current) {
      opened.current = true;
      track("app_open");
    }
    track("screen_view", { path: pathname });
  }, [pathname]);
  return null;
}

export default function RootLayout() {
  useOtaUpdates();
  return (
    <SafeAreaProvider>
      <Providers>
        <AnalyticsTracker />
        <PushRegistrar />
        <SplashIntro />
        <LocationGate />
        <StatusBar style="auto" />
        <VersionGate>
        <Stack
          screenOptions={{
            headerTitleStyle: { fontWeight: "800" },
            headerBackTitle: "Geri",
            headerBackButtonDisplayMode: "minimal",
            headerTintColor: "#0d9488",
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="giris" options={{ title: "Giriş", presentation: "modal" }} />
          <Stack.Screen name="ilan-ver" options={{ title: "İlan Ver", presentation: "modal" }} />
          <Stack.Screen name="filtrele" options={{ title: "Filtrele", presentation: "modal" }} />
          <Stack.Screen name="sohbet/[id]" options={{ title: "Sohbet" }} />
          <Stack.Screen name="bildirimler" options={{ title: "Bildirimler" }} />
          <Stack.Screen name="ilanlarim" options={{ title: "İlanlarım" }} />
          <Stack.Screen name="magaza-basvuru" options={{ title: "Mağaza Başvurusu" }} />
          <Stack.Screen name="kayitli-aramalar" options={{ title: "Kayıtlı Aramalarım" }} />
          <Stack.Screen name="engellenenler" options={{ title: "Engellenen Kullanıcılar" }} />
        </Stack>
        </VersionGate>
      </Providers>
    </SafeAreaProvider>
  );
}
