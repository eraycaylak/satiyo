import { useState } from "react";
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { isValidTcKimlik, isValidVergiNo } from "@satiyo/shared";
import { api } from "@/lib/client";
import { useAuth } from "@/lib/auth";
import { uploadImage, type UploadedImage } from "@/lib/upload";
import { radius, space, useTheme } from "@/lib/theme";
import { Button, Loading } from "@/components/ui";

const STATUS_LABEL: Record<string, string> = { pending: "İnceleniyor", approved: "Onaylandı ✓", rejected: "Reddedildi" };

export default function StoreApplyScreen() {
  const t = useTheme();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [legalType, setLegalType] = useState<"individual" | "company">("individual");
  const [storeName, setStoreName] = useState("");
  const [tcNo, setTcNo] = useState("");
  const [taxNo, setTaxNo] = useState("");
  const [docs, setDocs] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: existing, isLoading, refetch } = useQuery({ queryKey: ["store-application"], queryFn: () => api.storeApplication(), enabled: !!user });

  if (loading || isLoading) return <Loading />;

  const input = { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: radius.md, padding: 12, color: t.text } as const;
  const idValid = legalType === "company" ? isValidVergiNo(taxNo) : isValidTcKimlik(tcNo);
  const canSubmit = storeName.trim().length >= 2 && idValid && docs.length >= 1 && !busy;

  async function addDoc() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert("İzin gerekli", "Belge fotoğrafı için galeri izni ver.");
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (res.canceled) return;
    setUploading(true);
    try {
      for (const a of res.assets) { const img = await uploadImage(a.uri, a.mimeType ?? "image/jpeg"); setDocs((p) => [...p, img]); }
    } catch (e) { Alert.alert("Hata", (e as Error).message); }
    finally { setUploading(false); }
  }

  async function submit() {
    setBusy(true);
    try {
      await api.applyStore({
        storeName: storeName.trim(), legalType,
        tcNo: legalType === "individual" ? tcNo : undefined,
        taxNo: legalType === "company" ? taxNo : undefined,
        docImageIds: docs.map((d) => d.imageId),
      });
      Alert.alert("Başvuru alındı ✓", "Belgelerini inceleyip en kısa sürede onaylayacağız.");
      refetch();
    } catch (e) { Alert.alert("Hata", (e as Error).message); }
    finally { setBusy(false); }
  }

  // Zaten başvuru varsa durumunu göster
  if (existing && existing.status !== "rejected") {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, padding: space.lg, gap: space.md }}>
        <View style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: radius.lg, padding: space.lg, gap: 8, alignItems: "center" }}>
          <Ionicons name={existing.status === "approved" ? "checkmark-circle" : "time-outline"} size={48} color={existing.status === "approved" ? t.success : t.accent} />
          <Text style={{ fontSize: 18, fontWeight: "800", color: t.text }}>{existing.storeName}</Text>
          <Text style={{ color: t.muted }}>Başvuru durumu: {STATUS_LABEL[existing.status] ?? existing.status}</Text>
          {existing.status === "approved" && <Text style={{ color: t.success, textAlign: "center" }}>Artık onaylı mağazasın 🎉 Rozetin profilinde görünür.</Text>}
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 20, fontWeight: "800", color: t.text }}>Mağaza Başvurusu</Text>
        <Text style={{ color: t.muted, fontSize: 13 }}>Onaylı mağaza rozeti + stok girişi için kimlik ve vergi belgeni doğrula.</Text>

        {existing?.status === "rejected" && existing.reviewNote ? (
          <View style={{ backgroundColor: t.brandSoft, borderRadius: radius.md, padding: 12 }}>
            <Text style={{ color: t.danger, fontWeight: "600" }}>Önceki başvuru reddedildi: {existing.reviewNote}</Text>
          </View>
        ) : null}

        <Text style={{ fontWeight: "700", color: t.text }}>Tür</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["individual", "company"] as const).map((lt) => (
            <Pressable key={lt} onPress={() => setLegalType(lt)} style={{ flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: radius.md, borderWidth: 1, borderColor: legalType === lt ? t.brand : t.border, backgroundColor: legalType === lt ? t.brandSoft : t.surface }}>
              <Text style={{ color: legalType === lt ? t.brand : t.text, fontWeight: "600" }}>{lt === "individual" ? "Bireysel" : "Şirket"}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={{ fontWeight: "700", color: t.text }}>Mağaza adı</Text>
        <TextInput value={storeName} onChangeText={setStoreName} placeholder="örn. Yılmaz Elektronik" placeholderTextColor={t.muted} style={input} />

        {legalType === "individual" ? (
          <>
            <Text style={{ fontWeight: "700", color: t.text }}>TC Kimlik No</Text>
            <TextInput value={tcNo} onChangeText={(v) => setTcNo(v.replace(/[^0-9]/g, "").slice(0, 11))} keyboardType="number-pad" placeholder="11 haneli" placeholderTextColor={t.muted} style={input} />
            {tcNo.length === 11 && !idValid ? <Text style={{ color: t.danger, fontSize: 12 }}>Geçersiz TC kimlik no</Text> : null}
          </>
        ) : (
          <>
            <Text style={{ fontWeight: "700", color: t.text }}>Vergi No</Text>
            <TextInput value={taxNo} onChangeText={(v) => setTaxNo(v.replace(/[^0-9]/g, "").slice(0, 10))} keyboardType="number-pad" placeholder="10 haneli" placeholderTextColor={t.muted} style={input} />
            {taxNo.length === 10 && !idValid ? <Text style={{ color: t.danger, fontSize: 12 }}>Geçersiz vergi no</Text> : null}
          </>
        )}

        <Text style={{ fontWeight: "700", color: t.text }}>Belge (vergi levhası / kimlik)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {docs.map((d, i) => (
            <View key={d.imageId}>
              <Image source={{ uri: d.localUri }} style={{ width: 90, height: 90, borderRadius: radius.sm }} />
              <Pressable onPress={() => setDocs((p) => p.filter((_, x) => x !== i))} style={{ position: "absolute", top: 4, right: 4, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 999, width: 22, height: 22, alignItems: "center", justifyContent: "center" }}><Text style={{ color: "#fff" }}>×</Text></Pressable>
            </View>
          ))}
          {docs.length < 3 && (
            <Pressable onPress={addDoc} style={{ width: 90, height: 90, borderRadius: radius.sm, borderWidth: 2, borderColor: t.border, borderStyle: "dashed", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 28, color: t.muted }}>{uploading ? "…" : "+"}</Text>
            </Pressable>
          )}
        </ScrollView>

        <Text style={{ color: t.muted, fontSize: 11 }}>Kimlik bilgin güvenli şekilde (hash'lenerek) saklanır; düz metin tutulmaz.</Text>
        <Button title={busy ? "Gönderiliyor…" : "Başvuruyu Gönder"} onPress={submit} loading={busy} disabled={!canSubmit} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
