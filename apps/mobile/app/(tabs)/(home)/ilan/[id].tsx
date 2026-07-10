import { useEffect, useState } from "react";
import { Alert, Dimensions, Image, Modal, Pressable, ScrollView, Share, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { getAttributeSchema, BOOST_PACKAGES } from "@satiyo/shared";
import { api } from "@/lib/client";
import { track } from "@/lib/analytics";
import { useAuth } from "@/lib/auth";
import { radius, space, useTheme } from "@/lib/theme";
import { conditionLabel, formatNumber, formatPrice, locationText, priceTypeLabel, timeAgo } from "@/lib/format";
import { Badge, Button, Loading } from "@/components/ui";
import ImageView from "react-native-image-viewing";

// Dijital "Öne Çıkar" satın alımı App Store'da IAP gerektirir (Guideline 3.1.1).
// IAP kurulana kadar mobilde gizli. Web'de aktif kalır.
const SHOW_PAID_FEATURES = false;

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [fav, setFav] = useState(false);
  const [boostOpen, setBoostOpen] = useState(false);
  const [boosting, setBoosting] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const W = Dimensions.get("window").width;

  const { data: listing, isLoading } = useQuery({
    queryKey: ["listing", id],
    queryFn: async () => { const l = await api.getListing(id!); setFav(!!l.favorited); return l; },
  });

  useEffect(() => {
    if (listing?.id) track("view_listing", { id: listing.id, category: listing.categoryId });
  }, [listing?.id]);

  if (isLoading || !listing) return <Loading />;
  const schema = getAttributeSchema(listing.categoryId);
  const isOwner = user?.id === listing.sellerId;

  async function toggleFav() {
    if (!user) return router.push("/giris");
    const next = !fav; setFav(next);
    try { next ? await api.addFavorite(id!) : await api.removeFavorite(id!); } catch { setFav(!next); }
  }
  async function message(offer?: boolean) {
    if (!user) return router.push("/giris");
    try {
      const conv = await api.startConversation(id!, offer ? "Teklifim var" : "Merhaba, ilanınız hâlâ satılık mı?");
      track("contact_seller", { id, offer: !!offer });
      router.push(`/sohbet/${conv.id}`);
    } catch (e) { Alert.alert("Hata", (e as Error).message); }
  }
  async function doBoost(packageId: string) {
    setBoosting(true);
    try {
      const r = await api.boostListing(id!, packageId);
      setBoostOpen(false);
      Alert.alert("Öne çıkarıldı ✦", `İlan ${new Date(r.boostedUntil).toLocaleDateString("tr-TR")} tarihine kadar üstte.`);
    } catch (e) { Alert.alert("Hata", (e as Error).message); }
    finally { setBoosting(false); }
  }
  async function report() {
    if (!user) return router.push("/giris");
    Alert.prompt?.("Şikayet", "Nedeni:", async (reason) => {
      if (reason) { await api.report({ targetType: "listing", targetId: id!, reason }); Alert.alert("Teşekkürler", "Şikayetiniz alındı."); }
    });
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ paddingBottom: space.xxl }}>
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
        {listing.images.length ? listing.images.map((img, i) => (
          <Pressable key={img.id} onPress={() => setViewerIndex(i)}>
            <Image source={{ uri: img.url }} style={{ width: W, height: W, backgroundColor: t.surface2 }} resizeMode="cover" />
          </Pressable>
        )) : <View style={{ width: W, height: W, backgroundColor: t.surface2, alignItems: "center", justifyContent: "center" }}><Ionicons name="image-outline" size={56} color={t.muted} /></View>}
      </ScrollView>
      {listing.images.length > 0 && (
        <ImageView
          images={listing.images.map((im) => ({ uri: im.url }))}
          imageIndex={viewerIndex ?? 0}
          visible={viewerIndex !== null}
          onRequestClose={() => setViewerIndex(null)}
        />
      )}

      <View style={{ padding: space.lg, gap: space.md }}>
        <View style={{ flexDirection: "row", gap: 6 }}>
          <Badge label={conditionLabel[listing.condition]!} />
          <Badge label={priceTypeLabel[listing.priceType]} />
          {listing.status === "reserved" && <Badge label="Rezerve" tone="accent" />}
        </View>
        <Text style={{ fontSize: 22, fontWeight: "800", color: t.text }}>{listing.title}</Text>
        <Text style={{ fontSize: 28, fontWeight: "900", color: t.text }}>{formatPrice(listing.price, listing.priceType)}</Text>
        <Text style={{ color: t.muted }}><Ionicons name="location-outline" size={14} color={t.muted} /> {locationText(listing.city, listing.district)} · <Ionicons name="eye-outline" size={14} color={t.muted} /> {listing.viewCount} · {timeAgo(listing.createdAt)}</Text>

        {!isOwner && listing.status === "active" && (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button title="Mesaj At" onPress={() => message(false)} style={{ flex: 1 }} />
            {listing.priceType === "negotiable" && <Button title="Teklif Ver" variant="ghost" onPress={() => message(true)} style={{ flex: 1 }} />}
            <Pressable onPress={toggleFav} style={{ borderWidth: 1, borderColor: t.border, borderRadius: radius.md, paddingVertical: 13, paddingHorizontal: 18, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={fav ? "heart" : "heart-outline"} size={20} color={t.danger} />
            </Pressable>
          </View>
        )}

        {SHOW_PAID_FEATURES && isOwner && listing.status === "active" && (
          <Button title="Öne Çıkar" onPress={() => setBoostOpen(true)} />
        )}

        {listing.seller && (
          <Pressable onPress={() => router.push(`/satici/${listing.seller!.id}`)}
            style={{ flexDirection: "row", alignItems: "center", gap: space.md, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: radius.lg, padding: space.md }}>
            <View style={{ width: 48, height: 48, borderRadius: 999, backgroundColor: t.brandSoft, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: t.brand, fontWeight: "800", fontSize: 20 }}>{(listing.seller.storeName ?? listing.seller.name).charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700", color: t.text }}>{listing.seller.storeName ?? listing.seller.name}</Text>
              <Text style={{ color: t.muted, fontSize: 12 }}>
                {listing.seller.ratingCount ? <><Ionicons name="star" size={12} color={t.accent} /> {listing.seller.ratingAvg?.toFixed(1)} ({listing.seller.ratingCount})</> : "Henüz puan yok"} · Üyelik {timeAgo(listing.seller.createdAt)}
              </Text>
            </View>
            <Text style={{ color: t.muted, fontSize: 20 }}>›</Text>
          </Pressable>
        )}

        <View style={{ backgroundColor: t.brandSoft, borderRadius: radius.md, padding: 12, flexDirection: "row", gap: 8, alignItems: "center" }}>
          <Ionicons name="shield-checkmark-outline" size={16} color={t.brand} />
          <Text style={{ color: t.brand, fontSize: 13, flex: 1 }}>Kapora gönderme. Yüz yüze, güvenli yerde buluş.</Text>
        </View>

        {schema.filter((a) => listing.attributes[a.key]).length > 0 && (
          <View style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: radius.lg, padding: space.lg }}>
            <Text style={{ fontWeight: "800", marginBottom: 8, color: t.text }}>Özellikler</Text>
            {schema.filter((a) => listing.attributes[a.key]).map((a) => (
              <View key={a.key} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderTopWidth: 1, borderTopColor: t.border }}>
                <Text style={{ color: t.muted }}>{a.label}</Text>
                <Text style={{ color: t.text, fontWeight: "600" }}>{listing.attributes[a.key]}</Text>
              </View>
            ))}
          </View>
        )}

        {!!listing.description && (
          <View style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: radius.lg, padding: space.lg }}>
            <Text style={{ fontWeight: "800", marginBottom: 8, color: t.text }}>Açıklama</Text>
            <Text style={{ color: t.text, lineHeight: 21 }}>{listing.description}</Text>
          </View>
        )}

        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button title="Paylaş" variant="ghost" onPress={() => { const u = `https://satiyo.app/ilan/${id}`; Share.share({ message: `${listing.title} — ${formatPrice(listing.price, listing.priceType)} · Satıyo'da: ${u}`, url: u }); }} style={{ flex: 1 }} />
          {!isOwner && <Button title="Şikayet" variant="ghost" onPress={report} style={{ flex: 1 }} />}
        </View>
      </View>

      <Modal visible={boostOpen} transparent animationType="slide" onRequestClose={() => setBoostOpen(false)}>
        <Pressable onPress={() => setBoostOpen(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: t.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: space.lg, gap: space.md }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="sparkles" size={18} color={t.accent} />
              <Text style={{ fontSize: 18, fontWeight: "800", color: t.text }}>İlanı Öne Çıkar</Text>
            </View>
            <Text style={{ color: t.muted }}>Daha fazla kişiye ulaş, daha hızlı sat.</Text>
            {BOOST_PACKAGES.map((p) => (
              <Pressable key={p.id} disabled={boosting} onPress={() => doBoost(p.id)}
                style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: p.highlight ? t.brand : t.border, borderRadius: radius.md, padding: space.md }}>
                <View>
                  <Text style={{ fontWeight: "700", color: t.text }}>{p.label}</Text>
                  {p.highlight ? <Text style={{ color: t.brand, fontSize: 12 }}>{p.highlight}</Text> : null}
                </View>
                <Text style={{ fontWeight: "800", color: t.text }}>{formatNumber(p.price / 100)} ₺</Text>
              </Pressable>
            ))}
            <Text style={{ color: t.muted, fontSize: 11, textAlign: "center" }}>Geliştirme modunda ödeme simüle edilir.</Text>
            <Button title="Kapat" variant="ghost" onPress={() => setBoostOpen(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}
