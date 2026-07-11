import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { categoryVisual, foldTr, getCategory, getCategoryPath, getChildren, leafCategories, rootCategories, type CategoryNode } from "@satiyo/shared";
import { radius, space, useTheme } from "@/lib/theme";

/** Çok-seviyeli kategori seçici — drill-down modal + breadcrumb + arama. */
export function CategoryPicker({ value, onSelect }: { value: string; onSelect: (id: string) => void }) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const path = value ? getCategoryPath(value) : [];
  const label = path.length ? path.map((c) => c.name).join(" › ") : "Kategori seç";

  const results = useMemo(() => {
    const tq = foldTr(q.trim());
    if (!tq) return null;
    return leafCategories()
      .filter((c) => foldTr(c.name).includes(tq) || foldTr(getCategory(c.parentId ?? "")?.name ?? "").includes(tq))
      .slice(0, 40);
  }, [q]);

  const items = q ? (results ?? []) : (level === null ? rootCategories() : getChildren(level));
  const crumbs = level ? getCategoryPath(level) : [];

  function close() { setOpen(false); setQ(""); setLevel(null); }
  function pick(c: CategoryNode) {
    if (q) { onSelect(c.id); close(); return; }
    if (getChildren(c.id).length === 0) { onSelect(c.id); close(); }
    else setLevel(c.id);
  }

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: radius.md, padding: 12 }}>
        {path[0] ? <RootDot id={path[0].id} /> : <Ionicons name="grid-outline" size={20} color={t.muted} />}
        <Text style={{ color: path.length ? t.text : t.muted, flex: 1 }} numberOfLines={1}>{label}</Text>
        <Ionicons name="chevron-down" size={16} color={t.muted} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        <Pressable onPress={close} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: t.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: space.lg, gap: space.sm, height: "82%" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 17, fontWeight: "800", color: t.text }}>Kategori</Text>
              <Pressable onPress={close} hitSlop={8}><Ionicons name="close" size={22} color={t.muted} /></Pressable>
            </View>
            <TextInput value={q} onChangeText={setQ} placeholder="Ara (telefon, koltuk, bmw…)" placeholderTextColor={t.muted}
              style={{ backgroundColor: t.bg, borderWidth: 1, borderColor: t.border, borderRadius: radius.md, padding: 12, color: t.text }} />
            {!q && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 4 }}>
                <Pressable onPress={() => setLevel(null)}><Text style={{ color: t.brand, fontWeight: "600" }}>Tümü</Text></Pressable>
                {crumbs.map((c) => (
                  <View key={c.id} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Text style={{ color: t.muted }}>›</Text>
                    <Pressable onPress={() => setLevel(c.id)}><Text style={{ color: t.brand, fontWeight: "600" }}>{c.name}</Text></Pressable>
                  </View>
                ))}
              </View>
            )}
            <FlatList
              data={items} keyExtractor={(c) => c.id} keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ gap: 6, paddingVertical: 4 }}
              renderItem={({ item: c }) => {
                const hasKids = !q && getChildren(c.id).length > 0;
                return (
                  <Pressable onPress={() => pick(c)} style={{ flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: t.border, borderRadius: radius.md, padding: 12 }}>
                    {c.parentId === null && !q ? <RootDot id={c.id} /> : <Text style={{ fontSize: 18 }}>{c.icon}</Text>}
                    <Text style={{ color: t.text, fontWeight: "600", flex: 1 }}>{c.name}</Text>
                    {q ? <Text style={{ color: t.muted, fontSize: 11, maxWidth: 120 }} numberOfLines={1}>{getCategoryPath(c.id).slice(0, -1).map((p) => p.name).join(" › ")}</Text>
                      : hasKids ? <Ionicons name="chevron-forward" size={16} color={t.muted} /> : null}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function RootDot({ id }: { id: string }) {
  const v = categoryVisual(id);
  const emoji = getCategory(id)?.icon;
  return <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: v.color, alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 15 }}>{emoji ?? "📦"}</Text></View>;
}
