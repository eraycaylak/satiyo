import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";

/**
 * Yüzen "Arkadaşını Davet Et" hediye-kutusu butonu (FAB).
 * Ana gezinme ekranlarında (Keşfet/Favoriler/Mesajlar/Profil) sağ altta, tab bar'ın
 * üstünde belirir; dokununca davet ekranına gider (giriş yoksa önce girişe). Modal ve
 * detay ekranlarında gizlenir ki içerik/alt aksiyon çubuklarını örtmesin.
 *
 * Anında değil, açılıştan ~3.5 sn SONRA yumuşak bir "pop" ile belirir (dikkat çeker,
 * ilk saniyelerde içeriği örtmez). İlk belirmeden sonra sekmeler arası hep görünür kalır.
 */

// Yalnız bu ana sekme köklerinde göster (detay/modal/sohbet'te gizle).
const SHOW_ON = new Set(["/", "/favoriler", "/mesajlar", "/profil"]);
const APPEAR_DELAY_MS = 3500; // açılıştan ne kadar sonra belirsin

// Oturum boyunca yalnız BİR kez gecikir; ilk pop'tan sonra sekme değişince tekrar beklemez.
let hasAppeared = false;

function shouldShow(pathname: string): boolean {
  return SHOW_ON.has(pathname);
}

export function ReferralFab() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const t = useTheme();
  const { user } = useAuth();

  const show = shouldShow(pathname);
  const [ready, setReady] = useState(hasAppeared);
  const anim = useRef(new Animated.Value(hasAppeared ? 1 : 0)).current;

  useEffect(() => {
    if (!show || hasAppeared) return;
    const timer = setTimeout(() => {
      hasAppeared = true;
      setReady(true);
      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
        tension: 70,
      }).start();
    }, APPEAR_DELAY_MS);
    return () => clearTimeout(timer);
  }, [show, anim]);

  if (!show || !ready) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        right: 16,
        bottom: insets.bottom + 62,
        opacity: anim,
        transform: [
          { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
          { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
        ],
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Arkadaşını davet et, 50 TL kazan"
        onPress={() => router.push(user ? "/davet" : "/giris")}
        hitSlop={8}
        style={({ pressed }) => ({
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: t.brand,
          alignItems: "center",
          justifyContent: "center",
          transform: [{ scale: pressed ? 0.94 : 1 }],
          shadowColor: "#000",
          shadowOpacity: 0.28,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 8,
        })}
      >
        <Ionicons name="gift" size={26} color="#fff" />
      </Pressable>
      {/* Ödül rozeti — davet ödülü (50 ₺ boost kredisi) hooku */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: -6,
          right: -6,
          backgroundColor: t.accent,
          borderRadius: 999,
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderWidth: 2,
          borderColor: t.bg,
        }}
      >
        <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>50₺</Text>
      </View>
    </Animated.View>
  );
}
