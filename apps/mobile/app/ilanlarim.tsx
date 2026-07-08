import { Alert, FlatList, Image, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/client";
import { useAuth } from "@/lib/auth";
import { radius, space, useTheme } from "@/lib/theme";
import { formatPrice, timeAgo } from "@/lib/format";
import { Badge, Empty, Loading } from "@/components/ui";

const statusLabel: Record<string, string> = { active: "Yayında", reserved: "Rezerve", sold: "Satıldı", draft: "Taslak" };

export default function MyListingsScreen() {
  const t = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ["my-listings"], queryFn: () => api.myListings(), enabled: !!user });

  async function remove(id: string) {
    Alert.alert("İlanı kaldır", "Emin misin?", [
      { text: "Vazgeç", style: "cancel" },
      { text: "Kaldır", style: "destructive", onPress: async () => { await api.deleteListing(id); qc.invalidateQueries({ queryKey: ["my-listings"] }); } },
    ]);
  }

  if (isLoading) return <Loading />;
  if (!data || data.items.length === 0) return <Empty text="Henüz ilanın yok." />;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: t.bg }}
      data={data.items} keyExtractor={(l) => l.id}
      contentContainerStyle={{ padding: space.lg, gap: space.sm }}
      renderItem={({ item: l }) => (
        <View style={{ flexDirection: "row", gap: space.md, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: radius.lg, padding: space.md }}>
          <Pressable onPress={() => router.push(`/ilan/${l.id}`)} style={{ width: 64, height: 64, borderRadius: radius.md, overflow: "hidden", backgroundColor: t.surface2 }}>
            {l.images[0] ? <Image source={{ uri: l.images[0].url }} style={{ width: "100%", height: "100%" }} /> :
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><Ionicons name="image-outline" size={24} color={t.muted} /></View>}
          </Pressable>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ fontWeight: "700", color: t.text }} numberOfLines={1}>{l.title}</Text>
            <Text style={{ fontWeight: "800", color: t.text }}>{formatPrice(l.price, l.priceType)}</Text>
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              <Badge label={statusLabel[l.status]!} />
              <Text style={{ color: t.muted, fontSize: 11 }}><Ionicons name="eye-outline" size={11} color={t.muted} /> {l.viewCount} · {timeAgo(l.createdAt)}</Text>
            </View>
          </View>
          <Pressable onPress={() => remove(l.id)} hitSlop={8}><Text style={{ color: t.danger }}>Kaldır</Text></Pressable>
        </View>
      )}
    />
  );
}
