import { useEffect, useState, type ReactNode } from "react";
import { Linking, Platform, Pressable, Text, View } from "react-native";
import Constants from "expo-constants";
import { isUpdateRequired, type AppConfig } from "@satiyo/shared";
import { api } from "@/lib/client";
import { useTheme } from "@/lib/theme";

/**
 * Zorunlu güncelleme kapısı (C2). Açılışta /config'i çeker; app sürümü minVersion'un
 * altındaysa tam-ekran engelleyici gösterir (children render edilmez). Config çekilemezse
 * FAIL-OPEN — asla kilitlemez.
 */
export function VersionGate({ children }: { children: ReactNode }) {
  const t = useTheme();
  const [blocked, setBlocked] = useState<AppConfig | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const cfg = await api.config();
        const cur = Constants.expoConfig?.version ?? "0.0.0";
        const min = Platform.OS === "ios" ? cfg.minVersion.ios : cfg.minVersion.android;
        if (alive && isUpdateRequired(cur, min)) setBlocked(cfg);
      } catch {
        /* fail-open: config yoksa/erişilemezse bloklama */
      }
    })();
    return () => { alive = false; };
  }, []);

  if (!blocked) return <>{children}</>;

  const url = Platform.OS === "ios" ? blocked.storeUrl.ios : blocked.storeUrl.android;
  return (
    <View style={{ flex: 1, backgroundColor: t.bg, alignItems: "center", justifyContent: "center", padding: 28, gap: 14 }}>
      <Text style={{ fontSize: 52 }}>🚀</Text>
      <Text style={{ fontSize: 22, fontWeight: "800", color: t.text, textAlign: "center" }}>Yeni sürüm gerekli</Text>
      <Text style={{ color: t.muted, textAlign: "center", fontSize: 15, lineHeight: 22 }}>
        {blocked.message || "Devam etmek için Satıyo'yu güncelle. Bu güncelleme önemli iyileştirmeler ve güvenlik düzeltmeleri içeriyor."}
      </Text>
      <Pressable onPress={() => url && Linking.openURL(url)} style={{ backgroundColor: t.brand, borderRadius: 14, paddingVertical: 15, paddingHorizontal: 40, marginTop: 8 }}>
        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>Şimdi Güncelle</Text>
      </Pressable>
    </View>
  );
}
