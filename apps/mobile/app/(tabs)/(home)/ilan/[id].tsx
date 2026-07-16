import { useEffect, useState } from "react";
import { Alert, Dimensions, Image, Linking, Modal, Pressable, ScrollView, Share, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { getAttributeSchema, getCategory, BOOST_PACKAGES } from "@satiyo/shared";
import { api } from "@/lib/client";
import { track } from "@/lib/analytics";
import { useAuth } from "@/lib/auth";
import { radius, space, useTheme } from "@/lib/theme";
import { conditionLabel, formatNumber, formatPrice, locationText, priceTypeLabel, timeAgo } from "@/lib/format";
import { Badge, Button, Loading } from "@/components/ui";
import { ListingsMap } from "@/components/ListingsMap";
import ImageView from "react-native-image-viewing";

// Dijital "Öne Çıkar" satın alımı App Store'da IAP gerektirir (Guideline 3.1.1).
// IAP kurulana kadar mobilde gizli. Web'de aktif kalır.
const SHOW_PAID_FEATURES = false;

// Şikayet için hazır sebepler — cross-platform (Alert.prompt Android'de çalışmaz).
const REPORT_REASONS = ["Sahte veya yanıltıcı ilan", "Yasaklı ürün", "Dolandırıcılık şüphesi", "Uygunsuz içerik", "Yinelenen ilan", "Diğer"];

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [fav, setFav] = useState(false);
  const [boostOpen, setBoostOpen] = useState(false);
  const [boosting, setBoosting] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [sending, setSending] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [tab, setTab] = useState<"info" | "desc" | "loc">("info");
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const W = Dimensions.get("window").width;

  const { data: listing, isLoading } = useQuery({
    queryKey: ["listing", id],
    queryFn: () => api.getListing(id!),
  });

  // Favori başlangıç durumunu ilan verisinden türet — queryFn içinde set etme,
  // yoksa her refetch optimistic favori güncellemesini ezer. İlan değişince bir kez senkronla.
  useEffect(() => {
    if (listing) setFav(!!listing.favorited);
  }, [listing?.id]);

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
  async function message() {
    if (!user) return router.push("/giris");
    try {
      track("contact_seller", { id, offer: false });
      // A2 — mevcut konuşmayı aç; her tıkta yeni mesaj GÖNDERME
      const convs = await api.conversations().catch(() => []);
      const existing = convs.find((c) => c.listingId === id && c.buyerId === user.id);
      if (existing) { router.push(`/sohbet/${existing.id}`); return; }
      const conv = await api.startConversation(id!, "Merhaba, ilanınız hâlâ satılık mı?");
      router.push(`/sohbet/${conv.id}`);
    } catch (e) { Alert.alert("Hata", (e as Error).message); }
  }
  async function submitOffer() {
    if (!user) return router.push("/giris");
    const amount = Math.round(Number(offerAmount) * 100);
    if (!Number.isFinite(amount) || amount <= 0) { Alert.alert("Geçersiz tutar", "Lütfen geçerli bir teklif tutarı gir."); return; }
    setSending(true);
    try {
      track("contact_seller", { id, offer: true });
      // A2 — mevcut konuşmayı bul; yoksa oluştur, sonra sayısal teklifi gönder (web ile aynı akış)
      const convs = await api.conversations().catch(() => []);
      const existing = convs.find((c) => c.listingId === id && c.buyerId === user.id);
      const convId = existing ? existing.id : (await api.startConversation(id!)).id;
      await api.sendMessage(convId, { type: "offer", offerAmount: amount });
      setOfferOpen(false);
      router.push(`/sohbet/${convId}`);
    } catch (e) { Alert.alert("Hata", (e as Error).message); }
    finally { setSending(false); }
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
  function report() {
    if (!user) return router.push("/giris");
    setReportOpen(true);
  }

  // Kısa linki bir kez al; sosyal paylaşımlar bunu kullanır.
  async function getShareUrl(): Promise<string> {
    if (shortUrl) return shortUrl;
    try {
      const r = await api.shareLink(String(id));
      if (r?.url) { setShortUrl(r.url); return r.url; }
    } catch { /* uzun linke düş */ }
    return `https://satiyo.app/ilan/${id}`;
  }

  async function shareTo(net: "wa" | "x" | "fb" | "native") {
    const url = await getShareUrl();
    const txt = `${listing!.title} — ${formatPrice(listing!.price, listing!.priceType)} · Satıyo'da`;
    try {
      if (net === "wa") await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(`${txt}: ${url}`)}`);
      else if (net === "x") await Linking.openURL(`https://twitter.com/intent/tweet?text=${encodeURIComponent(txt)}&url=${encodeURIComponent(url)}`);
      else if (net === "fb") await Linking.openURL(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
      else await Share.share({ message: `${txt}: ${url}`, url });
    } catch { /* paylaşım iptal/başarısız — sessiz */ }
  }
  async function submitReport(reason: string) {
    setReportOpen(false);
    try {
      await api.report({ targetType: "listing", targetId: id!, reason });
      Alert.alert("Teşekkürler", "Şikayetiniz alındı.");
    } catch (e) { Alert.alert("Hata", (e as Error).message); }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ paddingBottom: space.xxl }}>
      <View style={{ position: "relative" }}>
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
          {listing.images.length ? listing.images.map((img, i) => (
            <Pressable key={img.id} onPress={() => setViewerIndex(i)}>
              <Image source={{ uri: img.url }} style={{ width: W, height: W, backgroundColor: t.surface2 }} resizeMode="cover" />
            </Pressable>
          )) : <View style={{ width: W, height: W, backgroundColor: t.surface2, alignItems: "center", justifyContent: "center" }}><Ionicons name="image-outline" size={56} color={t.muted} /></View>}
        </ScrollView>
        {/* Sahibinden tarzı: foto sağ üst — favori + WhatsApp + X + Facebook + paylaş */}
        <View style={{ position: "absolute", top: 12, right: 12, flexDirection: "row", gap: 8 }}>
          {[
            { key: "fav", icon: (fav ? "heart" : "heart-outline") as const, color: t.danger, onPress: toggleFav },
            { key: "wa", icon: "logo-whatsapp" as const, color: "#25D366", onPress: () => shareTo("wa") },
            { key: "x", icon: "logo-twitter" as const, color: "#111", onPress: () => shareTo("x") },
            { key: "fb", icon: "logo-facebook" as const, color: "#1877F2", onPress: () => shareTo("fb") },
            { key: "share", icon: "share-outline" as const, color: "#333", onPress: () => shareTo("native") },
          ].map((b) => (
            <Pressable key={b.key} onPress={b.onPress} hitSlop={4}
              style={{ width: 36, height: 36, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.93)", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 3 }}>
              <Ionicons name={b.icon} size={18} color={b.color} />
            </Pressable>
          ))}
        </View>
      </View>
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
            <Button title="Mesaj At" onPress={() => message()} style={{ flex: 1 }} />
            {listing.priceType === "negotiable" && <Button title="Teklif Ver" variant="ghost" onPress={() => { setOfferAmount(""); setOfferOpen(true); }} style={{ flex: 1 }} />}
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

        {/* Sahibinden tarzı 3 sekme: İlan Bilgileri | Açıklama | Konumu */}
        <View style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: radius.lg, overflow: "hidden" }}>
          <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: t.border, backgroundColor: t.surface2 }}>
            {([["info", "İlan Bilgileri"], ["desc", "Açıklama"], ["loc", "Konumu"]] as const).map(([k, l]) => (
              <Pressable key={k} onPress={() => setTab(k)} style={{ flex: 1, paddingVertical: 12, alignItems: "center", borderBottomWidth: 2, borderBottomColor: tab === k ? t.brand : "transparent", backgroundColor: tab === k ? t.surface : "transparent" }}>
                <Text style={{ fontWeight: "700", fontSize: 13, color: tab === k ? t.brand : t.muted }}>{l}</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ padding: space.lg }}>
            {tab === "info" && (
              <View>
                {[
                  ["İlan No", (() => { const hx = listing.id.replace(/^lst_/, ""); try { return String(BigInt("0x" + hx)).slice(0, 10); } catch { return hx.replace(/\D/g, "").slice(0, 10) || "0"; } })()],
                  ["İlan Tarihi", timeAgo(listing.createdAt)],
                  ...(getCategory(listing.categoryId) ? [["Kategori", getCategory(listing.categoryId)!.name]] : []),
                  ["Durum", conditionLabel[listing.condition]!],
                  ["Fiyat Tipi", priceTypeLabel[listing.priceType]],
                  ["Görüntülenme", String(listing.viewCount)],
                  ...schema.filter((a) => listing.attributes[a.key]).map((a) => [a.label, String(listing.attributes[a.key])]),
                ].map(([k, v], i) => (
                  <View key={String(k)} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 9, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: t.border }}>
                    <Text style={{ color: t.muted }}>{k}</Text>
                    <Text style={{ color: t.text, fontWeight: "600", flexShrink: 1, textAlign: "right" }}>{v}</Text>
                  </View>
                ))}
              </View>
            )}
            {tab === "desc" && (
              <Text style={{ color: t.text, lineHeight: 22 }}>{listing.description || "Bu ilan için açıklama girilmemiş."}</Text>
            )}
            {tab === "loc" && (
              <View style={{ gap: 10 }}>
                <Text style={{ color: t.text, fontWeight: "700" }}><Ionicons name="location" size={15} color={t.brand} /> {locationText(listing.city, listing.district)}</Text>
                <View style={{ height: 240, borderRadius: radius.md, overflow: "hidden" }}>
                  <ListingsMap listings={[listing]} />
                </View>
              </View>
            )}
          </View>
        </View>

        {!isOwner && (
          <Pressable onPress={report} style={{ alignSelf: "center", paddingVertical: 6 }}>
            <Text style={{ color: t.muted, fontSize: 13 }}><Ionicons name="flag-outline" size={13} color={t.muted} /> İlanı şikayet et</Text>
          </Pressable>
        )}
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

      <Modal visible={offerOpen} transparent animationType="slide" onRequestClose={() => setOfferOpen(false)}>
        <Pressable onPress={() => setOfferOpen(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: t.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: space.lg, gap: space.md }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="cash-outline" size={18} color={t.brand} />
              <Text style={{ fontSize: 18, fontWeight: "800", color: t.text }}>Teklif Ver</Text>
            </View>
            <Text style={{ color: t.muted }} numberOfLines={1}>{listing.title}</Text>
            <TextInput
              value={offerAmount}
              onChangeText={setOfferAmount}
              keyboardType="numeric"
              placeholder="Teklifin (₺)"
              placeholderTextColor={t.muted}
              autoFocus
              style={{ backgroundColor: t.bg, borderWidth: 1, borderColor: t.border, borderRadius: radius.md, padding: 12, color: t.text, fontSize: 16 }}
            />
            <Button title="Teklifi Gönder" onPress={submitOffer} loading={sending} disabled={!offerAmount.trim()} />
            <Button title="Vazgeç" variant="ghost" onPress={() => setOfferOpen(false)} />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={reportOpen} transparent animationType="slide" onRequestClose={() => setReportOpen(false)}>
        <Pressable onPress={() => setReportOpen(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: t.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: space.lg, gap: space.md }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="flag-outline" size={18} color={t.danger} />
              <Text style={{ fontSize: 18, fontWeight: "800", color: t.text }}>Şikayet Et</Text>
            </View>
            <Text style={{ color: t.muted }}>Bir sebep seç, ekibimiz inceleyecek.</Text>
            {REPORT_REASONS.map((r) => (
              <Pressable key={r} onPress={() => submitReport(r)}
                style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: t.border, borderRadius: radius.md, padding: space.md }}>
                <Text style={{ color: t.text, fontWeight: "600" }}>{r}</Text>
                <Ionicons name="chevron-forward" size={16} color={t.muted} />
              </Pressable>
            ))}
            <Button title="Vazgeç" variant="ghost" onPress={() => setReportOpen(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}
