import { useEffect, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { STORE_MEMBERSHIP } from "@satiyo/shared";
import { api } from "@/lib/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { formatNumber } from "@/lib/format";
import { radius, space, useTheme } from "@/lib/theme";
import { Badge, Button, Loading } from "@/components/ui";

export default function ProfileScreen() {
  const t = useTheme();
  const router = useRouter();
  const { user, loading, logout, refresh } = useAuth();
  const { locale, setLocale, t: tr } = useI18n();
  const [form, setForm] = useState({ name: "", city: "", district: "" });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [storeName, setStoreName] = useState("");

  useEffect(() => { if (user) setForm({ name: user.name, city: user.city ?? "", district: user.district ?? "" }); }, [user]);

  if (loading) return <Loading />;
  if (!user) return (
    <View style={{ flex: 1, backgroundColor: t.bg, padding: space.lg, justifyContent: "center", gap: space.md }}>
      <Text style={{ fontSize: 18, fontWeight: "700", color: t.text, textAlign: "center" }}>Giriş yapmadın</Text>
      <Button title="Giriş yap / Kayıt ol" onPress={() => router.push("/giris")} />
    </View>
  );

  const input = { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: radius.md, padding: 12, color: t.text };

  async function save() {
    setBusy(true); setSaved(false);
    try { await api.updateProfile(form); await refresh(); setSaved(true); } finally { setBusy(false); }
  }
  async function activateStore() {
    if (storeName.trim().length < 2) return;
    try { await api.activateStore(storeName.trim()); await refresh(); setStoreOpen(false); Alert.alert("Tebrikler 🏪", "Mağaza üyeliğin aktif!"); }
    catch (e) { Alert.alert("Hata", (e as Error).message); }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: space.lg, gap: space.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
        <View style={{ width: 56, height: 56, borderRadius: 999, backgroundColor: t.brandSoft, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: t.brand, fontWeight: "800", fontSize: 24 }}>{user.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "800", fontSize: 16, color: t.text }}>{user.phone}</Text>
          <Text style={{ color: t.muted, fontSize: 13 }}>Güven skoru: {user.trustScore}</Text>
        </View>
        {user.phoneVerified && <Badge label="✓ Doğrulandı" tone="success" />}
      </View>

      <Text style={{ color: t.muted, fontWeight: "600", fontSize: 13 }}>Ad</Text>
      <TextInput value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} style={input} placeholderTextColor={t.muted} />
      <Text style={{ color: t.muted, fontWeight: "600", fontSize: 13 }}>Şehir</Text>
      <TextInput value={form.city} onChangeText={(v) => setForm({ ...form, city: v })} style={input} placeholderTextColor={t.muted} />
      <Text style={{ color: t.muted, fontWeight: "600", fontSize: 13 }}>Semt</Text>
      <TextInput value={form.district} onChangeText={(v) => setForm({ ...form, district: v })} style={input} placeholderTextColor={t.muted} />

      <Button title={busy ? "Kaydediliyor…" : "Kaydet"} onPress={save} loading={busy} />
      {saved && <Badge label="✓ Kaydedildi" tone="success" />}
      {user.isStore ? (
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center", padding: space.md, borderWidth: 1, borderColor: t.border, borderRadius: radius.md }}>
          <Badge label="Mağaza" tone="brand" />
          <Text style={{ fontWeight: "700", color: t.text }}>{user.storeName}</Text>
        </View>
      ) : (
        <Button title={`🏪 Mağaza Ol — ${formatNumber(STORE_MEMBERSHIP.price / 100)}₺/ay`} onPress={() => setStoreOpen(true)} />
      )}
      <Button title="🔔 Bildirimler" variant="ghost" onPress={() => router.push("/bildirimler")} />
      <Button title={tr("profile.myListings")} variant="ghost" onPress={() => router.push("/ilanlarim")} />

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
        <Text style={{ color: t.muted, flex: 1 }}>{tr("profile.language")}</Text>
        <Pressable onPress={() => setLocale("tr")} style={{ borderWidth: 1, borderColor: locale === "tr" ? t.brand : t.border, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 }}><Text style={{ color: t.text }}>TR</Text></Pressable>
        <Pressable onPress={() => setLocale("en")} style={{ borderWidth: 1, borderColor: locale === "en" ? t.brand : t.border, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 }}><Text style={{ color: t.text }}>EN</Text></Pressable>
      </View>

      <Button title={tr("profile.logout")} variant="ghost" onPress={async () => { await logout(); }} />

      <Modal visible={storeOpen} transparent animationType="slide" onRequestClose={() => setStoreOpen(false)}>
        <Pressable onPress={() => setStoreOpen(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: t.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: space.lg, gap: space.md }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: t.text }}>🏪 Mağaza Üyeliği</Text>
            {STORE_MEMBERSHIP.perks.map((p) => <Text key={p} style={{ color: t.muted }}>• {p}</Text>)}
            <TextInput value={storeName} onChangeText={setStoreName} placeholder="Mağaza adın" placeholderTextColor={t.muted}
              style={{ backgroundColor: t.bg, borderWidth: 1, borderColor: t.border, borderRadius: radius.md, padding: 12, color: t.text }} />
            <Button title={`Üyelik al — ${formatNumber(STORE_MEMBERSHIP.price / 100)}₺ (mock)`} onPress={activateStore} />
            <Text style={{ color: t.muted, fontSize: 11, textAlign: "center" }}>Geliştirme modunda ödeme simüle edilir.</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}
