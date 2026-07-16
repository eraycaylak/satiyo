import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { radius, space, useTheme } from "@/lib/theme";
import { detectLocation } from "@/lib/location";
import { loadLocationPref, setLocationPref } from "@/lib/location-pref";

// İlk açılışta bir kez sorulan kapsam modal'ı:
// "Bulunduğun ildeki ilanlar mı, tüm Türkiye mi?"
// Konum izni YALNIZCA kullanıcı "Bulunduğum il"i seçince istenir.
// Splash animasyonuyla çakışmasın diye kısa gecikmeyle görünür.
const SPLASH_DELAY_MS = 2600;

export function LocationGate() {
  const t = useTheme();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    loadLocationPref().then((pref) => {
      if (!alive || pref) return; // tercih zaten var → sorma
      const timer = setTimeout(() => alive && setVisible(true), SPLASH_DELAY_MS);
      return () => clearTimeout(timer);
    });
    return () => {
      alive = false;
    };
  }, []);

  async function chooseLocal() {
    setBusy(true);
    setNote(null);
    try {
      const loc = await detectLocation();
      if (loc?.province) {
        await setLocationPref({ scope: "local", city: loc.province });
        setVisible(false);
      } else {
        // İzin yok / il çözülemedi → tüm Türkiye'ye düş, kullanıcıyı bilgilendir.
        setNote("Konumun alınamadı. Şimdilik tüm Türkiye gösteriliyor — istediğinde ilini üstten seçebilirsin.");
        await setLocationPref({ scope: "all", city: "" });
        setTimeout(() => setVisible(false), 1400);
      }
    } finally {
      setBusy(false);
    }
  }

  async function chooseAll() {
    setBusy(true);
    try {
      await setLocationPref({ scope: "all", city: "" });
      setVisible(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: t.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: space.xl, paddingBottom: space.xxl, gap: space.lg }}>
          <View style={{ alignItems: "center", gap: space.sm }}>
            <View style={{ width: 64, height: 64, borderRadius: 999, backgroundColor: t.brandSoft, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="location" size={30} color={t.brand} />
            </View>
            <Text style={{ fontSize: 22, fontWeight: "800", color: t.text, textAlign: "center" }}>İlanları nasıl görelim?</Text>
            <Text style={{ fontSize: 14, color: t.muted, textAlign: "center", lineHeight: 20 }}>
              Evinde para var. Bulunduğun ildeki ilanları öne çıkaralım mı, yoksa tüm Türkiye'yi mi görmek istersin?
            </Text>
          </View>

          {note ? (
            <Text style={{ fontSize: 13, color: t.accent, textAlign: "center" }}>{note}</Text>
          ) : null}

          <Pressable
            onPress={chooseLocal}
            disabled={busy}
            style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: t.brand, borderRadius: radius.md, paddingVertical: 16, paddingHorizontal: 18, opacity: busy ? 0.6 : 1 }}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons name="navigate" size={22} color="#fff" />
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>Bulunduğum ildekiler</Text>
              <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 12 }}>Konumuna en yakın ilanlar</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </Pressable>

          <Pressable
            onPress={chooseAll}
            disabled={busy}
            style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: radius.md, paddingVertical: 16, paddingHorizontal: 18, opacity: busy ? 0.6 : 1 }}
          >
            <Text style={{ fontSize: 22 }}>🇹🇷</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.text, fontSize: 16, fontWeight: "800" }}>Tüm Türkiye</Text>
              <Text style={{ color: t.muted, fontSize: 12 }}>Her ildeki ilanlar</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={t.muted} />
          </Pressable>

          <Text style={{ fontSize: 12, color: t.muted, textAlign: "center" }}>
            Bu seçimi sonradan ana ekranın üstünden değiştirebilirsin.
          </Text>
        </View>
      </View>
    </Modal>
  );
}
