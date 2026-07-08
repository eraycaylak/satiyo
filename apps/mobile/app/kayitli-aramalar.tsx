import { Alert, FlatList, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCategory } from "@satiyo/shared";
import { api } from "@/lib/client";
import { useAuth } from "@/lib/auth";
import { radius, space, useTheme } from "@/lib/theme";
import { Empty, Loading } from "@/components/ui";

export default function SavedSearchesScreen() {
  const t = useTheme();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ["saved-searches"], queryFn: () => api.savedSearches(), enabled: !!user });

  async function remove(id: string) {
    try { await api.deleteSavedSearch(id); qc.invalidateQueries({ queryKey: ["saved-searches"] }); }
    catch (e) { Alert.alert("Hata", (e as Error).message); }
  }

  if (isLoading) return <Loading />;
  if (!data || data.length === 0) {
    return <Empty icon="search-outline" text="Kayıtlı araman yok. Keşfet'te bir arama yapıp kaydet, eşleşen ilanlar gelince haber verelim." />;
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: t.bg }}
      data={data} keyExtractor={(s) => s.id}
      contentContainerStyle={{ padding: space.lg, gap: space.sm }}
      renderItem={({ item: s }) => {
        const cat = s.query.categoryId ? getCategory(s.query.categoryId) : undefined;
        const label = s.query.q || cat?.name || "Tüm ilanlar";
        const parts = [s.query.q && cat ? cat.name : null, s.query.city].filter(Boolean) as string[];
        return (
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: radius.md, padding: space.md }}>
            <View style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: "#8b5cf622", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="search" size={20} color="#8b5cf6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700", color: t.text }} numberOfLines={1}>{label}</Text>
              <Text style={{ color: t.muted, fontSize: 12 }}>
                {parts.length ? parts.join(" · ") + " · " : ""}{s.notify ? "Bildirim açık" : "Bildirim kapalı"}
              </Text>
            </View>
            <Pressable hitSlop={10} onPress={() => Alert.alert("Aramayı sil", "Bu kayıtlı arama silinsin mi?", [
              { text: "Vazgeç", style: "cancel" },
              { text: "Sil", style: "destructive", onPress: () => remove(s.id) },
            ])}>
              <Ionicons name="trash-outline" size={18} color={t.danger} />
            </Pressable>
          </View>
        );
      }}
    />
  );
}
