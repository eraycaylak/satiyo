import { useEffect, useState, type ComponentProps } from "react";
import { Alert, Dimensions, FlatList, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { cityToCoords, getChildren, type SearchFilters, type SortOption } from "@satiyo/shared";
import { api } from "@/lib/client";
import { track } from "@/lib/analytics";
import { useAuth } from "@/lib/auth";
import { radius, space, useTheme } from "@/lib/theme";
import { ListingCard } from "@/components/ListingCard";
import { ListingsMap } from "@/components/ListingsMap";
import { CityPicker } from "@/components/CityPicker";
import { detectLocation } from "@/lib/location";
import { Badge, Empty, Loading } from "@/components/ui";

const GAP = space.md;
const SORTS: { v: SortOption; l: string }[] = [
  { v: "relevance", l: "İlgili" }, { v: "newest", l: "En yeni" },
  { v: "nearest", l: "Yakınımdakiler" },
  { v: "price_asc", l: "Artan" }, { v: "price_desc", l: "Azalan" },
];

// Kategori kimliği → renkli-daire vektör ikon (letgo tarzı). Paylaşılan
// categories.ts'in emoji `icon` alanına DOKUNULMAZ (web onu kullanır); bu eşleme
// yalnızca mobil render'a özeldir. Bilinmeyen kimlik nötr griye düşer.
type IoniconName = ComponentProps<typeof Ionicons>["name"];
const CAT_META: Record<string, { icon: IoniconName; color: string }> = {
  elektronik: { icon: "hardware-chip", color: "#14b8a6" },
  "ev-yasam": { icon: "bed", color: "#f59e0b" },
  moda: { icon: "shirt", color: "#ec4899" },
  vasita: { icon: "car-sport", color: "#3b82f6" },
  hobi: { icon: "game-controller", color: "#8b5cf6" },
  bebek: { icon: "balloon", color: "#22c55e" },
};
const ALL_META: { icon: IoniconName; color: string } = { icon: "grid", color: "#64748b" };
const catMeta = (id?: string) => (id && CAT_META[id]) || ALL_META;

export default function ExploreScreen() {
  const t = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [sort, setSort] = useState<SortOption>("relevance");
  const [view, setView] = useState<"list" | "map">("list");
  const [city, setCity] = useState<string>(""); // "" = tüm Türkiye
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  // Varsayılan: kullanıcının şehri (yerel odak). Kullanıcı "Tüm TR" ile genişletebilir.
  useEffect(() => { if (!city && user?.city) setCity(user.city); }, [user]);

  async function useMyLocation() {
    setLocating(true);
    try {
      const loc = await detectLocation();
      if (!loc) { Alert.alert("Konum", "Konum izni verilmedi veya alınamadı. Ayarlardan izin verebilirsin."); return; }
      setGps(loc.coords);
      if (loc.province) setCity(loc.province);
      setSort("nearest");
    } finally { setLocating(false); }
  }

  const cityCoords = cityToCoords(city || user?.city);
  const near = sort === "nearest" ? (gps ?? (cityCoords ? { lat: cityCoords[0], lng: cityCoords[1] } : null)) : null;
  const filters: SearchFilters = {
    q: submitted || undefined, categoryId, sort, pageSize: 24,
    city: city || undefined,
    ...(near ? { lat: near.lat, lng: near.lng } : {}),
  };
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
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pressable onPress={useMyLocation} hitSlop={6} style={{ width: 40, height: 40, borderRadius: radius.md, borderWidth: 1, borderColor: t.brand, alignItems: "center", justifyContent: "center", backgroundColor: t.brandSoft }}>
            <Ionicons name={locating ? "sync" : "navigate"} size={18} color={t.brand} />
          </Pressable>
          <View style={{ flex: 1 }}><CityPicker value={city} onSelect={setCity} placeholder="Tüm Türkiye" /></View>
          {city ? (
            <Pressable onPress={() => setCity("")} hitSlop={8} style={{ borderWidth: 1, borderColor: t.brand, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9 }}>
              <Text style={{ color: t.brand, fontSize: 12, fontWeight: "700" }}>Tüm TR</Text>
            </Pressable>
          ) : null}
        </View>
        {city ? <Text style={{ color: t.muted, fontSize: 12, marginTop: -4 }}>Daha fazla ilan için “Tüm TR” ile aralığı genişletebilirsin.</Text> : null}
        <TextInput
          value={q}
          onChangeText={setQ}
          onSubmitEditing={() => { const term = q.trim(); setSubmitted(term); if (term) track("search", { q: term }); }}
          returnKeyType="search"
          placeholder="Ne arıyorsun? (iPhone, koltuk, bisiklet)"
          placeholderTextColor={t.muted}
          style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: radius.md, padding: 12, color: t.text }}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.md, paddingVertical: 2 }}>
          {[{ id: undefined, name: "Tümü" }, ...roots].map((c) => {
            const active = categoryId === c.id;
            const meta = catMeta(c.id);
            return (
              <Pressable key={c.id ?? "all"} onPress={() => setCategoryId(c.id)} style={{ alignItems: "center", gap: 5, width: 64 }}>
                <View style={{ width: 56, height: 56, borderRadius: 999, backgroundColor: meta.color, alignItems: "center", justifyContent: "center", borderWidth: active ? 3 : 0, borderColor: t.brand }}>
                  <Ionicons name={meta.icon} size={26} color="#fff" />
                </View>
                <Text numberOfLines={1} style={{ fontSize: 11, color: active ? t.brand : t.text, fontWeight: active ? "700" : "500" }}>{c.name}</Text>
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
              <Text style={{ color: t.brand, fontSize: 13, fontWeight: "600" }}><Ionicons name="notifications-outline" size={13} color={t.brand} /> Kaydet</Text>
            </Pressable>
          )}
          <Pressable onPress={() => setView(view === "list" ? "map" : "list")} style={{ borderWidth: 1, borderColor: t.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Ionicons name={view === "list" ? "map-outline" : "list-outline"} size={16} color={t.text} />
          </Pressable>
        </View>
      </View>

      {isLoading ? <Loading /> :
        isError ? <Empty icon="warning-outline" text="Bir şeyler ters gitti." /> :
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
                  <Text style={{ paddingHorizontal: space.lg, fontSize: 16, fontWeight: "800", color: t.text, marginBottom: 6 }}><Ionicons name="sparkles" size={16} color={t.accent} /> Senin için</Text>
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
