import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Providers } from "@/lib/providers";
import { SplashIntro } from "@/components/SplashIntro";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Providers>
        <SplashIntro />
        <StatusBar style="auto" />
        <Stack
          screenOptions={{
            headerTitleStyle: { fontWeight: "800" },
            headerBackTitle: "Geri",
            headerBackButtonDisplayMode: "minimal",
            headerTintColor: "#0d9488",
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="ilan/[id]" options={{ title: "İlan" }} />
          <Stack.Screen name="satici/[id]" options={{ title: "Satıcı" }} />
          <Stack.Screen name="giris" options={{ title: "Giriş", presentation: "modal" }} />
          <Stack.Screen name="ilan-ver" options={{ title: "İlan Ver", presentation: "modal" }} />
          <Stack.Screen name="sohbet/[id]" options={{ title: "Sohbet" }} />
          <Stack.Screen name="bildirimler" options={{ title: "Bildirimler" }} />
          <Stack.Screen name="ilanlarim" options={{ title: "İlanlarım" }} />
        </Stack>
      </Providers>
    </SafeAreaProvider>
  );
}
