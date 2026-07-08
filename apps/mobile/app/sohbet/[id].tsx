import { useEffect, useRef, useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import type { Conversation, Message } from "@satiyo/shared";
import { api, tokenStore } from "@/lib/client";
import { useAuth } from "@/lib/auth";
import { radius, space, useTheme } from "@/lib/theme";
import { formatPrice } from "@/lib/format";
import { Loading } from "@/components/ui";

const QUICK = ["Hâlâ satılık mı?", "Son fiyat?", "Ne zaman bakabilirim?", "Takas olur mu?"];

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const { user, loading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [connected, setConnected] = useState(false);
  const [conv, setConv] = useState<Conversation | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const listRef = useRef<FlatList<Message>>(null);

  function upsert(m: Message) {
    setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev.map((x) => (x.id === m.id ? m : x)) : [...prev, m]));
  }

  useEffect(() => {
    if (!user) return;
    // Mesajları çek — sunucu bu çağrıda okundu işaretler; mesajlar listesindeki
    // okunmamış rozetini anında tazelemek için ["conversations"]'ı invalidate et.
    api.messages(id!).then((m) => { setMessages(m); qc.invalidateQueries({ queryKey: ["conversations"] }); }).catch(() => {});
    api.conversations().then((l) => setConv(l.find((c) => c.id === id) ?? null)).catch(() => {});
  }, [id, user]);

  const reviewedId = conv ? (user?.id === conv.buyerId ? conv.sellerId : conv.buyerId) : null;
  function blockOther() {
    if (!reviewedId) return;
    Alert.alert(
      "Kullanıcıyı engelle",
      "Bu kullanıcı artık seninle mesajlaşamaz. Emin misin?",
      [
        { text: "Vazgeç", style: "cancel" },
        { text: "Engelle", style: "destructive", onPress: async () => {
          try {
            await api.blockUser(reviewedId!);
            await qc.invalidateQueries({ queryKey: ["listings"] });
            await qc.invalidateQueries({ queryKey: ["recommendations"] });
            Alert.alert("Engellendi", "Kullanıcı engellendi ve ilanları akışından kaldırıldı.");
            router.back();
          } catch (e) { Alert.alert("Hata", (e as Error).message); }
        } },
      ],
    );
  }
  async function submitReview() {
    if (!conv || !reviewedId) return;
    try {
      await api.createReview({ listingId: conv.listingId, reviewedId, rating, comment: comment || undefined });
      setReviewOpen(false);
      Alert.alert("Teşekkürler", "Değerlendirmen kaydedildi.");
    } catch (e) { Alert.alert("Hata", (e as Error).message); }
  }

  useEffect(() => {
    if (!user) return;
    const token = tokenStore.get();
    if (!token) return;
    const ws = new WebSocket(api.chatSocketUrl(id!, token));
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (ev) => {
      try { const d = JSON.parse(ev.data as string); if ((d.kind === "message" || d.kind === "offer_update") && d.message) upsert(d.message); } catch {}
    };
    return () => ws.close();
  }, [id, user]);

  if (loading || !user) return <Loading />;

  async function send(body: string) {
    if (!body.trim()) return;
    setText("");
    try { upsert(await api.sendMessage(id!, { type: "text", body }) as Message); }
    catch (e) { Alert.alert("Hata", (e as Error).message); }
  }
  async function act(messageId: string, action: "accept" | "reject" | "counter") {
    if (action === "counter") {
      Alert.prompt?.("Karşı teklif", "Tutar (₺):", async (v) => {
        if (v) upsert(await api.actOnOffer(id!, messageId, { action, counterAmount: Math.round(Number(v) * 100) }));
      });
      return;
    }
    upsert(await api.actOnOffer(id!, messageId, { action }));
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <View style={{ paddingHorizontal: space.lg, paddingVertical: 6, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flexDirection: "row", gap: space.md, alignItems: "center" }}>
          {conv ? <Pressable onPress={() => setReviewOpen(true)} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Ionicons name="star" size={15} color={t.brand} /><Text style={{ color: t.brand, fontWeight: "600" }}>Değerlendir</Text></Pressable> : null}
          {reviewedId ? <Pressable onPress={blockOther} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Ionicons name="remove-circle-outline" size={15} color={t.danger} /><Text style={{ color: t.danger, fontWeight: "600", fontSize: 13 }}>Engelle</Text></Pressable> : null}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Ionicons name={connected ? "ellipse" : "ellipse-outline"} size={9} color={connected ? t.success : t.muted} />
          <Text style={{ color: connected ? t.brand : t.muted, fontSize: 12 }}>{connected ? "Çevrimiçi" : "Bağlanıyor"}</Text>
        </View>
      </View>
      <FlatList
        ref={listRef}
        style={{ flex: 1 }}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: space.lg, gap: 10 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item: m }) => {
          const mine = m.senderId === user.id;
          if (m.type === "offer") return <OfferBubble m={m} mine={mine} onAct={act} />;
          return (
            <View style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "80%", backgroundColor: mine ? t.brand : t.surface2, borderRadius: 16, padding: 10 }}>
              <Text style={{ color: mine ? "#fff" : t.text }}>{m.body}</Text>
            </View>
          );
        }}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: space.lg, paddingVertical: 6 }}>
        {QUICK.map((q) => (
          <Pressable key={q} onPress={() => send(q)} style={{ borderWidth: 1, borderColor: t.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ color: t.text, fontSize: 13 }}>{q}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={{ flexDirection: "row", gap: 8, padding: space.lg, paddingTop: 4 }}>
        <TextInput value={text} onChangeText={setText} placeholder="Mesaj yaz…" placeholderTextColor={t.muted}
          style={{ flex: 1, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: radius.md, padding: 12, color: t.text }} />
        <Pressable onPress={() => send(text)} style={{ backgroundColor: t.brand, borderRadius: radius.md, paddingHorizontal: 18, justifyContent: "center" }}>
          <Text style={{ color: "#fff", fontWeight: "700" }}>Gönder</Text>
        </Pressable>
      </View>

      <Modal visible={reviewOpen} transparent animationType="slide" onRequestClose={() => setReviewOpen(false)}>
        <Pressable onPress={() => setReviewOpen(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: t.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: space.lg, gap: space.md }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="star" size={20} color={t.accent} />
              <Text style={{ fontSize: 18, fontWeight: "800", color: t.text }}>Değerlendir</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "center", gap: 6 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => setRating(n)}>
                  <Ionicons name={n <= rating ? "star" : "star-outline"} size={34} color={n <= rating ? t.accent : t.border} />
                </Pressable>
              ))}
            </View>
            <TextInput value={comment} onChangeText={setComment} placeholder="Yorumun (opsiyonel)…" placeholderTextColor={t.muted} multiline
              style={{ backgroundColor: t.bg, borderWidth: 1, borderColor: t.border, borderRadius: radius.md, padding: 12, color: t.text, minHeight: 70, textAlignVertical: "top" }} />
            <Pressable onPress={submitReview} style={{ backgroundColor: t.brand, borderRadius: radius.md, padding: 13, alignItems: "center" }}>
              <Text style={{ color: "#fff", fontWeight: "700" }}>Gönder</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function OfferBubble({ m, mine, onAct }: { m: Message; mine: boolean; onAct: (id: string, a: "accept" | "reject" | "counter") => void }) {
  const t = useTheme();
  return (
    <View style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "85%", backgroundColor: t.surface, borderWidth: 1, borderColor: t.brand, borderRadius: radius.md, padding: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <Ionicons name="cash-outline" size={13} color={t.muted} />
        <Text style={{ color: t.muted, fontSize: 12 }}>{mine ? "Teklifin" : "Teklif"}</Text>
      </View>
      <Text style={{ fontSize: 20, fontWeight: "800", color: t.text }}>{formatPrice(m.offerAmount ?? 0)}</Text>
      {m.offerStatus === "accepted" && <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Ionicons name="checkmark-circle" size={15} color={t.success} /><Text style={{ color: t.success, fontWeight: "600" }}>Kabul edildi</Text></View>}
      {m.offerStatus === "rejected" && <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Ionicons name="close-circle" size={15} color={t.muted} /><Text style={{ color: t.muted }}>Reddedildi</Text></View>}
      {m.offerStatus === "pending" && !mine && (
        <View style={{ flexDirection: "row", gap: 6, marginTop: 8 }}>
          <Pressable onPress={() => onAct(m.id, "accept")} style={{ backgroundColor: t.brand, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}><Text style={{ color: "#fff", fontWeight: "600" }}>Kabul</Text></Pressable>
          <Pressable onPress={() => onAct(m.id, "counter")} style={{ borderWidth: 1, borderColor: t.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}><Text style={{ color: t.text }}>Karşı</Text></Pressable>
          <Pressable onPress={() => onAct(m.id, "reject")} style={{ borderWidth: 1, borderColor: t.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}><Text style={{ color: t.text }}>Reddet</Text></Pressable>
        </View>
      )}
      {m.offerStatus === "pending" && mine && <Text style={{ color: t.muted, fontSize: 12, marginTop: 4 }}>Yanıt bekleniyor…</Text>}
    </View>
  );
}
