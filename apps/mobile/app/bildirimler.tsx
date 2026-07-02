import { useEffect } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/client";
import { useAuth } from "@/lib/auth";
import { radius, space, useTheme } from "@/lib/theme";
import { timeAgo } from "@/lib/format";
import { Empty, Loading } from "@/components/ui";

export default function NotificationsScreen() {
  const t = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ["notifications"], queryFn: () => api.notifications(), enabled: !!user });

  useEffect(() => {
    if (user && data && data.some((n) => !n.readAt)) {
      api.markNotificationsRead().then(() => qc.invalidateQueries({ queryKey: ["notifications"] }));
    }
  }, [user, data, qc]);

  if (isLoading) return <Loading />;
  if (!data || data.length === 0) return <Empty icon="🔔" text="Bildirim yok. Bir aramayı kaydet, eşleşen ilanlarda haber verelim." />;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: t.bg }}
      data={data} keyExtractor={(n) => n.id}
      contentContainerStyle={{ padding: space.lg, gap: space.sm }}
      renderItem={({ item: n }) => (
        <Pressable onPress={() => n.data?.listingId && router.push(`/ilan/${n.data.listingId}`)}
          style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderLeftWidth: n.readAt ? 1 : 3, borderLeftColor: n.readAt ? t.border : t.brand, borderRadius: radius.md, padding: space.md }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontWeight: "700", color: t.text }}>{n.title}</Text>
            <Text style={{ color: t.muted, fontSize: 11 }}>{timeAgo(n.createdAt)}</Text>
          </View>
          {n.body ? <Text style={{ color: t.muted, marginTop: 2 }}>{n.body}</Text> : null}
        </Pressable>
      )}
    />
  );
}
