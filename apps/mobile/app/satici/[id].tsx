import { Dimensions, FlatList, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/client";
import { space, useTheme } from "@/lib/theme";
import { timeAgo } from "@/lib/format";
import { ListingCard } from "@/components/ListingCard";
import { Empty, Loading } from "@/components/ui";

export default function SellerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTheme();
  const { data: seller } = useQuery({ queryKey: ["seller", id], queryFn: () => api.getSeller(id!) });
  const { data: listings, isLoading } = useQuery({ queryKey: ["seller-listings", id], queryFn: () => api.sellerListings(id!) });
  const cardW = (Dimensions.get("window").width - space.lg * 2 - space.md) / 2;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ padding: space.lg, flexDirection: "row", gap: space.md, alignItems: "center" }}>
        <View style={{ width: 56, height: 56, borderRadius: 999, backgroundColor: t.brandSoft, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: t.brand, fontWeight: "800", fontSize: 24 }}>{(seller?.storeName ?? seller?.name ?? "?").charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: "800", color: t.text }}>{seller?.storeName ?? seller?.name ?? "…"}</Text>
          <Text style={{ color: t.muted, fontSize: 13 }}>
            {seller?.ratingCount ? `⭐ ${seller.ratingAvg?.toFixed(1)} (${seller.ratingCount})` : "Henüz puan yok"}
            {seller ? ` · Üyelik ${timeAgo(seller.createdAt)}` : ""}
          </Text>
        </View>
      </View>
      {isLoading ? <Loading /> :
        !listings || listings.items.length === 0 ? <Empty text="Aktif ilan yok." /> :
        <FlatList
          data={listings.items} keyExtractor={(l) => l.id} numColumns={2}
          columnWrapperStyle={{ gap: space.md, paddingHorizontal: space.lg }}
          contentContainerStyle={{ gap: space.md, paddingBottom: space.xxl }}
          renderItem={({ item }) => <ListingCard listing={item} width={cardW} />}
        />}
    </View>
  );
}
