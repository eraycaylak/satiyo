import { Stack } from "expo-router";
import { useTheme } from "@/lib/theme";

// Keşfet sekmesinin kendi Stack'i: index + ilan/[id] + satici/[id].
// Böylece detay ekranlarında alt tab bar görünür kalır ve Keşfet sekmesine
// basınca stack köke (ilan listesine) pop eder.
export default function HomeStackLayout() {
  const t = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: t.surface },
        headerTitleStyle: { color: t.text, fontWeight: "800" },
        headerTintColor: t.brand,
        headerBackTitle: "Geri",
        headerBackButtonDisplayMode: "minimal",
      }}
    >
      {/* Keşfet: navigator başlığı yok — logo + arama + konum + filtre tek kompakt satırda (ekranın kendi header'ı) */}
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="ilan/[id]" options={{ title: "İlan" }} />
      <Stack.Screen name="satici/[id]" options={{ title: "Satıcı" }} />
    </Stack>
  );
}
