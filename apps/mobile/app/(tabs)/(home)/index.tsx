import { useCallback, useEffect, useState, type ComponentProps } from "react";
import { Alert, Dimensions, FlatList, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { cityToCoords, getChildren, type SearchFilters, type SortOption } from "@satiyo/shared";
import { api } from "@/lib/client";
import { track } from "@/lib/analytics";
import { useAuth } from "@/lib/auth";
import { radius, space, useTheme } from "@/lib/theme";
import { formatPrice } from "@/lib/format";
import { setInitialFilters, takeResultFilters, type FilterDraft } from "@/lib/filter-bridge";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ListingCard } from "@/components/ListingCard";
import { ListingsMap } from "@/components/ListingsMap";
import { CityPickerModal } from "@/components/CityPicker";
import { detectLocation } from "@/lib/location";
import { getLocationPref, loadLocationPref, subscribeLocationPref } from "@/lib/location-pref";
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
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [sort, setSort] = useState<SortOption>("relevance");
  const [view, setView] = useState<"list" | "map">("list");
  const [city, setCity] = useState<string>(""); // "" = tüm Türkiye
  const [cityOpen, setCityOpen] = useState(false);
  const [searchFocus, setSearchFocus] = useState(false);
  const [suggestQ, setSuggestQ] = useState("");

  // Arama panelinde canlı öneriler için yazılanı 250ms geciktirerek uygula.
  useEffect(() => {
    const h = setTimeout(() => setSuggestQ(q.trim()), 250);
    return () => clearTimeout(h);
  }, [q]);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  // Filtrele ekranından yönetilen gelişmiş filtreler.
  const [boostedOnly, setBoostedOnly] = useState(false);
  const [minPrice, setMinPrice] = useState<number | undefined>();
  const [maxPrice, setMaxPrice] = useState<number | undefined>();
  const [condition, setCondition] = useState<"new" | "used" | undefined>();
  const [sellerType, setSellerType] = useState<"individual" | "store" | undefined>();
  const [attrs, setAttrs] = useState<Record<string, string>>({});

  // Varsayılan kapsam: ilk açılışta LocationGate ile seçilen tercih (yalnız il /
  // tüm TR). Tercih yoksa kullanıcının kayıtlı şehrine düşer. Gate seçim yapınca
  // abonelik ile buraya yansır. Kullanıcının manuel şehir seçimini ezmez.
  useEffect(() => {
    const apply = () => {
      const pref = getLocationPref();
      if (pref) {
        setCity(pref.scope === "local" ? pref.city : "");
        return;
      }
      if (user?.city) setCity(user.city);
    };
    loadLocationPref().then(apply);
    const unsub = subscribeLocationPref(apply);
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Filtrele ekranı "Uygula" ile geri dönünce (odaklanınca) sonucu uygula.
  useFocusEffect(useCallback(() => {
    const d = takeResultFilters();
    if (!d) return;
    setQ(d.q);
    setSubmitted(d.q.trim());
    setCategoryId(d.categoryId);
    setCity(d.city);
    setBoostedOnly(d.boostedOnly);
    setMinPrice(d.minPrice);
    setMaxPrice(d.maxPrice);
    setCondition(d.condition);
    setSellerType(d.sellerType);
    setAttrs(d.attrs);
    setSort(d.sort);
  }, []));

  function openFilters() {
    const draft: FilterDraft = { q: submitted, categoryId, city, boostedOnly, minPrice, maxPrice, condition, sellerType, attrs, sort };
    setInitialFilters(draft);
    router.push("/filtrele");
  }

  const activeFilters =
    (categoryId ? 1 : 0) + (city ? 1 : 0) + (boostedOnly ? 1 : 0) +
    (minPrice != null || maxPrice != null ? 1 : 0) + (condition ? 1 : 0) +
    (sellerType ? 1 : 0) + Object.keys(attrs).length + (submitted ? 1 : 0);

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
    minPrice, maxPrice, condition, sellerType,
    boostedOnly: boostedOnly || undefined,
    attrs: Object.keys(attrs).length ? attrs : undefined,
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

  // Arama paneli canlı önerileri (yazdıkça benzer ilanlar)
  const { data: suggest } = useQuery({
    queryKey: ["suggest", suggestQ],
    queryFn: () => api.search({ q: suggestQ, pageSize: 8 }),
    enabled: searchFocus && suggestQ.length >= 2,
    placeholderData: keepPreviousData,
  });

  async function saveSearch() {
    if (!user) return router.push("/giris");
    try { await api.saveSearch(filters, true); Alert.alert("Kaydedildi 🔔", "Eşleşen yeni ilanlarda haber vereceğiz."); }
    catch (e) { Alert.alert("Hata", (e as Error).message); }
  }

  // Konum pin'i: Tüm Türkiye / il seç / GPS — tek dokunuşla kapsam değiştirme.
  function openLocationChooser() {
    Alert.alert(
      "Konum",
      city ? `Şu an: ${city}` : "Şu an: Tüm Türkiye",
      [
        { text: "Tüm Türkiye", onPress: () => setCity("") },
        { text: "İl seç…", onPress: () => setCityOpen(true) },
        { text: "Konumumu kullan", onPress: () => { void useMyLocation(); } },
        { text: "Vazgeç", style: "cancel" },
      ],
    );
  }

  const header = (
      <View style={{ padding: space.lg, paddingTop: insets.top + space.sm, paddingBottom: space.sm, gap: space.md }}>
        {/* Tek kompakt satır: Logo · arama · konum · filtre (liste ile birlikte kayar) */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ fontSize: 21, fontWeight: "900", color: t.brand, letterSpacing: -0.5 }}>Satıyo</Text>
          <TextInput
            value={q}
            onChangeText={setQ}
            onFocus={() => setSearchFocus(true)}
            onSubmitEditing={() => { const term = q.trim(); setSubmitted(term); setSearchFocus(false); if (term) track("search", { q: term }); }}
            returnKeyType="search"
            placeholder="Ne arıyorsun?"
            placeholderTextColor={t.muted}
            style={{ flex: 1, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 9, color: t.text, fontSize: 14 }}
          />
          <Pressable onPress={openLocationChooser} hitSlop={4} style={{ width: 38, height: 38, borderRadius: radius.md, borderWidth: 1, borderColor: city ? t.brand : t.border, backgroundColor: city ? t.brandSoft : t.surface, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name={locating ? "sync" : "location"} size={18} color={city ? t.brand : t.text} />
          </Pressable>
          <Pressable onPress={openFilters} hitSlop={4} style={{ width: 38, height: 38, borderRadius: radius.md, borderWidth: 1, borderColor: activeFilters ? t.brand : t.border, backgroundColor: activeFilters ? t.brandSoft : t.surface, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="options-outline" size={18} color={activeFilters ? t.brand : t.text} />
            {activeFilters > 0 ? (
              <View style={{ position: "absolute", top: -5, right: -5, backgroundColor: t.brand, borderRadius: 999, minWidth: 16, height: 16, paddingHorizontal: 3, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>{activeFilters}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
        <CityPickerModal visible={cityOpen} onClose={() => setCityOpen(false)} value={city} onSelect={(c) => { setCity(c); setCityOpen(false); }} title="Konum seç" />
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
  );

  const hasItems = !!data && data.items.length > 0;
  const emptyState =
    isLoading ? <Loading /> :
    isError ? <Empty icon="warning-outline" text="Bir şeyler ters gitti." /> :
    <Empty text={`Sonuç bulunamadı${submitted ? ` — “${submitted}”` : ""}.`} />;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {view === "map" ? (
        <>
          {header}
          {hasItems ? <ListingsMap listings={data.items} /> : emptyState}
        </>
      ) : (
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(l) => l.id}
          numColumns={2}
          columnWrapperStyle={{ gap: GAP, paddingHorizontal: space.lg }}
          contentContainerStyle={{ gap: GAP, paddingBottom: space.xxl, flexGrow: 1 }}
          renderItem={({ item }) => <ListingCard listing={item} width={cardW} />}
          refreshing={isFetching}
          onRefresh={refetch}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListHeaderComponent={
            <View>
              {header}
              {browsing && reco && reco.items.length > 0 && (
                <View style={{ marginBottom: space.sm }}>
                  <Text style={{ paddingHorizontal: space.lg, fontSize: 16, fontWeight: "800", color: t.text, marginBottom: 6 }}><Ionicons name="sparkles" size={16} color={t.accent} /> Senin için</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: GAP, paddingHorizontal: space.lg }}>
                    {reco.items.map((l) => <ListingCard key={l.id} listing={l} width={150} />)}
                  </ScrollView>
                </View>
              )}
              {hasItems ? <Text style={{ paddingHorizontal: space.lg, paddingVertical: space.sm, color: t.muted }}>{data.total} ilan</Text> : null}
            </View>
          }
          ListEmptyComponent={emptyState}
        />
      )}

      {/* Canlı arama paneli — yarı saydam, yazdıkça benzer ilanlar */}
      {searchFocus && (
        <View style={{ position: "absolute", top: insets.top + 58, left: 0, right: 0, bottom: 0, zIndex: 40 }}>
          <Pressable onPress={() => setSearchFocus(false)} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(10,12,16,0.22)" }} />
          <View style={{ marginHorizontal: space.lg, borderRadius: radius.lg, backgroundColor: `${t.surface}F5`, borderWidth: 1, borderColor: t.border, shadowColor: "#000", shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 8, overflow: "hidden", maxHeight: 430 }}>
            {suggestQ.length < 2 ? (
              <Text style={{ padding: space.lg, color: t.muted, fontSize: 13 }}>Yazmaya başla — iPhone, koltuk, bisiklet…</Text>
            ) : (
              <ScrollView keyboardShouldPersistTaps="handled">
                {(suggest?.items ?? []).map((l) => (
                  <Pressable key={l.id} onPress={() => { setSearchFocus(false); router.push(`/ilan/${l.id}`); }}
                    style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: space.lg, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: t.border }}>
                    {l.images?.[0]?.url ? (
                      <Image source={{ uri: l.images[0].url.replace("/media/", "/media/thumb/200/") }} style={{ width: 44, height: 44, borderRadius: radius.sm, backgroundColor: t.surface2 }} />
                    ) : (
                      <View style={{ width: 44, height: 44, borderRadius: radius.sm, backgroundColor: t.surface2, alignItems: "center", justifyContent: "center" }}>
                        <Ionicons name="image-outline" size={18} color={t.muted} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={{ color: t.text, fontWeight: "600", fontSize: 14 }}>{l.title}</Text>
                      {l.city ? <Text style={{ color: t.muted, fontSize: 12 }}>{l.city}</Text> : null}
                    </View>
                    <Text style={{ color: t.brand, fontWeight: "800", fontSize: 13 }}>{formatPrice(l.price, l.priceType)}</Text>
                  </Pressable>
                ))}
                {suggest && suggest.items.length === 0 && (
                  <Text style={{ padding: space.lg, color: t.muted, fontSize: 13 }}>Sonuç yok — farklı bir kelime dene.</Text>
                )}
                <Pressable onPress={() => { setSubmitted(suggestQ); setSearchFocus(false); track("search", { q: suggestQ }); }} style={{ padding: 13, alignItems: "center", backgroundColor: t.brandSoft }}>
                  <Text style={{ color: t.brand, fontWeight: "800", fontSize: 13 }}>&quot;{suggestQ}&quot; için tüm sonuçları gör →</Text>
                </Pressable>
              </ScrollView>
            )}
          </View>
        </View>
      )}
    </View>
  );
}
