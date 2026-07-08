import { Image, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import type { Listing } from "@satiyo/shared";
import { api } from "@/lib/client";
import { useAuth } from "@/lib/auth";
import { radius, space, useTheme } from "@/lib/theme";
import { formatPrice, locationText, timeAgo } from "@/lib/format";

export function ListingCard({ listing, width }: { listing: Listing; width: number }) {
  const t = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [fav, setFav] = useState(!!listing.favorited);
  const cover = listing.images[0]?.url;

  async function toggleFav() {
    if (!user) return router.push("/giris");
    const next = !fav; setFav(next);
    try { next ? await api.addFavorite(listing.id) : await api.removeFavorite(listing.id); }
    catch { setFav(!next); }
  }

  return (
    <Pressable
      onPress={() => router.push(`/ilan/${listing.id}`)}
      style={{ width, backgroundColor: t.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: t.border, overflow: "hidden" }}
    >
      <View style={{ aspectRatio: 4 / 5, backgroundColor: t.surface2 }}>
        {cover ? <Image source={{ uri: cover }} style={{ width: "100%", height: "100%" }} resizeMode="cover" /> :
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><Ionicons name="image-outline" size={40} color={t.muted} /></View>}
        <Pressable onPress={toggleFav} hitSlop={8}
          style={{ position: "absolute", top: 8, right: 8, width: 32, height: 32, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name={fav ? "heart" : "heart-outline"} size={18} color={fav ? t.danger : "#888"} />
        </Pressable>
      </View>
      <View style={{ padding: space.md, gap: 5 }}>
        <Text style={{ fontWeight: "800", fontSize: 16, color: t.text }}>{formatPrice(listing.price, listing.priceType)}</Text>
        <Text numberOfLines={2} style={{ color: t.text, minHeight: 36 }}>{listing.title}</Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text numberOfLines={1} style={{ color: t.muted, fontSize: 11, flex: 1 }}>{locationText(listing.city, listing.district)}</Text>
          <Text style={{ color: t.muted, fontSize: 11 }}>{timeAgo(listing.createdAt)}</Text>
        </View>
      </View>
    </Pressable>
  );
}
