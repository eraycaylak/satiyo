import { Linking, Pressable, ScrollView, Share, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/client";
import { radius, space, useTheme } from "@/lib/theme";
import { Loading } from "@/components/ui";

const tl = (minor: number) => new Intl.NumberFormat("tr-TR").format(Math.round(minor / 100));

export default function DavetScreen() {
  const t = useTheme();
  const { data, isLoading } = useQuery({ queryKey: ["referral"], queryFn: () => api.referral() });

  if (isLoading || !data) return <Loading />;
  const link = data.link ?? "";
  const reward = tl(data.rewardMinor ?? 5000);
  const msg = `Satıyo'ya davetlisin! Reklamsız ikinci-el pazar. İlk ilanını verince ikimize de ${reward} TL öne çıkarma kredisi 💰 ${link}`;

  async function shareTo(net: "native" | "wa" | "x" | "fb") {
    try {
      if (net === "wa") await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(msg)}`);
      else if (net === "x") await Linking.openURL(`https://twitter.com/intent/tweet?text=${encodeURIComponent(msg)}`);
      else if (net === "fb") await Linking.openURL(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`);
      else await Share.share({ message: msg, url: link });
    } catch { /* iptal — sessiz */ }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: space.lg, gap: space.lg }}>
      <View style={{ alignItems: "center", gap: 6 }}>
        <Text style={{ fontSize: 48 }}>🎁</Text>
        <Text style={{ fontSize: 22, fontWeight: "800", color: t.text, textAlign: "center" }}>Arkadaşını davet et, kazan</Text>
        <Text style={{ color: t.muted, textAlign: "center", lineHeight: 20 }}>
          Davet ettiğin arkadaşın ilk ilanını verince <Text style={{ color: t.brand, fontWeight: "800" }}>ikinize de {reward} TL</Text> öne çıkarma kredisi.
        </Text>
      </View>

      <View style={{ flexDirection: "row", gap: 8, alignItems: "center", backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: radius.md, padding: 8 }}>
        <Text numberOfLines={1} style={{ flex: 1, color: t.text, fontSize: 13, paddingHorizontal: 6 }}>{link}</Text>
        <Pressable onPress={() => shareTo("native")} style={{ backgroundColor: t.brand, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 9 }}>
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>Paylaş</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", gap: 10, justifyContent: "center" }}>
        {[
          { key: "native", icon: "share-social" as const, color: t.text },
          { key: "wa", icon: "logo-whatsapp" as const, color: "#25D366" },
          { key: "x", icon: "logo-twitter" as const, color: t.text },
          { key: "fb", icon: "logo-facebook" as const, color: "#1877F2" },
        ].map((b) => (
          <Pressable key={b.key} onPress={() => shareTo(b.key as "native" | "wa" | "x" | "fb")}
            style={{ width: 52, height: 52, borderRadius: 999, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name={b.icon} size={24} color={b.color} />
          </Pressable>
        ))}
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-around", backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: radius.lg, padding: space.lg }}>
        <View style={{ alignItems: "center" }}><Text style={{ fontSize: 22, fontWeight: "800", color: t.text }}>{data.invited}</Text><Text style={{ color: t.muted, fontSize: 12 }}>Davet</Text></View>
        <View style={{ alignItems: "center" }}><Text style={{ fontSize: 22, fontWeight: "800", color: t.text }}>{data.rewarded}</Text><Text style={{ color: t.muted, fontSize: 12 }}>Ödüllü</Text></View>
        <View style={{ alignItems: "center" }}><Text style={{ fontSize: 22, fontWeight: "800", color: t.brand }}>{tl(data.earnedMinor)} ₺</Text><Text style={{ color: t.muted, fontSize: 12 }}>Kazanç</Text></View>
      </View>

      <Text style={{ color: t.muted, fontSize: 12, textAlign: "center" }}>
        Krediler ilan öne çıkarmada (boost) kullanılır. Kendini davet etmek geçersizdir.
      </Text>
    </ScrollView>
  );
}
