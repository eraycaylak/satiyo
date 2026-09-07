import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/theme";

// Vektör ikonlar (Ionicons) — emoji'nin aksine tabBarActiveTintColor/InactiveTintColor
// ile markaya tint alır ve her boyutta net görünür.
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
      <Tabs.Screen
        name="(home)"
        options={{ title: "Keşfet", headerShown: false, tabBarIcon: ({ color, size }) => <Ionicons name="search" size={size} color={color} /> }}
        listeners={({ navigation }) => ({
          // Keşfet'e basınca detay stack'inden feed köküne dön. Bazı cihazlarda default
          // pop-to-top tutmuyordu → sekme odaktayken açıkça index'e git (deterministik).
          tabPress: (e) => {
            if (navigation.isFocused()) {
              e.preventDefault();
              navigation.navigate("(home)", { screen: "index" });
            }
          },
        })}
      />
      <Tabs.Screen name="favoriler" options={{ title: "Favoriler", tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "heart" : "heart-outline"} size={size} color={color} /> }} />
      <Tabs.Screen
        name="satis"
        options={{ title: "İlan Ver", tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" size={size + 4} color={color} /> }}
        listeners={{ tabPress: (e) => { e.preventDefault(); router.push("/ilan-ver"); } }}
      />
      <Tabs.Screen name="mesajlar" options={{ title: "Mesajlar", tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"} size={size} color={color} /> }} />
      <Tabs.Screen name="profil" options={{ title: "Profil", tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "person" : "person-outline"} size={size} color={color} /> }} />
    </Tabs>
  );
}
