import { Tabs, useRouter } from "expo-router";
import { Text } from "react-native";
import { useTheme } from "@/lib/theme";

function Icon({ emoji, color }: { emoji: string; color: string }) {
  return <Text style={{ fontSize: 22, color }}>{emoji}</Text>;
}

export default function TabsLayout() {
  const t = useTheme();
  const router = useRouter();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: t.brand,
        tabBarInactiveTintColor: t.muted,
        tabBarStyle: { backgroundColor: t.surface, borderTopColor: t.border },
        headerStyle: { backgroundColor: t.surface },
        headerTitleStyle: { color: t.text, fontWeight: "800" },
        headerTintColor: t.text,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Keşfet", tabBarIcon: ({ color }) => <Icon emoji="🔍" color={color} /> }} />
      <Tabs.Screen name="favoriler" options={{ title: "Favoriler", tabBarIcon: ({ color }) => <Icon emoji="♥" color={color} /> }} />
      <Tabs.Screen
        name="satis"
        options={{ title: "İlan Ver", tabBarIcon: ({ color }) => <Icon emoji="➕" color={color} /> }}
        listeners={{ tabPress: (e) => { e.preventDefault(); router.push("/ilan-ver"); } }}
      />
      <Tabs.Screen name="mesajlar" options={{ title: "Mesajlar", tabBarIcon: ({ color }) => <Icon emoji="✉️" color={color} /> }} />
      <Tabs.Screen name="profil" options={{ title: "Profil", tabBarIcon: ({ color }) => <Icon emoji="👤" color={color} /> }} />
    </Tabs>
  );
}
