import { useMemo } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CREDIT_PACKAGES } from "@satiyo/shared";
import { api } from "@/lib/client";
import { useCredits } from "@/lib/iap";
import { radius, space, useTheme } from "@/lib/theme";
import { Loading } from "@/components/ui";

const tl = (minor: number) => new Intl.NumberFormat("tr-TR").format(Math.round(minor / 100));

export default function KrediScreen() {
  const t = useTheme();
  const qc = useQueryClient();
  const wallet = useQuery({ queryKey: ["wallet"], queryFn: () => api.wallet() });
  const { products, loading, purchasing, buy, available } = useCredits();

  // productId → mağaza fiyat metni (localizedPrice)
  const priceById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const p of products) m[p.productId] = p.localizedPrice;
    return m;
  }, [products]);

  if (Platform.OS !== "ios") {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, alignItems: "center", justifyContent: "center", padding: space.lg }}>
        <Text style={{ color: t.muted, textAlign: "center" }}>Kredi satın alma şu an yalnızca iOS'ta kullanılabilir.</Text>
      </View>
    );
  }

  // Native IAP modülü yok (eski/OTA binary) → çökme yerine "yakında" mesajı göster.
  if (!available) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, alignItems: "center", justifyContent: "center", padding: space.lg, gap: 10 }}>
        <Text style={{ fontSize: 40 }}>🕓</Text>
        <Text style={{ color: t.text, fontWeight: "700", fontSize: 16, textAlign: "center" }}>Kredi yükleme çok yakında</Text>
        <Text style={{ color: t.muted, textAlign: "center", lineHeight: 20 }}>Bu özellik uygulamanın bir sonraki güncellemesiyle geliyor. Lütfen App Store'dan güncelle.</Text>
      </View>
    );
  }

  async function purchase(sku: string) {
    try {
      const granted = await buy(sku);
      await qc.invalidateQueries({ queryKey: ["wallet"] });
      Alert.alert("Tamam", granted > 0 ? `${tl(granted)} ₺ kredi yüklendi.` : "Satın alım işlendi.");
    } catch (e) {
      const msg = (e as { message?: string })?.message ?? "";
      if (/cancel/i.test(msg)) return; // kullanıcı iptal etti
      Alert.alert("Satın alma başarısız", msg || "Tekrar deneyin.");
    }
  }

  const balance = wallet.data?.balance ?? 0;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: space.lg, gap: space.lg }}>
      <View style={{ alignItems: "center", gap: 6 }}>
        <Text style={{ fontSize: 44 }}>💰</Text>
        <Text style={{ fontSize: 22, fontWeight: "800", color: t.text }}>Kredi Yükle</Text>
        <Text style={{ color: t.muted, textAlign: "center", lineHeight: 20 }}>
          Kredi, ilanlarını öne çıkarmada (boost) kullanılır. 1 kredi = 1 ₺.
        </Text>
        <View style={{ marginTop: 6, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: radius.lg, paddingHorizontal: 18, paddingVertical: 10 }}>
          <Text style={{ color: t.muted, fontSize: 12, textAlign: "center" }}>Bakiye</Text>
          <Text style={{ fontSize: 24, fontWeight: "800", color: t.brand, textAlign: "center" }}>{tl(balance)} ₺</Text>
        </View>
      </View>

      {loading ? (
        <Loading />
      ) : (
        <View style={{ gap: 12 }}>
          {CREDIT_PACKAGES.map((pkg) => {
            const price = priceById[pkg.productId];
            const busy = purchasing === pkg.productId;
            return (
              <Pressable
                key={pkg.productId}
                disabled={!!purchasing}
                onPress={() => purchase(pkg.productId)}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 12,
                  backgroundColor: t.surface, borderWidth: 1,
                  borderColor: pkg.highlight ? t.brand : t.border,
                  borderRadius: radius.lg, padding: space.lg, opacity: purchasing && !busy ? 0.5 : 1,
                }}
              >
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ fontSize: 18, fontWeight: "800", color: t.text }}>{pkg.label}</Text>
                    {pkg.bonus ? (
                      <View style={{ backgroundColor: t.brand, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>{pkg.bonus}</Text>
                      </View>
                    ) : null}
                  </View>
                  {pkg.highlight ? <Text style={{ color: t.brand, fontSize: 12, marginTop: 2 }}>{pkg.highlight}</Text> : null}
                </View>
                <View style={{ minWidth: 84, height: 40, borderRadius: radius.md, backgroundColor: t.brand, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 }}>
                  {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "800" }}>{price ?? `${pkg.approxTry} ₺`}</Text>}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      <Text style={{ color: t.muted, fontSize: 11, textAlign: "center", lineHeight: 16 }}>
        Ödeme Apple App Store üzerinden alınır. Krediler iade edilmez ve nakde çevrilemez; yalnızca uygulama içi öne çıkarma için kullanılır.
      </Text>
    </ScrollView>
  );
}
