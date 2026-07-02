import { Dimensions, FlatList, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/client";
import { useAuth } from "@/lib/auth";
import { space, useTheme } from "@/lib/theme";
import { ListingCard } from "@/components/ListingCard";
import { Button, Empty, Loading } from "@/components/ui";

export default function FavoritesScreen() {
  const t = useTheme();
  const router = useRouter();
  const { user, loading } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ["favorites"], queryFn: () => api.favorites(), enabled: !!user });
  const cardW = (Dimensions.get("window").width - space.lg * 2 - space.md) / 2;

  if (loading) return <Loading />;
  if (!user) return (
    <View style={{ flex: 1, backgroundColor: t.bg, padding: space.lg, justifyContent: "center", gap: space.md }}>
      <Empty icon="♥" text="Favorilerini görmek için giriş yap." />
      <Button title="Giriş yap" onPress={() => router.push("/giris")} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {isLoading ? <Loading /> :
        !data || data.items.length === 0 ? <Empty icon="♥" text="Henüz favori yok." /> :
        <FlatList
          data={data.items} keyExtractor={(l) => l.id} numColumns={2}
          columnWrapperStyle={{ gap: space.md, paddingHorizontal: space.lg }}
          contentContainerStyle={{ gap: space.md, paddingVertical: space.lg }}
          renderItem={({ item }) => <ListingCard listing={item} width={cardW} />}
        />}
    </View>
  );
}
