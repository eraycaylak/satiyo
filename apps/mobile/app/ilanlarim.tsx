import { useState } from "react";
import { Alert, FlatList, Image, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LISTING_STATUS_LABELS, type PublicSeller } from "@satiyo/shared";
import { api } from "@/lib/client";
import { useAuth } from "@/lib/auth";
import { radius, space, useTheme } from "@/lib/theme";
import { formatPrice, timeAgo } from "@/lib/format";
import { Badge, Empty, Loading } from "@/components/ui";

const TABS: { k: string; label: string }[] = [
  { k: "all", label: "Tümü" }, { k: "active", label: "Yayında" }, { k: "reserved", label: "Rezerve" },
  { k: "sold", label: "Satıldı" }, { k: "removed", label: "Kaldırıldı" }, { k: "draft", label: "Taslak" },
];

export default function MyListingsScreen() {
  const t = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [tab, setTab] = useState("all");
  const [soldFor, setSoldFor] = useState<{ id: string; title: string } | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ["my-listings", tab], queryFn: () => api.myListings(tab === "all" ? undefined : tab), enabled: !!user });

  function invalidate() { qc.invalidateQueries({ queryKey: ["my-listings"] }); }
  function remove(id: string) {
    Alert.alert("İlanı kaldır", "Emin misin?", [
      { text: "Vazgeç", style: "cancel" },
      { text: "Kaldır", style: "destructive", onPress: async () => { await api.deleteListing(id); invalidate(); } },
    ]);
  }

  const tabStrip = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0 }} contentContainerStyle={{ gap: 8, padding: space.md }}>
      {TABS.map((tb) => (
        <Pressable key={tb.k} onPress={() => setTab(tb.k)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: tab === tb.k ? t.brand : t.surface, borderWidth: 1, borderColor: tab === tb.k ? t.brand : t.border }}>
          <Text style={{ color: tab === tb.k ? "#fff" : t.text, fontWeight: "600", fontSize: 13 }}>{tb.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {tabStrip}
      {isLoading ? <Loading /> :
        !data || data.items.length === 0 ? <Empty text="Bu durumda ilan yok." /> :
        <FlatList
          data={data.items} keyExtractor={(l) => l.id}
          contentContainerStyle={{ padding: space.lg, paddingTop: 0, gap: space.sm }}
          renderItem={({ item: l }) => (
            <View style={{ flexDirection: "row", gap: space.md, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: radius.lg, padding: space.md }}>
              <Pressable onPress={() => router.push(`/ilan/${l.id}`)} style={{ width: 64, height: 64, borderRadius: radius.md, overflow: "hidden", backgroundColor: t.surface2 }}>
                {l.images[0] ? <Image source={{ uri: l.images[0].url }} style={{ width: "100%", height: "100%" }} /> :
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><Ionicons name="image-outline" size={24} color={t.muted} /></View>}
              </Pressable>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ fontWeight: "700", color: t.text }} numberOfLines={1}>{l.title}</Text>
                <Text style={{ fontWeight: "800", color: t.text }}>{formatPrice(l.price, l.priceType)}</Text>
                <View style={{ flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <Badge label={LISTING_STATUS_LABELS[l.status]!} />
                  <Text style={{ color: t.muted, fontSize: 11 }}><Ionicons name="eye-outline" size={11} color={t.muted} /> {l.viewCount} · {timeAgo(l.createdAt)}</Text>
                </View>
                <View style={{ flexDirection: "row", gap: 14, marginTop: 4 }}>
                  {(l.status === "active" || l.status === "reserved") && <Pressable onPress={() => setSoldFor({ id: l.id, title: l.title })} hitSlop={6}><Text style={{ color: t.success, fontWeight: "600", fontSize: 13 }}>Satıldı</Text></Pressable>}
                  {l.status !== "removed" && <Pressable onPress={() => remove(l.id)} hitSlop={6}><Text style={{ color: t.danger, fontSize: 13 }}>Kaldır</Text></Pressable>}
                </View>
              </View>
            </View>
          )}
        />}
      {soldFor && <SoldSheet listing={soldFor} onClose={() => setSoldFor(null)} onDone={() => { setSoldFor(null); invalidate(); }} />}
    </View>
  );
}

function SoldSheet({ listing, onClose, onDone }: { listing: { id: string; title: string }; onClose: () => void; onDone: () => void }) {
  const t = useTheme();
  const [mode, setMode] = useState<"choose" | "buyers">("choose");
  const { data: buyers, isLoading } = useQuery({ queryKey: ["listing-buyers", listing.id], queryFn: () => api.listingBuyers(listing.id), enabled: mode === "buyers" });

  async function sold(channel: "satiyo" | "disarida", buyerId?: string) {
    try {
      await api.markSold(listing.id, { channel, buyerId });
      Alert.alert("Satıldı ✓", buyerId ? "Alıcıyı değerlendirmeyi unutma 🙂" : "İlan satıldı olarak işaretlendi.");
      onDone();
    } catch (e) { Alert.alert("Hata", (e as Error).message); }
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
        <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: t.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: space.lg, gap: space.md, maxHeight: "70%" }}>
          <Text style={{ fontSize: 17, fontWeight: "800", color: t.text }}>Satıldı olarak işaretle</Text>
          <Text style={{ color: t.muted, fontSize: 13 }} numberOfLines={1}>{listing.title}</Text>
          {mode === "choose" ? (
            <>
              <Pressable onPress={() => setMode("buyers")} style={{ backgroundColor: t.brand, borderRadius: radius.md, padding: 14, alignItems: "center" }}>
                <Text style={{ color: "#fff", fontWeight: "700" }}>Satıyo üzerinden sattım</Text>
              </Pressable>
              <Pressable onPress={() => sold("disarida")} style={{ borderWidth: 1, borderColor: t.border, borderRadius: radius.md, padding: 14, alignItems: "center" }}>
                <Text style={{ color: t.text, fontWeight: "600" }}>Satıyo dışında sattım</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={{ color: t.muted, fontSize: 13 }}>Kime sattın? (değerlendirme daveti gönderilir)</Text>
              {isLoading ? <Loading /> :
                !buyers || buyers.length === 0 ? (
                  <View style={{ gap: 8 }}>
                    <Text style={{ color: t.muted }}>Bu ilanda mesajlaşan alıcı yok.</Text>
                    <Pressable onPress={() => sold("satiyo")} style={{ borderWidth: 1, borderColor: t.border, borderRadius: radius.md, padding: 12, alignItems: "center" }}><Text style={{ color: t.text }}>Alıcı seçmeden işaretle</Text></Pressable>
                  </View>
                ) : (
                  <ScrollView style={{ maxHeight: 260 }} contentContainerStyle={{ gap: 8 }}>
                    {(buyers as PublicSeller[]).map((b) => (
                      <Pressable key={b.id} onPress={() => sold("satiyo", b.id)} style={{ flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: t.border, borderRadius: radius.md, padding: 12 }}>
                        <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: t.brand, alignItems: "center", justifyContent: "center" }}><Text style={{ color: "#fff", fontWeight: "800" }}>{(b.name ?? "?").slice(0, 1).toUpperCase()}</Text></View>
                        <Text style={{ color: t.text, fontWeight: "600" }}>{b.name ?? "—"}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
