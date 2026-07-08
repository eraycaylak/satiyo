import { Alert, FlatList, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/client";
import { useAuth } from "@/lib/auth";
import { radius, space, useTheme } from "@/lib/theme";
import { Empty, Loading } from "@/components/ui";

export default function BlockedUsersScreen() {
  const t = useTheme();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ["blocked-users"], queryFn: () => api.blockedUsers(), enabled: !!user });

  async function unblock(id: string) {
    try {
      await api.unblockUser(id);
      qc.invalidateQueries({ queryKey: ["blocked-users"] });
      qc.invalidateQueries({ queryKey: ["listings"] });
      qc.invalidateQueries({ queryKey: ["recommendations"] });
    } catch (e) { Alert.alert("Hata", (e as Error).message); }
  }

  if (isLoading) return <Loading />;
  if (!data || data.length === 0) return <Empty icon="shield-checkmark-outline" text="Engellediğin kimse yok." />;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: t.bg }}
      data={data} keyExtractor={(u) => u.id}
      contentContainerStyle={{ padding: space.lg, gap: space.sm }}
      renderItem={({ item: u }) => (
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: radius.md, padding: space.md }}>
          <View style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: t.surface2, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: t.muted, fontWeight: "800", fontSize: 16 }}>{(u.name || "?").charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={{ flex: 1, fontWeight: "700", color: t.text }} numberOfLines={1}>{u.name || "Kullanıcı"}</Text>
          <Pressable onPress={() => Alert.alert("Engeli kaldır", `${u.name || "Bu kullanıcı"} tekrar seninle mesajlaşabilir ve ilanları görünür olur.`, [
            { text: "Vazgeç", style: "cancel" },
            { text: "Kaldır", onPress: () => unblock(u.id) },
          ])} style={{ borderWidth: 1, borderColor: t.border, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 }}>
            <Text style={{ color: t.text, fontSize: 13, fontWeight: "600" }}>Engeli kaldır</Text>
          </Pressable>
        </View>
      )}
    />
  );
}
