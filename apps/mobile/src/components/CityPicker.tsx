import { useMemo, useState } from "react";
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TR_PROVINCES } from "@satiyo/shared";
import { radius, space, useTheme } from "@/lib/theme";

// Şehir seçici: alan gibi görünen pressable → alttan arama + 81 il listesi.
// Serbest metin yerine seçilebilir; semt (ilçe) ayrıca elle girilir.
export function CityPicker({
  value,
  onSelect,
  placeholder = "Şehir seç",
}: {
  value: string;
  onSelect: (city: string) => void;
  placeholder?: string;
}) {
  const t = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: radius.md,
          padding: 13, flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        }}
      >
        <Text style={{ color: value ? t.text : t.muted, fontSize: 16 }}>{value || placeholder}</Text>
        {value ? (
          <Pressable onPress={() => onSelect("")} hitSlop={10}>
            <Ionicons name="close-circle" size={19} color={t.muted} />
          </Pressable>
        ) : (
          <Ionicons name="chevron-down" size={18} color={t.muted} />
        )}
      </Pressable>

      <CityPickerModal visible={open} onClose={() => setOpen(false)} value={value} onSelect={onSelect} />
    </>
  );
}

/**
 * Kontrollü il seçim modal'ı (tetikleyici gövdeden ayrı).
 * Kendi tetikleyicisini çizmez; `visible` ile dışarıdan açılır. Filtrele ekranı
 * bunu kendi kart-satırı tetikleyicisiyle YENİDEN KULLANIR.
 */
export function CityPickerModal({
  visible,
  onClose,
  value,
  onSelect,
  title = "Şehir seç",
}: {
  visible: boolean;
  onClose: () => void;
  value: string;
  onSelect: (city: string) => void;
  title?: string;
}) {
  const t = useTheme();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase("tr");
    return needle ? TR_PROVINCES.filter((p) => p.toLocaleLowerCase("tr").includes(needle)) : TR_PROVINCES;
  }, [q]);

  function close() { setQ(""); onClose(); }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <Pressable onPress={close} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{ backgroundColor: t.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingTop: space.md, maxHeight: "75%" }}
        >
          <View style={{ paddingHorizontal: space.lg, paddingBottom: space.sm }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: t.text, marginBottom: space.sm }}>{title}</Text>
            <TextInput
              value={q} onChangeText={setQ} placeholder="Ara…" placeholderTextColor={t.muted} autoFocus
              style={{ backgroundColor: t.bg, borderWidth: 1, borderColor: t.border, borderRadius: radius.md, padding: 12, color: t.text }}
            />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(p) => p}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => { onSelect(item); close(); }}
                style={{ paddingVertical: 14, paddingHorizontal: space.lg, borderBottomWidth: 1, borderBottomColor: t.border }}
              >
                <Text style={{ color: item === value ? t.brand : t.text, fontSize: 16, fontWeight: item === value ? "700" : "400" }}>{item}</Text>
              </Pressable>
            )}
            ListEmptyComponent={<Text style={{ color: t.muted, padding: space.lg }}>Sonuç yok</Text>}
          />
        </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
