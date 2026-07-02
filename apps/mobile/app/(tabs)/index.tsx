import { useState } from "react";
import { Alert, Dimensions, FlatList, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { getChildren, type SearchFilters, type SortOption } from "@satiyo/shared";
import { api } from "@/lib/client";
import { useAuth } from "@/lib/auth";
import { radius, space, useTheme } from "@/lib/theme";
import { ListingCard } from "@/components/ListingCard";
import { ListingsMap } from "@/components/ListingsMap";
import { Badge, Empty, Loading } from "@/components/ui";

const GAP = space.md;
const SORTS: { v: SortOption; l: string }[] = [
  { v: "relevance", l: "İlgili" }, { v: "newest", l: "En yeni" },
  { v: "price_asc", l: "Artan" }, { v: "price_desc", l: "Azalan" },
];

export default function ExploreScreen() {
  const t = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [sort, setSort] = useState<SortOption>("relevance");
  const [view, setView] = useState<"list" | "map">("list");

  const filters: SearchFilters = { q: submitted || undefined, categoryId, sort, pageSize: 24 };
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["listings", filters],
    queryFn: () => api.search(filters),
    placeholderData: keepPreviousData,
  });

  const cardW = (Dimensions.get("window").width - space.lg * 2 - GAP) / 2;
  const roots = getChildren(null);
  const hasCriteria = !!(submitted || categoryId);
  const browsing = !submitted && !categoryId;

  const { data: reco } = useQuery({
    queryKey: ["recommendations"],
    queryFn: () => api.recommendations(),
    enabled: !!user && browsing,
  });

  async function saveSearch() {
    if (!user) return router.push("/giris");
    try { await api.saveSearch(filters, true); Alert.alert("Kaydedildi 🔔", "Eşleşen yeni ilanlarda haber vereceğiz."); }
    catch (e) { Alert.alert("Hata", (e as Error).message); }
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ padding: space.lg, paddingBottom: space.sm, gap: space.md }}>
        <TextInput
          value={q}
          onChangeText={setQ}
          onSubmitEditing={() => setSubmitted(q.trim())}
          returnKeyType="search"
          placeholder="Ne arıyorsun? (iPhone, koltuk, bisiklet)"
          placeholderTextColor={t.muted}
          style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: radius.md, padding: 12, color: t.text }}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {[{ id: undefined, name: "Tümü", icon: "" }, ...roots].map((c) => {
            const active = categoryId === c.id;
            return (
              <Pressable key={c.id ?? "all"} onPress={() => setCategoryId(c.id)}
                style={{ borderWidth: 1, borderColor: active ? t.brand : t.border, backgroundColor: active ? t.brandSoft : t.surface, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 }}>
                <Text style={{ color: active ? t.brand : t.text, fontWeight: "600", fontSize: 13 }}>{c.icon ? c.icon + " " : ""}{c.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ flex: 1 }}>
            {SORTS.map((s) => (
              <Pressable key={s.v} onPress={() => setSort(s.v)}>
                <Badge label={s.l} tone={sort === s.v ? "brand" : "default"} />
              </Pressable>
            ))}
          </ScrollView>
          {hasCriteria && (
            <Pressable onPress={saveSearch} style={{ borderWidth: 1, borderColor: t.brand, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ color: t.brand, fontSize: 13, fontWeight: "600" }}>🔔 Kaydet</Text>
            </Pressable>
          )}
          <Pressable onPress={() => setView(view === "list" ? "map" : "list")} style={{ borderWidth: 1, borderColor: t.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ color: t.text, fontSize: 13 }}>{view === "list" ? "🗺️" : "☰"}</Text>
          </Pressable>
        </View>
      </View>

      {isLoading ? <Loading /> :
        isError ? <Empty icon="⚠️" text="Bir şeyler ters gitti." /> :
        !data || data.items.length === 0 ? <Empty text={`Sonuç bulunamadı${submitted ? ` — “${submitted}”` : ""}.`} /> :
        view === "map" ? <ListingsMap listings={data.items} /> :
        <FlatList
          data={data.items}
          keyExtractor={(l) => l.id}
          numColumns={2}
          columnWrapperStyle={{ gap: GAP, paddingHorizontal: space.lg }}
          contentContainerStyle={{ gap: GAP, paddingBottom: space.xxl }}
          renderItem={({ item }) => <ListingCard listing={item} width={cardW} />}
          refreshing={isFetching}
          onRefresh={refetch}
          ListHeaderComponent={
            <View>
              {browsing && reco && reco.items.length > 0 && (
                <View style={{ marginBottom: space.sm }}>
                  <Text style={{ paddingHorizontal: space.lg, fontSize: 16, fontWeight: "800", color: t.text, marginBottom: 6 }}>✨ Senin için</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: GAP, paddingHorizontal: space.lg }}>
                    {reco.items.map((l) => <ListingCard key={l.id} listing={l} width={150} />)}
                  </ScrollView>
                </View>
              )}
              <Text style={{ paddingHorizontal: space.lg, paddingVertical: space.sm, color: t.muted }}>{data.total} ilan</Text>
            </View>
          }
        />}
    </View>
  );
}
