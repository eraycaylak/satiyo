import { useEffect, useRef, useState } from "react";
import { Alert, FlatList, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import type { Conversation, Message } from "@satiyo/shared";
import { api, tokenStore } from "@/lib/client";
import { useAuth } from "@/lib/auth";
import { radius, space, useTheme } from "@/lib/theme";
import { formatPrice, presenceText } from "@/lib/format";
import { Loading } from "@/components/ui";

// Hızlı yanıt formatları rol'e göre değişir: alıcı soru sorar, satıcı cevap verir.
const QUICK_BUYER = ["Hâlâ satılık mı?", "Son fiyat?", "Ne zaman bakabilirim?", "Takas olur mu?"];
const QUICK_SELLER = ["Evet, satılık", "Fiyatı sabit", "Pazarlık payı var", "Bugün müsaitim", "Takas düşünmüyorum"];
const MAX_WS_RETRIES = 2;
const WS_RETRY_DELAY = 1500; // ms — her denemede artan basit backoff

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
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [counterOpen, setCounterOpen] = useState(false);
  const [counterMsgId, setCounterMsgId] = useState<string | null>(null);
  const [counterAmount, setCounterAmount] = useState("");
  const listRef = useRef<FlatList<Message>>(null);

  function upsert(m: Message) {
    setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev.map((x) => (x.id === m.id ? m : x)) : [...prev, m]));
  }

  useEffect(() => {
    if (!user) return;
    // Mesajları çek — sunucu bu çağrıda okundu işaretler; mesajlar listesindeki
    // okunmamış rozetini anında tazelemek için ["conversations"]'ı invalidate et.
    // Hata olursa sessiz kalma; kullanıcıya yeniden-dene durumu göster.
    setLoadError(false);
    api.messages(id!)
      .then((m) => { setMessages(m); qc.invalidateQueries({ queryKey: ["conversations"] }); })
      .catch(() => setLoadError(true));
    api.conversations().then((l) => setConv(l.find((c) => c.id === id) ?? null)).catch(() => {});
  }, [id, user, reloadKey]);

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
    let closedByUs = false;
    let attempts = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let ws: WebSocket | undefined;
    const connect = () => {
      ws = new WebSocket(api.chatSocketUrl(id!, token));
      ws.onopen = () => { attempts = 0; setConnected(true); };
      ws.onmessage = (ev) => {
        try { const d = JSON.parse(ev.data as string); if ((d.kind === "message" || d.kind === "offer_update") && d.message) upsert(d.message); } catch {}
      };
      ws.onclose = () => {
        setConnected(false);
        // Beklenmedik kapanmada kısa (artan) backoff ile birkaç kez yeniden bağlan.
        if (!closedByUs && attempts < MAX_WS_RETRIES) {
          attempts += 1;
          retryTimer = setTimeout(connect, attempts * WS_RETRY_DELAY);
        }
      };
      ws.onerror = () => { try { ws?.close(); } catch {} };
    };
    connect();
    return () => {
      closedByUs = true;
      if (retryTimer) clearTimeout(retryTimer);
      ws?.close();
    };
  }, [id, user]);

  if (loading || !user) return <Loading />;

  async function send(body: string) {
    if (!body.trim()) return;
    setText("");
    try { upsert(await api.sendMessage(id!, { type: "text", body }) as Message); }
    catch (e) { Alert.alert("Hata", (e as Error).message); }
  }
  async function act(messageId: string, action: "accept" | "reject" | "counter") {
    // Karşı teklifi cross-platform bir Modal ile al (Alert.prompt Android'de çalışmaz).
    if (action === "counter") {
      setCounterMsgId(messageId);
      setCounterAmount("");
      setCounterOpen(true);
      return;
    }
    try { upsert(await api.actOnOffer(id!, messageId, { action })); }
    catch (e) { Alert.alert("Hata", (e as Error).message); }
  }
  async function submitCounter() {
    const amount = Number(counterAmount.replace(",", "."));
    if (!counterMsgId || !Number.isFinite(amount) || amount <= 0) {
      Alert.alert("Geçersiz tutar", "Lütfen geçerli bir tutar gir.");
      return;
    }
    try {
      upsert(await api.actOnOffer(id!, counterMsgId, { action: "counter", counterAmount: Math.round(amount * 100) }));
      setCounterOpen(false);
      setCounterMsgId(null);
      setCounterAmount("");
    } catch (e) { Alert.alert("Hata", (e as Error).message); }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      {conv?.otherUser && reviewedId ? (
        <Pressable onPress={() => router.push(`/satici/${reviewedId}`)} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: space.lg, paddingTop: 8 }}>
          <View style={{ width: 38, height: 38, borderRadius: 999, overflow: "hidden", backgroundColor: t.brand + "22", alignItems: "center", justifyContent: "center" }}>
            {conv.otherUser.avatarUrl
              ? <Image source={{ uri: conv.otherUser.avatarUrl }} style={{ width: 38, height: 38 }} />
              : <Text style={{ color: t.brand, fontWeight: "800", fontSize: 16 }}>{(conv.otherUser.storeName ?? conv.otherUser.name ?? "?").charAt(0).toUpperCase()}</Text>}
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text numberOfLines={1} style={{ fontWeight: "700", fontSize: 15, color: t.text }}>{conv.otherUser.storeName ?? conv.otherUser.name}</Text>
              {conv.otherUser.isStore ? <View style={{ backgroundColor: t.brand + "18", borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1 }}><Text style={{ color: t.brand, fontSize: 10, fontWeight: "700" }}>Mağaza</Text></View> : null}
            </View>
            <Text style={{ fontSize: 12, color: t.muted }}>{conv.otherUser.ratingCount ? `⭐ ${conv.otherUser.ratingAvg?.toFixed(1)} (${conv.otherUser.ratingCount})` : "Profili gör →"}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={t.muted} />
        </Pressable>
      ) : null}
      <View style={{ paddingHorizontal: space.lg, paddingVertical: 6, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flexDirection: "row", gap: space.md, alignItems: "center" }}>
          {conv ? <Pressable onPress={() => setReviewOpen(true)} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Ionicons name="star" size={15} color={t.brand} /><Text style={{ color: t.brand, fontWeight: "600" }}>Değerlendir</Text></Pressable> : null}
          {reviewedId ? <Pressable onPress={blockOther} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Ionicons name="remove-circle-outline" size={15} color={t.danger} /><Text style={{ color: t.danger, fontWeight: "600", fontSize: 13 }}>Engelle</Text></Pressable> : null}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          {(() => {
            const p = presenceText(conv?.otherUser?.lastSeen);
            const label = p.label || (connected ? "" : "Bağlanıyor");
            if (!label) return null;
            return (
              <>
                <Ionicons name={p.online ? "ellipse" : "ellipse-outline"} size={9} color={p.online ? t.success : t.muted} />
                <Text style={{ color: p.online ? t.brand : t.muted, fontSize: 12 }}>{label}</Text>
              </>
            );
          })()}
        </View>
      </View>
      {loadError ? (
        <Pressable onPress={() => setReloadKey((k) => k + 1)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginHorizontal: space.lg, marginVertical: 6, paddingVertical: 8, borderRadius: radius.md, backgroundColor: t.danger + "18" }}>
          <Ionicons name="alert-circle-outline" size={16} color={t.danger} />
          <Text style={{ color: t.danger, fontWeight: "600", fontSize: 13 }}>Sohbet yüklenemedi. Yeniden dene</Text>
        </Pressable>
      ) : null}
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
        {(conv && user.id === conv.sellerId ? QUICK_SELLER : QUICK_BUYER).map((q) => (
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

      <Modal visible={counterOpen} transparent animationType="slide" onRequestClose={() => setCounterOpen(false)}>
        <Pressable onPress={() => setCounterOpen(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: t.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: space.lg, gap: space.md }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="cash-outline" size={20} color={t.brand} />
              <Text style={{ fontSize: 18, fontWeight: "800", color: t.text }}>Karşı teklif</Text>
            </View>
            <TextInput value={counterAmount} onChangeText={setCounterAmount} placeholder="Tutar (₺)" placeholderTextColor={t.muted}
              keyboardType="numeric" autoFocus returnKeyType="done" onSubmitEditing={submitCounter}
              style={{ backgroundColor: t.bg, borderWidth: 1, borderColor: t.border, borderRadius: radius.md, padding: 12, color: t.text }} />
            <Pressable onPress={submitCounter} style={{ backgroundColor: t.brand, borderRadius: radius.md, padding: 13, alignItems: "center" }}>
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
