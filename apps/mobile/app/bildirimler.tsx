import { useEffect } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/client";
import { useAuth } from "@/lib/auth";
import { radius, space, useTheme } from "@/lib/theme";
import { timeAgo } from "@/lib/format";
import { Empty, Loading } from "@/components/ui";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

// Bildirim türüne göre renkli ikon (letgo tarzı). Bilinmeyen tür sistem ikonuna düşer.
const TYPE_META: Record<string, { icon: IoniconName; color: string }> = {
  message: { icon: "chatbubble-ellipses", color: "#3b82f6" },
  offer: { icon: "pricetag", color: "#f59e0b" },
  favorite: { icon: "heart", color: "#ef4444" },
  saved_search: { icon: "search", color: "#8b5cf6" },
  system: { icon: "notifications", color: "#64748b" },
};

export default function NotificationsScreen() {
  const t = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ["notifications"], queryFn: () => api.notifications(), enabled: !!user });

  useEffect(() => {
    if (user && data && data.some((n) => !n.readAt)) {
      api.markNotificationsRead().then(() => qc.invalidateQueries({ queryKey: ["notifications"] })).catch(() => {});
    }
  }, [user, data, qc]);

  if (isLoading) return <Loading />;
  if (!data || data.length === 0) return <Empty icon="notifications-outline" text="Bildirim yok. Bir aramayı kaydet, ilgili ilanlarda haber verelim." />;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: t.bg }}
      data={data} keyExtractor={(n) => n.id}
      contentContainerStyle={{ padding: space.lg, gap: space.sm }}
      renderItem={({ item: n }) => {
        const meta = TYPE_META[n.type] ?? TYPE_META.system!;
        const go = () => {
          if (n.data?.conversationId) router.push(`/sohbet/${n.data.conversationId}`);
          else if (n.data?.listingId) router.push(`/ilan/${n.data.listingId}`);
        };
        return (
          <Pressable onPress={go}
            style={{ flexDirection: "row", gap: space.md, alignItems: "center", backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderLeftWidth: n.readAt ? 1 : 3, borderLeftColor: n.readAt ? t.border : meta.color, borderRadius: radius.md, padding: space.md }}>
            <View style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: meta.color + "22", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={meta.icon} size={20} color={meta.color} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                <Text style={{ fontWeight: "700", color: t.text, flex: 1 }} numberOfLines={1}>{n.title}</Text>
                <Text style={{ color: t.muted, fontSize: 11 }}>{timeAgo(n.createdAt)}</Text>
              </View>
              {n.body ? <Text style={{ color: t.muted, marginTop: 2 }} numberOfLines={2}>{n.body}</Text> : null}
            </View>
          </Pressable>
        );
      }}
    />
  );
}
