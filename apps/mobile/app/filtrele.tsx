import { useEffect, useMemo, useState } from "react";
import { FlatList, Modal, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { getAttributeSchema, getCategory, type AttributeDef, type SearchFilters, type SortOption } from "@satiyo/shared";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/lib/client";
import { radius, space, useTheme } from "@/lib/theme";
import { CategoryPickerModal } from "@/components/CategoryPicker";
import { CityPickerModal } from "@/components/CityPicker";
import { emptyDraft, setResultFilters, takeInitialFilters, type FilterDraft } from "@/lib/filter-bridge";

interface Opt { value: string; label: string }

const SORTS: { v: SortOption; l: string }[] = [
  { v: "relevance", l: "İlgili" },
  { v: "newest", l: "En yeni" },
  { v: "price_asc", l: "Artan fiyat" },
  { v: "price_desc", l: "Azalan fiyat" },
  { v: "nearest", l: "Yakınımdakiler" },
];
const CONDITIONS: Opt[] = [{ value: "new", label: "Sıfır" }, { value: "used", label: "İkinci el" }];
const SELLERS: Opt[] = [{ value: "individual", label: "Bireysel" }, { value: "store", label: "Mağaza" }];

/** Binlik ayraç (66495 → "66.495"). Hermes'te güvenilir Intl olmadan çalışsın diye elde. */
function group(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function priceSummary(min?: number, max?: number): string | undefined {
  if (min != null && max != null) return `${group(min)} - ${group(max)} TL`;
  if (min != null) return `≥ ${group(min)} TL`;
  if (max != null) return `≤ ${group(max)} TL`;
  return undefined;
}

/** Nesne değeri debounce eder (canlı sayaç sorgusunu boğmamak için). */
function useDebounced<T>(value: T, delay = 350): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

export default function FiltreleScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Başlangıç taslağı Keşfet'ten köprüyle gelir (bir kez tüketilir); yoksa boş.
  const [draft, setDraft] = useState<FilterDraft>(() => takeInitialFilters() ?? emptyDraft());
  const [openSheet, setOpenSheet] = useState<null | "category" | "city" | "condition" | "seller" | "sort">(null);
  const [attrSheet, setAttrSheet] = useState<string | null>(null);
  const [priceOpen, setPriceOpen] = useState<boolean>(draft.minPrice != null || draft.maxPrice != null);

  const category = draft.categoryId ? getCategory(draft.categoryId) : undefined;
  const selectAttrs = useMemo<AttributeDef[]>(
    () => (draft.categoryId ? getAttributeSchema(draft.categoryId).filter((a) => a.type === "select") : []),
    [draft.categoryId],
  );

  function attrOptions(attr: AttributeDef): string[] {
    if (attr.options?.length) return attr.options;
    if (attr.dependsOn && attr.optionsByParent) {
      const parent = draft.attrs[attr.dependsOn];
      return parent ? (attr.optionsByParent[parent] ?? []) : [];
    }
    return [];
  }
  const attrLabel = (key: string) => selectAttrs.find((a) => a.key === key)?.label ?? key;

  function patch(p: Partial<FilterDraft>) { setDraft((d) => ({ ...d, ...p })); }
  function setCategory(id: string) { setDraft((d) => ({ ...d, categoryId: id, attrs: {} })); }
  function setAttr(key: string, value: string | undefined) {
    setDraft((d) => {
      const attrs = { ...d.attrs };
      if (value == null) delete attrs[key]; else attrs[key] = value;
      // Bağımlı çocukları temizle (ör. Marka değişince Model sıfırlanır).
      for (const a of selectAttrs) if (a.dependsOn === key) delete attrs[a.key];
      return { ...d, attrs };
    });
  }
  function reset() { setDraft(emptyDraft()); setPriceOpen(false); }

  // --- Canlı sayaç: filtre değiştikçe toplam ilan sayısını çek (debounce + RQ). ---
  const countFilters = useMemo<SearchFilters>(() => ({
    q: draft.q.trim() || undefined,
    categoryId: draft.categoryId,
    minPrice: draft.minPrice,
    maxPrice: draft.maxPrice,
    city: draft.city || undefined,
    condition: draft.condition,
    sellerType: draft.sellerType,
    boostedOnly: draft.boostedOnly || undefined,
    attrs: Object.keys(draft.attrs).length ? draft.attrs : undefined,
    pageSize: 1,
  }), [draft]);
  const debounced = useDebounced(countFilters);
  const { data: countData, isFetching: counting } = useQuery({
    queryKey: ["filter-count", debounced],
    queryFn: () => api.search(debounced),
    placeholderData: keepPreviousData,
  });
  const total = countData?.total ?? null;
  const applyLabel = total == null ? (counting ? "Uygula…" : "Uygula") : `Uygula (${group(total)}) ilan`;

  function apply() {
    setResultFilters(draft);
    router.back();
  }

  const activeAttr = attrSheet ? selectAttrs.find((a) => a.key === attrSheet) : undefined;
  const sortLabel = SORTS.find((s) => s.v === draft.sort)?.l ?? "İlgili";
  const conditionLabel = CONDITIONS.find((c) => c.value === draft.condition)?.label;
  const sellerLabel = SELLERS.find((s) => s.value === draft.sellerType)?.label;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Stack.Screen options={{
        title: "Filtrele",
        headerRight: () => (
          <Pressable onPress={reset} hitSlop={8}>
            <Text style={{ color: t.brand, fontSize: 16, fontWeight: "700" }}>Temizle</Text>
          </Pressable>
        ),
      }} />

      <ScrollView
        contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: space.xl }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Kategori */}
        <FilterRow
          label="Kategori"
          value={category?.name}
          badge={draft.categoryId ? 1 : undefined}
          onPress={() => setOpenSheet("category")}
        />

        {/* Öne Çıkan İlanlar (Switch) */}
        <View style={{ backgroundColor: t.surface, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 11, flexDirection: "row", alignItems: "center" }}>
          <Text style={{ color: t.text, fontSize: 16, fontWeight: "600", flex: 1 }}>Öne Çıkan İlanlar</Text>
          <Switch
            value={draft.boostedOnly}
            onValueChange={(v) => patch({ boostedOnly: v })}
            trackColor={{ true: t.brand, false: t.surface2 }}
            thumbColor="#fff"
            ios_backgroundColor={t.surface2}
          />
        </View>

        {/* İl */}
        <FilterRow
          label="İl"
          value={draft.city || "Tüm Türkiye"}
          badge={draft.city ? 1 : undefined}
          onPress={() => setOpenSheet("city")}
        />

        {/* Fiyat (min–max, açılır) */}
        <View style={{ backgroundColor: t.surface, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 15 }}>
          <Pressable onPress={() => setPriceOpen((o) => !o)} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.text, fontSize: 16, fontWeight: "600" }}>Fiyat</Text>
              {priceSummary(draft.minPrice, draft.maxPrice) ? (
                <Text style={{ color: t.brand, fontSize: 14, fontWeight: "700", marginTop: 3 }}>{priceSummary(draft.minPrice, draft.maxPrice)}</Text>
              ) : null}
            </View>
            <Ionicons name={priceOpen ? "chevron-down" : "chevron-forward"} size={18} color={t.brand} />
          </Pressable>
          {priceOpen ? (
            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <PriceInput placeholder="En az" value={draft.minPrice} onChange={(n) => patch({ minPrice: n })} />
              <PriceInput placeholder="En çok" value={draft.maxPrice} onChange={(n) => patch({ maxPrice: n })} />
            </View>
          ) : null}
        </View>

        {/* Durum */}
        <FilterRow
          label="Durum"
          value={conditionLabel}
          badge={draft.condition ? 1 : undefined}
          onPress={() => setOpenSheet("condition")}
        />

        {/* Dinamik öznitelikler (seçili kategorinin select'leri: Marka/Yakıt/Vites/Renk…) */}
        {selectAttrs.map((attr) => {
          const opts = attrOptions(attr);
          const disabled = opts.length === 0; // ör. Model → önce Marka seçilmeli
          return (
            <FilterRow
              key={attr.key}
              label={attr.label}
              value={draft.attrs[attr.key]}
              hint={disabled && attr.dependsOn ? `Önce ${attrLabel(attr.dependsOn)} seçin` : undefined}
              badge={draft.attrs[attr.key] ? 1 : undefined}
              disabled={disabled}
              onPress={() => setAttrSheet(attr.key)}
            />
          );
        })}

        {/* Satıcı */}
        <FilterRow
          label="Satıcı"
          value={sellerLabel}
          badge={draft.sellerType ? 1 : undefined}
          onPress={() => setOpenSheet("seller")}
        />

        {/* Sıralama */}
        <FilterRow label="Sıralama" value={sortLabel} onPress={() => setOpenSheet("sort")} />

        {/* Kelime ile Filtrele */}
        <View style={{ backgroundColor: t.surface, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 15 }}>
          <Text style={{ color: t.text, fontSize: 16, fontWeight: "600", marginBottom: 10 }}>Kelime ile Filtrele</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: t.bg, borderWidth: 1, borderColor: t.border, borderRadius: 999, paddingHorizontal: 14 }}>
            <Ionicons name="search" size={18} color={t.brand} />
            <TextInput
              value={draft.q}
              onChangeText={(txt) => patch({ q: txt })}
              placeholder="Ürün, kategori veya marka ara…"
              placeholderTextColor={t.muted}
              returnKeyType="search"
              style={{ flex: 1, color: t.text, paddingVertical: 12 }}
            />
            {draft.q ? (
              <Pressable onPress={() => patch({ q: "" })} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={t.muted} />
              </Pressable>
            ) : null}
          </View>
        </View>
      </ScrollView>

      {/* Sabit alt: Uygula (N) ilan */}
      <View style={{ paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.md + insets.bottom, borderTopWidth: 1, borderTopColor: t.border, backgroundColor: t.surface }}>
        <Pressable onPress={apply} style={({ pressed }) => ({ backgroundColor: t.brand, borderRadius: radius.md, paddingVertical: 16, alignItems: "center", opacity: pressed ? 0.9 : 1 })}>
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>{applyLabel}</Text>
        </Pressable>
      </View>

      {/* --- Modallar --- */}
      <CategoryPickerModal
        visible={openSheet === "category"}
        onClose={() => setOpenSheet(null)}
        value={draft.categoryId ?? ""}
        onSelect={(id) => setCategory(id)}
      />
      <CityPickerModal
        visible={openSheet === "city"}
        onClose={() => setOpenSheet(null)}
        value={draft.city}
        onSelect={(c) => patch({ city: c })}
        title="İl seç"
      />
      <OptionSheet
        visible={openSheet === "condition"}
        title="Durum"
        options={CONDITIONS}
        selected={draft.condition}
        onSelect={(v) => { patch({ condition: v as FilterDraft["condition"] }); setOpenSheet(null); }}
        onClose={() => setOpenSheet(null)}
      />
      <OptionSheet
        visible={openSheet === "seller"}
        title="Satıcı"
        options={SELLERS}
        selected={draft.sellerType}
        onSelect={(v) => { patch({ sellerType: v as FilterDraft["sellerType"] }); setOpenSheet(null); }}
        onClose={() => setOpenSheet(null)}
      />
      <OptionSheet
        visible={openSheet === "sort"}
        title="Sıralama"
        options={SORTS.map((s) => ({ value: s.v, label: s.l }))}
        selected={draft.sort}
        allowClear={false}
        onSelect={(v) => { if (v) patch({ sort: v as SortOption }); setOpenSheet(null); }}
        onClose={() => setOpenSheet(null)}
      />
      <OptionSheet
        visible={!!activeAttr}
        title={activeAttr?.label ?? ""}
        options={activeAttr ? attrOptions(activeAttr).map((o) => ({ value: o, label: o })) : []}
        selected={activeAttr ? draft.attrs[activeAttr.key] : undefined}
        onSelect={(v) => { if (activeAttr) setAttr(activeAttr.key, v); setAttrSheet(null); }}
        onClose={() => setAttrSheet(null)}
      />
    </View>
  );
}

/** Referans kart-satırı: sol etiket (+değer/ipucu), sağ rozet + chevron. */
function FilterRow({
  label, value, hint, badge, onPress, disabled,
}: {
  label: string;
  value?: string;
  hint?: string;
  badge?: number;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        opacity: disabled ? 0.45 : pressed ? 0.9 : 1,
        backgroundColor: t.surface, borderRadius: radius.md,
        paddingHorizontal: 16, paddingVertical: 15,
        flexDirection: "row", alignItems: "center", gap: 10,
      })}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: t.text, fontSize: 16, fontWeight: "600" }}>{label}</Text>
        {value ? (
          <Text style={{ color: t.brand, fontSize: 14, fontWeight: "700", marginTop: 3 }} numberOfLines={1}>{value}</Text>
        ) : hint ? (
          <Text style={{ color: t.muted, fontSize: 12, marginTop: 3 }} numberOfLines={1}>{hint}</Text>
        ) : null}
      </View>
      {badge ? (
        <View style={{ backgroundColor: t.surface2, borderRadius: 999, minWidth: 22, height: 22, paddingHorizontal: 7, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: t.muted, fontSize: 12, fontWeight: "700" }}>{badge}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={t.brand} />
    </Pressable>
  );
}

/** Sayısal fiyat girişi (rakam dışı temizlenir; boş → undefined). */
function PriceInput({
  placeholder, value, onChange,
}: {
  placeholder: string;
  value?: number;
  onChange: (n: number | undefined) => void;
}) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: t.bg, borderWidth: 1, borderColor: t.border, borderRadius: radius.md, paddingHorizontal: 12 }}>
      <TextInput
        value={value != null ? String(value) : ""}
        onChangeText={(txt) => { const digits = txt.replace(/[^0-9]/g, ""); onChange(digits ? Number(digits) : undefined); }}
        placeholder={placeholder}
        placeholderTextColor={t.muted}
        keyboardType="number-pad"
        style={{ flex: 1, color: t.text, paddingVertical: 12 }}
      />
      <Text style={{ color: t.muted, fontWeight: "700" }}>TL</Text>
    </View>
  );
}

/** Genel seçenek alt-sayfası ("Tümü" ile temizleme opsiyonlu). */
function OptionSheet({
  visible, title, options, selected, allowClear = true, onSelect, onClose,
}: {
  visible: boolean;
  title: string;
  options: Opt[];
  selected?: string;
  allowClear?: boolean;
  onSelect: (value: string | undefined) => void;
  onClose: () => void;
}) {
  const t = useTheme();
  const CLEAR = "__all__";
  const rows: Opt[] = allowClear ? [{ value: CLEAR, label: "Tümü" }, ...options] : options;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
        <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: t.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingTop: space.md, maxHeight: "70%" }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.lg, paddingBottom: space.sm }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: t.text }}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={8}><Ionicons name="close" size={22} color={t.muted} /></Pressable>
          </View>
          <FlatList
            data={rows}
            keyExtractor={(o) => o.value}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const isClear = item.value === CLEAR;
              const active = isClear ? selected == null : selected === item.value;
              return (
                <Pressable
                  onPress={() => onSelect(isClear ? undefined : item.value)}
                  style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: space.lg, borderBottomWidth: 1, borderBottomColor: t.border }}
                >
                  <Text style={{ flex: 1, color: active ? t.brand : t.text, fontSize: 16, fontWeight: active ? "700" : "400" }}>{item.label}</Text>
                  {active ? <Ionicons name="checkmark" size={20} color={t.brand} /> : null}
                </Pressable>
              );
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
