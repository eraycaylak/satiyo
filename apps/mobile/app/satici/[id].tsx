import { Alert, Dimensions, FlatList, Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/client";
import { useAuth } from "@/lib/auth";
import { space, useTheme } from "@/lib/theme";
import { timeAgo } from "@/lib/format";
import { ListingCard } from "@/components/ListingCard";
import { Empty, Loading } from "@/components/ui";

export default function SellerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: seller } = useQuery({ queryKey: ["seller", id], queryFn: () => api.getSeller(id!) });
  const { data: listings, isLoading } = useQuery({ queryKey: ["seller-listings", id], queryFn: () => api.sellerListings(id!) });
  const cardW = (Dimensions.get("window").width - space.lg * 2 - space.md) / 2;

  function blockSeller() {
    if (!user) return router.push("/giris");
    Alert.alert(
      "Kullanıcıyı engelle",
      `${seller?.storeName ?? seller?.name ?? "Bu kullanıcı"} artık seninle mesajlaşamaz ve ilanları önerilmez.`,
      [
        { text: "Vazgeç", style: "cancel" },
        { text: "Engelle", style: "destructive", onPress: async () => {
          try {
            await api.blockUser(id!);
            // İçeriği feed'den ANINDA kaldır (App Store 1.2)
            await qc.invalidateQueries({ queryKey: ["listings"] });
            await qc.invalidateQueries({ queryKey: ["recommendations"] });
            Alert.alert("Engellendi", "Kullanıcı engellendi ve ilanları akışından kaldırıldı.");
            router.back();
          } catch (e) { Alert.alert("Hata", (e as Error).message); }
        } },
      ],
    );
  }

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
        {seller && user?.id !== seller.id && (
          <Pressable onPress={blockSeller} hitSlop={10}>
            <Text style={{ color: t.danger, fontSize: 13, fontWeight: "600" }}>⊘ Engelle</Text>
          </Pressable>
        )}
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
