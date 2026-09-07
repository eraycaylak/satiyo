import { useEffect, useMemo, useState } from "react";
import { Alert, Image, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { getAttributeSchema, type PriceType } from "@satiyo/shared";
import { api } from "@/lib/client";
import { track } from "@/lib/analytics";
import { maybeAskReview } from "@/lib/review";
import { useAuth } from "@/lib/auth";
import { uploadImage, type UploadedImage } from "@/lib/upload";
import { radius, space, useTheme } from "@/lib/theme";
import { Badge, Button, Loading } from "@/components/ui";
import { CityPicker } from "@/components/CityPicker";
import { CategoryPicker } from "@/components/CategoryPicker";
import { detectLocation } from "@/lib/location";

export default function CreateListingScreen() {
  const t = useTheme();
  const router = useRouter();
  const { user, loading } = useAuth();

  const [images, setImages] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [attributes, setAttributes] = useState<Record<string, string>>({});
  const [price, setPrice] = useState("");
  const [priceType, setPriceType] = useState<PriceType>("fixed");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);

  async function fillLocation() {
    setLocating(true);
    try {
      const loc = await detectLocation();
      if (!loc) { Alert.alert("Konum", "Konum izni verilmedi veya alınamadı."); return; }
      if (loc.province) setCity(loc.province);
      if (loc.district) setDistrict(loc.district);
    } finally { setLocating(false); }
  }

  useEffect(() => {
    if (!loading && !user) router.replace("/giris");
    if (user) { setCity((c) => c || user.city || ""); setDistrict((d) => d || user.district || ""); }
  }, [user, loading]);

  const schema = useMemo(() => (categoryId ? getAttributeSchema(categoryId) : []), [categoryId]);
  if (loading || !user) return <Loading />;
  const input = { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: radius.md, padding: 12, color: t.text };

  async function addPhotos(fromCamera: boolean) {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      return Alert.alert("İzin gerekli", fromCamera ? "Fotoğraf çekmek için kamera izni ver." : "Fotoğraf seçmek için galeri izni ver.", [
        { text: "Vazgeç", style: "cancel" },
        { text: "Ayarlar", onPress: () => Linking.openSettings() },
      ]);
    }
    const res = fromCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, allowsMultipleSelection: true, selectionLimit: 12 - images.length });
    if (res.canceled) return;
    setUploading(true);
    try {
      for (const a of res.assets) {
        const img = await uploadImage(a.uri, a.mimeType ?? "image/jpeg");
        setImages((prev) => [...prev, img]);
      }
    } catch (e) { Alert.alert("Hata", (e as Error).message); }
    finally { setUploading(false); }
  }
  function pick() {
    Alert.alert("Fotoğraf ekle", undefined, [
      { text: "📷 Fotoğraf çek", onPress: () => addPhotos(true) },
      { text: "🖼️ Galeriden seç", onPress: () => addPhotos(false) },
      { text: "Vazgeç", style: "cancel" },
    ]);
  }

  async function publish() {
    if (images.length < 1) return Alert.alert("Eksik", "En az 1 fotoğraf ekle.");
    if (title.trim().length < 3 || !categoryId) return Alert.alert("Eksik", "Başlık ve kategori gerekli.");
    if (priceType === "fixed" && Number(price) <= 0) return Alert.alert("Eksik", "Fiyat gir.");
    setBusy(true);
    try {
      const l = await api.createListing({
        title: title.trim(), description: description.trim(), categoryId,
        price: priceType === "free" ? 0 : Math.round(Number(price || 0) * 100),
        priceType, condition: attributes.condition === "Sıfır" ? "new" : "used",
        city: city || undefined, district: district || undefined,
        attributes, imageIds: images.map((i) => i.imageId), status: "active",
      });
      track("publish_listing", { id: l.id, category: categoryId, priceType });
      void maybeAskReview(); // ilan yayınlama = pozitif an → uygunsa puanlama iste
      setBusy(false);
      router.dismissAll?.();
      // Modal kapandıktan SONRA (aynı tick'te değil) detaya git — yarış/​takılma önlenir.
      requestAnimationFrame(() => router.push(`/ilan/${l.id}`));
    } catch (e) { Alert.alert("Hata", (e as Error).message); setBusy(false); }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: 48 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}>
      <Text style={{ fontWeight: "700", color: t.text }}>Fotoğraflar ({images.length}/12)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {images.map((img, i) => (
          <View key={img.imageId}>
            <Image source={{ uri: img.localUri }} style={{ width: 90, height: 90, borderRadius: radius.sm }} />
            {i === 0 && <View style={{ position: "absolute", bottom: 4, left: 4 }}><Badge label="Kapak" tone="brand" /></View>}
            <Pressable onPress={() => setImages(images.filter((x) => x.imageId !== img.imageId))}
              style={{ position: "absolute", top: 2, right: 2, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 999, width: 22, height: 22, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#fff" }}>×</Text>
            </Pressable>
          </View>
        ))}
        {images.length < 12 && (
          <Pressable onPress={pick} style={{ width: 90, height: 90, borderRadius: radius.sm, borderWidth: 2, borderColor: t.border, borderStyle: "dashed", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 28, color: t.muted }}>{uploading ? "…" : "+"}</Text>
          </Pressable>
        )}
      </ScrollView>

      <Text style={{ fontWeight: "700", color: t.text }}>Başlık</Text>
      <TextInput value={title} onChangeText={setTitle} placeholder="örn. iPhone 13 128 GB temiz" placeholderTextColor={t.muted} style={input} />

      <Text style={{ fontWeight: "700", color: t.text }}>Kategori</Text>
      <CategoryPicker value={categoryId} onSelect={(id) => { setCategoryId(id); setAttributes({}); }} />

      {schema.map((a) => {
        const depVal = a.dependsOn ? attributes[a.dependsOn] : undefined;
        const opts = a.dependsOn ? (a.optionsByParent?.[depVal ?? ""] ?? []) : (a.options ?? []);
        const depLabel = a.dependsOn ? (schema.find((x) => x.key === a.dependsOn)?.label ?? a.dependsOn) : "";
        return (
          <View key={a.key} style={{ gap: 6 }}>
            <Text style={{ color: t.muted, fontWeight: "600", fontSize: 13 }}>{a.label}{a.required ? " *" : ""}</Text>
            {a.type === "select" ? (
              a.dependsOn && !depVal ? (
                <Text style={{ color: t.muted, fontSize: 12 }}>Önce {depLabel} seç</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {opts.map((o) => (
                    <Pressable key={o} onPress={() => setAttributes({ ...attributes, [a.key]: o })}>
                      <Badge label={o} tone={attributes[a.key] === o ? "brand" : "default"} />
                    </Pressable>
                  ))}
                </ScrollView>
              )
            ) : (
              <TextInput value={attributes[a.key] ?? ""} onChangeText={(v) => setAttributes({ ...attributes, [a.key]: v })}
                keyboardType={a.type === "number" ? "numeric" : "default"} style={input} placeholderTextColor={t.muted} />
            )}
          </View>
        );
      })}

      <Text style={{ fontWeight: "700", color: t.text }}>Fiyat tipi</Text>
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        {(["fixed", "negotiable", "trade", "free"] as PriceType[]).map((pt) => (
          <Pressable key={pt} onPress={() => setPriceType(pt)}>
            <Badge label={pt === "fixed" ? "Sabit" : pt === "negotiable" ? "Pazarlık" : pt === "trade" ? "Takas" : "Ücretsiz"} tone={priceType === pt ? "brand" : "default"} />
          </Pressable>
        ))}
      </View>
      {priceType !== "free" && priceType !== "trade" && (
        <TextInput value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="Fiyat (₺)" placeholderTextColor={t.muted} style={input} />
      )}

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontWeight: "700", color: t.text }}>Konum</Text>
        <Pressable onPress={fillLocation} hitSlop={6} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Text style={{ color: t.brand, fontWeight: "600", fontSize: 13 }}>{locating ? "Alınıyor…" : "📍 Konumumu al"}</Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}><CityPicker value={city} onSelect={setCity} placeholder="Şehir" /></View>
        <TextInput value={district} onChangeText={setDistrict} placeholder="Semt" placeholderTextColor={t.muted} style={[input, { flex: 1 }]} />
      </View>

      <Text style={{ fontWeight: "700", color: t.text }}>Açıklama</Text>
      <TextInput value={description} onChangeText={setDescription} multiline numberOfLines={4} placeholder="Ürünü anlat…" placeholderTextColor={t.muted} style={[input, { minHeight: 90, textAlignVertical: "top" }]} />

      <Button title={busy ? "Yayınlanıyor…" : "Yayınla"} onPress={publish} loading={busy} />
    </ScrollView>
    </KeyboardAvoidingView>
  );
}
