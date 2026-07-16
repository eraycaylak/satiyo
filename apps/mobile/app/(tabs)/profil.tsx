import { useEffect, useState, type ComponentProps } from "react";
import { Alert, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { STORE_MEMBERSHIP } from "@satiyo/shared";
import { api } from "@/lib/client";
import { useAuth } from "@/lib/auth";
import { CityPicker } from "@/components/CityPicker";
import { useI18n } from "@/lib/i18n";
import { formatNumber, timeAgo } from "@/lib/format";
import { radius, space, useTheme } from "@/lib/theme";
import { Badge, Button, Loading } from "@/components/ui";

// Dijital mağaza üyeliği App Store'da IAP gerektirir (Guideline 3.1.1). IAP kurulana kadar gizli.
const SHOW_PAID_FEATURES = false;
const WEB = "https://satiyo.app";
const SUPPORT = "mailto:destek@satiyo.app";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

/** letgo tarzı renkli-ikonlu menü satırı. */
function Row({ icon, color, label, onPress, badge, danger }: {
  icon: IoniconName; color: string; label: string; onPress: () => void; badge?: number; danger?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: 11, opacity: pressed ? 0.6 : 1 })}>
      <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: color + "22", alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={{ flex: 1, fontSize: 15, fontWeight: "600", color: danger ? t.danger : t.text }}>{label}</Text>
      {badge ? (
        <View style={{ backgroundColor: t.brand, borderRadius: 999, minWidth: 20, paddingHorizontal: 6, paddingVertical: 1, alignItems: "center" }}>
          <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>{badge > 99 ? "99+" : badge}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={t.muted} />
    </Pressable>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: radius.md, paddingVertical: 12, alignItems: "center" }}>
      <Text style={{ fontWeight: "800", fontSize: 16, color: t.text }} numberOfLines={1}>{value}</Text>
      <Text style={{ color: t.muted, fontSize: 12, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const t = useTheme();
  const router = useRouter();
  const { user, loading, logout, refresh } = useAuth();
  const { locale, setLocale, t: tr } = useI18n();
  const [form, setForm] = useState({ name: "", city: "", district: "" });
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [storeName, setStoreName] = useState("");

  const { data: myL } = useQuery({ queryKey: ["my-listings"], queryFn: () => api.myListings(), enabled: !!user });
  const { data: notifs } = useQuery({ queryKey: ["notifications"], queryFn: () => api.notifications(), enabled: !!user });

  useEffect(() => { if (user) setForm({ name: user.name, city: user.city ?? "", district: user.district ?? "" }); }, [user]);

  if (loading) return <Loading />;
  if (!user) return (
    <View style={{ flex: 1, backgroundColor: t.bg, padding: space.lg, justifyContent: "center", gap: space.md }}>
      <Text style={{ fontSize: 18, fontWeight: "700", color: t.text, textAlign: "center" }}>Giriş yapmadın</Text>
      <Button title="Giriş yap / Kayıt ol" onPress={() => router.push("/giris")} />
    </View>
  );

  const listingCount = myL?.items.length ?? 0;
  const unread = notifs?.filter((n) => !n.readAt).length ?? 0;
  const input = { backgroundColor: t.bg, borderWidth: 1, borderColor: t.border, borderRadius: radius.md, padding: 12, color: t.text };
  const card = { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: radius.lg, paddingHorizontal: space.md };

  async function save() {
    if (form.name.trim().length < 2) { Alert.alert("Eksik", "Ad en az 2 karakter olmalı."); return; }
    setBusy(true);
    try {
      await api.updateProfile({ ...form, name: form.name.trim() });
      await refresh();
      setEditOpen(false);
    } catch (e) { Alert.alert("Hata", (e as Error).message); }
    finally { setBusy(false); }
  }
  async function activateStore() {
    if (storeName.trim().length < 2) return;
    try { await api.activateStore(storeName.trim()); await refresh(); setStoreOpen(false); Alert.alert("Tebrikler 🏪", "Mağaza üyeliğin aktif!"); }
    catch (e) { Alert.alert("Hata", (e as Error).message); }
  }
  function deleteAccount() {
    Alert.alert(
      "Hesabı sil",
      "Tüm ilanların, mesajların, favorilerin ve verilerin kalıcı olarak silinecek. Bu işlem geri alınamaz. Emin misin?",
      [
        { text: "Vazgeç", style: "cancel" },
        { text: "Hesabımı Sil", style: "destructive", onPress: async () => {
          try { await api.deleteAccount(); await logout(); } catch (e) { Alert.alert("Hata", (e as Error).message); }
        } },
      ],
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: space.lg, gap: space.md }}>
      {/* Başlık: avatar + isim + telefon + doğrulama */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
        <View style={{ width: 64, height: 64, borderRadius: 999, backgroundColor: t.brand, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 28 }}>{user.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontWeight: "800", fontSize: 19, color: t.text }} numberOfLines={1}>{user.storeName ?? user.name}</Text>
          <Text style={{ color: t.muted, fontSize: 13 }}>{user.phone}</Text>
          {user.phoneVerified ? <Badge label="✓ Doğrulanmış numara" tone="success" /> : null}
        </View>
        <Pressable onPress={() => setEditOpen(true)} hitSlop={10} style={{ padding: 6 }}>
          <Ionicons name="create-outline" size={22} color={t.brand} />
        </Pressable>
      </View>

      {/* İstatistik şeridi */}
      <View style={{ flexDirection: "row", gap: space.sm }}>
        <Stat label="İlanım" value={listingCount} />
        <Stat label="Güven skoru" value={user.trustScore} />
        <Stat label="Üyelik" value={timeAgo(user.createdAt)} />
      </View>

      {/* Promo bandı */}
      <Pressable onPress={() => router.push("/ilan-ver")} style={({ pressed }) => ({ backgroundColor: t.brand, borderRadius: radius.lg, padding: space.lg, flexDirection: "row", alignItems: "center", gap: space.md, opacity: pressed ? 0.9 : 1 })}>
        <Ionicons name="pricetag" size={26} color="#fff" />
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>Elindekini paraya çevir</Text>
          <Text style={{ color: "#ffffffcc", fontSize: 13 }}>Ücretsiz ilan ver, hemen sat.</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#fff" />
      </Pressable>

      {/* Hesabım */}
      <Text style={{ color: t.muted, fontWeight: "700", fontSize: 13, marginTop: 4, marginLeft: 4 }}>Hesabım</Text>
      <View style={card}>
        <Row icon="pricetags" color="#f0434c" label="İlanlarım" badge={listingCount || undefined} onPress={() => router.push("/ilanlarim")} />
        <View style={{ height: 1, backgroundColor: t.border, marginLeft: 50 }} />
        <Row icon="heart" color="#ef4444" label="Favorilerim" onPress={() => router.push("/favoriler")} />
        <View style={{ height: 1, backgroundColor: t.border, marginLeft: 50 }} />
        <Row icon="search" color="#8b5cf6" label="Kayıtlı Aramalarım" onPress={() => router.push("/kayitli-aramalar")} />
        <View style={{ height: 1, backgroundColor: t.border, marginLeft: 50 }} />
        <Row icon="gift" color="#22c55e" label="Arkadaşını Davet Et" onPress={() => router.push("/davet")} />
        <View style={{ height: 1, backgroundColor: t.border, marginLeft: 50 }} />
        <Row icon="notifications" color="#f59e0b" label="Bildirimler" badge={unread || undefined} onPress={() => router.push("/bildirimler")} />
        <View style={{ height: 1, backgroundColor: t.border, marginLeft: 50 }} />
        <Row icon="star" color="#eab308" label="Değerlendirmelerim" onPress={() => router.push(`/satici/${user.id}`)} />
        <Row icon="storefront" color="#0ea5e9" label="Mağaza Başvurusu" onPress={() => router.push("/magaza-basvuru")} />
      </View>

      {/* Ayarlar */}
      <Text style={{ color: t.muted, fontWeight: "700", fontSize: 13, marginTop: 4, marginLeft: 4 }}>Ayarlar</Text>
      <View style={card}>
        <Row icon="person-circle" color="#14b8a6" label="Profili Düzenle" onPress={() => setEditOpen(true)} />
        <View style={{ height: 1, backgroundColor: t.border, marginLeft: 50 }} />
        <Row icon="ban" color="#64748b" label="Engellenen Kullanıcılar" onPress={() => router.push("/engellenenler")} />
        {SHOW_PAID_FEATURES && !user.isStore ? (
          <>
            <View style={{ height: 1, backgroundColor: t.border, marginLeft: 50 }} />
            <Row icon="storefront" color="#0ea5e9" label={`Mağaza Ol — ${formatNumber(STORE_MEMBERSHIP.price / 100)}₺/ay`} onPress={() => setStoreOpen(true)} />
          </>
        ) : null}
        <View style={{ height: 1, backgroundColor: t.border, marginLeft: 50 }} />
        <Row icon="help-buoy" color="#22c55e" label="Yardım & Destek" onPress={() => Linking.openURL(SUPPORT)} />
      </View>

      {/* Dil */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4, marginTop: 4 }}>
        <Text style={{ color: t.muted, flex: 1 }}>{tr("profile.language")}</Text>
        <Pressable onPress={() => setLocale("tr")} style={{ borderWidth: 1, borderColor: locale === "tr" ? t.brand : t.border, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 }}><Text style={{ color: locale === "tr" ? t.brand : t.text }}>TR</Text></Pressable>
        <Pressable onPress={() => setLocale("en")} style={{ borderWidth: 1, borderColor: locale === "en" ? t.brand : t.border, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 }}><Text style={{ color: locale === "en" ? t.brand : t.text }}>EN</Text></Pressable>
      </View>

      {user.isStore ? (
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center", padding: space.md, borderWidth: 1, borderColor: t.border, borderRadius: radius.md }}>
          <Badge label="Mağaza" tone="brand" />
          <Text style={{ fontWeight: "700", color: t.text }}>{user.storeName}</Text>
        </View>
      ) : null}

      <Button title={tr("profile.logout")} variant="ghost" onPress={async () => { await logout(); }} />

      {/* Yasal + hesap sil */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center", marginTop: 4 }}>
        <Pressable onPress={() => Linking.openURL(`${WEB}/kosullar`)}><Text style={{ color: t.muted, fontSize: 12 }}>Kullanım Koşulları</Text></Pressable>
        <Text style={{ color: t.muted, fontSize: 12 }}>·</Text>
        <Pressable onPress={() => Linking.openURL(`${WEB}/gizlilik`)}><Text style={{ color: t.muted, fontSize: 12 }}>Gizlilik Politikası</Text></Pressable>
        <Text style={{ color: t.muted, fontSize: 12 }}>·</Text>
        <Pressable onPress={() => Linking.openURL(`${WEB}/kvkk`)}><Text style={{ color: t.muted, fontSize: 12 }}>KVKK</Text></Pressable>
      </View>
      <Pressable onPress={deleteAccount} style={{ paddingVertical: 10, alignItems: "center" }}>
        <Text style={{ color: t.danger, fontSize: 13, fontWeight: "600" }}>Hesabımı Sil</Text>
      </Pressable>

      {/* Profili Düzenle modalı */}
      <Modal visible={editOpen} transparent animationType="slide" onRequestClose={() => setEditOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <Pressable onPress={() => setEditOpen(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: t.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: space.lg, gap: space.sm }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: t.text, marginBottom: 4 }}>Profili Düzenle</Text>
            <Text style={{ color: t.muted, fontWeight: "600", fontSize: 13 }}>Ad</Text>
            <TextInput value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} style={input} placeholderTextColor={t.muted} />
            <Text style={{ color: t.muted, fontWeight: "600", fontSize: 13 }}>Şehir</Text>
            <CityPicker value={form.city} onSelect={(c) => setForm({ ...form, city: c })} />
            <Text style={{ color: t.muted, fontWeight: "600", fontSize: 13 }}>Semt</Text>
            <TextInput value={form.district} onChangeText={(v) => setForm({ ...form, district: v })} style={input} placeholderTextColor={t.muted} />
            <Button title={busy ? "Kaydediliyor…" : "Kaydet"} onPress={save} loading={busy} />
          </Pressable>
        </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Mağaza modalı */}
      <Modal visible={storeOpen} transparent animationType="slide" onRequestClose={() => setStoreOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <Pressable onPress={() => setStoreOpen(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: t.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: space.lg, gap: space.md }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: t.text }}><Ionicons name="storefront-outline" size={18} color={t.brand} /> Mağaza Üyeliği</Text>
            {STORE_MEMBERSHIP.perks.map((p) => <Text key={p} style={{ color: t.muted }}>• {p}</Text>)}
            <TextInput value={storeName} onChangeText={setStoreName} placeholder="Mağaza adın" placeholderTextColor={t.muted}
              style={input} />
            <Button title={`Üyelik al — ${formatNumber(STORE_MEMBERSHIP.price / 100)}₺ (mock)`} onPress={activateStore} />
            <Text style={{ color: t.muted, fontSize: 11, textAlign: "center" }}>Geliştirme modunda ödeme simüle edilir.</Text>
          </Pressable>
        </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}
