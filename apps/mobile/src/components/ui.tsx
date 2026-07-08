import { ActivityIndicator, Pressable, Text, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { radius, space, useTheme } from "@/lib/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

export function Button({
  title, onPress, variant = "primary", disabled, loading, style,
}: {
  title: string; onPress: () => void; variant?: "primary" | "ghost";
  disabled?: boolean; loading?: boolean; style?: ViewStyle;
}) {
  const t = useTheme();
  const bg = variant === "primary" ? t.brand : "transparent";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [{
        backgroundColor: bg, borderWidth: variant === "ghost" ? 1 : 0, borderColor: t.border,
        borderRadius: radius.md, paddingVertical: 13, paddingHorizontal: 18,
        alignItems: "center", justifyContent: "center", opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
      }, style]}
    >
      {loading ? <ActivityIndicator color={variant === "primary" ? "#fff" : t.brand} /> :
        <Text style={{ color: variant === "primary" ? "#fff" : t.text, fontWeight: "700", fontSize: 15 }}>{title}</Text>}
    </Pressable>
  );
}

export function Badge({ label, tone = "default" }: { label: string; tone?: "default" | "brand" | "accent" | "success" }) {
  const t = useTheme();
  const map = {
    default: { bg: t.surface2, fg: t.muted },
    brand: { bg: t.brandSoft, fg: t.brand },
    accent: { bg: "#fff3e8", fg: t.accent },
    success: { bg: "#e8f7ee", fg: t.success },
  }[tone];
  return (
    <View style={{ backgroundColor: map.bg, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, alignSelf: "flex-start" }}>
      <Text style={{ color: map.fg, fontSize: 12, fontWeight: "600" }}>{label}</Text>
    </View>
  );
}

export function Empty({ icon = "search-outline", text }: { icon?: IconName; text: string }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: "center", padding: space.xxl, gap: space.sm }}>
      <Ionicons name={icon} size={44} color={t.muted} />
      <Text style={{ color: t.muted, textAlign: "center" }}>{text}</Text>
    </View>
  );
}

export function Loading() {
  const t = useTheme();
  return <View style={{ padding: space.xxl, alignItems: "center" }}><ActivityIndicator color={t.brand} /></View>;
}
