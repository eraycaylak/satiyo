import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

/**
 * Uygulama açılış animasyonu (GSAP tarzı): logo yaylanarak büyür + parlar,
 * slogan aşağıdan kayar, sonra tüm katman yumuşakça kaybolur.
 * RN Animated (yerleşik, ekstra bağımlılık yok).
 */
export function SplashIntro() {
  const [hidden, setHidden] = useState(false);
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const taglineY = useRef(new Animated.Value(16)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const container = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.timing(ring, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(taglineY, { toValue: 0, duration: 380, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(taglineOpacity, { toValue: 1, duration: 380, useNativeDriver: true }),
      ]),
      Animated.delay(650),
      Animated.timing(container, { toValue: 0, duration: 450, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(() => setHidden(true));
  }, []);

  if (hidden) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.bg, { opacity: container }]} pointerEvents="none">
      <View style={styles.center}>
        <Animated.View
          style={[styles.ring, {
            opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
            transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.8, 2.2] }) }],
          }]}
        />
        <Animated.Text style={[styles.logo, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
          Satıyo
        </Animated.Text>
        <Animated.Text style={[styles.tagline, { opacity: taglineOpacity, transform: [{ translateY: taglineY }] }]}>
          Evinde para var
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bg: { backgroundColor: "#f0434c", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  center: { alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", width: 160, height: 160, borderRadius: 80, borderWidth: 3, borderColor: "#ffffff" },
  logo: { fontSize: 64, fontWeight: "900", color: "#ffffff", letterSpacing: -1 },
  tagline: { marginTop: 10, fontSize: 16, color: "rgba(255,255,255,0.92)", fontWeight: "600" },
});
