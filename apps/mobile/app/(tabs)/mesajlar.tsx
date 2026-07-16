import { FlatList, Image, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/client";
import { useAuth } from "@/lib/auth";
import { radius, space, useTheme } from "@/lib/theme";
import { formatPrice, timeAgo } from "@/lib/format";
import { Button, Empty, Loading } from "@/components/ui";

export default function ConversationsScreen() {
  const t = useTheme();
  const router = useRouter();
  const { user, loading } = useAuth();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["conversations"], queryFn: () => api.conversations(), enabled: !!user, refetchInterval: 15000 });

  if (loading) return <Loading />;
  if (!user) return (
    <View style={{ flex: 1, backgroundColor: t.bg, padding: space.lg, justifyContent: "center", gap: space.md }}>
      <Empty icon="chatbubbles-outline" text="Mesajların için giriş yap." />
      <Button title="Giriş yap" onPress={() => router.push("/giris")} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {isLoading ? <Loading /> :
        isError ? (
          <View style={{ flex: 1, padding: space.lg, justifyContent: "center", gap: space.md }}>
            <Empty icon="alert-circle-outline" text="Mesajlar yüklenemedi. İnternet bağlantını kontrol edip tekrar dene." />
            <Button title="Yeniden dene" variant="ghost" onPress={() => refetch()} />
          </View>
        ) :
        !data || data.length === 0 ? <Empty icon="chatbubbles-outline" text="Henüz mesajın yok." /> :
        <FlatList
          data={data} keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: space.lg, gap: space.sm }}
          renderItem={({ item: cv }) => (
            <Pressable onPress={() => router.push(`/sohbet/${cv.id}`)}
              style={{ flexDirection: "row", gap: space.md, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: radius.lg, padding: space.md }}>
              <View style={{ width: 52, height: 52, borderRadius: radius.md, overflow: "hidden", backgroundColor: t.surface2 }}>
                {cv.listing?.coverUrl ? <Image source={{ uri: cv.listing.coverUrl }} style={{ width: "100%", height: "100%" }} /> :
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><Ionicons name="image-outline" size={22} color={t.muted} /></View>}
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontWeight: "700", color: t.text }} numberOfLines={1}>{cv.otherUser?.name ?? "Kullanıcı"}</Text>
                  <Text style={{ color: t.muted, fontSize: 11 }}>{timeAgo(cv.lastMessageAt)}</Text>
                </View>
                <Text numberOfLines={1} style={{ color: t.muted, fontSize: 13 }}>
                  {cv.lastMessage?.type === "offer" ? <><Ionicons name="cash-outline" size={13} color={t.muted} /> Teklif: {formatPrice(cv.lastMessage.offerAmount ?? 0)}</> : cv.lastMessage?.body ?? "—"}
                </Text>
                <Text numberOfLines={1} style={{ color: t.muted, fontSize: 11 }}>{cv.listing?.title}</Text>
              </View>
              {!!cv.unreadCount && (
                <View style={{ backgroundColor: t.brand, borderRadius: 999, minWidth: 22, height: 22, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 }}>
                  <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>{cv.unreadCount}</Text>
                </View>
              )}
            </Pressable>
          )}
        />}
    </View>
  );
}
