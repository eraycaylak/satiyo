"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Conversation, Message } from "@satiyo/shared";
import { api, tokenStore } from "@/lib/client";
import { useAuth } from "@/lib/auth";
import { formatPrice, presenceText, timeAgo } from "@/lib/format";

// Hızlı yanıtlar rol'e göre: alıcı soru sorar, satıcı cevap verir.
const QUICK_BUYER = ["Hâlâ satılık mı?", "Son fiyat nedir?", "Ne zaman bakabilirim?", "Takas olur mu?"];
const QUICK_SELLER = ["Evet, satılık", "Fiyatı sabit", "Pazarlık payı var", "Bugün müsaitim", "Takas düşünmüyorum"];

export function Chat({ conversationId }: { conversationId: string }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [connected, setConnected] = useState(false);
  const [warning, setWarning] = useState<string[] | null>(null);
  const [conv, setConv] = useState<Conversation | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewMsg, setReviewMsg] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!loading && !user) router.replace(`/giris?next=/mesajlar/${conversationId}`); }, [user, loading, conversationId, router]);

  function upsert(msg: Message) {
    setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev.map((m) => (m.id === msg.id ? msg : m)) : [...prev, msg]));
  }

  // İlk yükleme
  useEffect(() => {
    if (!user) return;
    api.messages(conversationId).then(setMessages).catch(() => {});
    api.conversations().then((list) => setConv(list.find((c) => c.id === conversationId) ?? null)).catch(() => {});
  }, [conversationId, user]);

  const reviewedId = conv ? (user?.id === conv.buyerId ? conv.sellerId : conv.buyerId) : null;
  async function submitReview() {
    if (!conv || !reviewedId) return;
    setReviewMsg(null);
    try {
      await api.createReview({ listingId: conv.listingId, reviewedId, rating, comment: comment || undefined });
      setReviewMsg("✓ Değerlendirmen kaydedildi, teşekkürler!");
      setTimeout(() => setReviewOpen(false), 1200);
    } catch (e) {
      setReviewMsg("Hata: " + (e as Error).message);
    }
  }

  // WebSocket gerçek-zamanlı
  useEffect(() => {
    if (!user) return;
    const token = tokenStore.get();
    if (!token) return;
    const ws = new WebSocket(api.chatSocketUrl(conversationId, token));
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if ((data.kind === "message" || data.kind === "offer_update") && data.message) upsert(data.message);
      } catch {}
    };
    return () => ws.close();
  }, [conversationId, user]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  if (loading || !user) return <div className="empty">Yükleniyor…</div>;

  async function send(body: string) {
    if (!body.trim()) return;
    setText("");
    try {
      const msg = await api.sendMessage(conversationId, { type: "text", body }) as Message & { safetyWarning?: string[] };
      upsert(msg);
      if (msg.safetyWarning) setWarning(msg.safetyWarning);
    } catch (e) { alert("Gönderilemedi: " + (e as Error).message); }
  }

  async function actOnOffer(messageId: string, action: "accept" | "reject" | "counter") {
    let counterAmount: number | undefined;
    if (action === "counter") {
      const v = prompt("Karşı teklifin (₺):");
      if (!v) return;
      counterAmount = Math.round(Number(v) * 100);
    }
    const msg = await api.actOnOffer(conversationId, messageId, { action, counterAmount });
    upsert(msg);
  }

  return (
    <div className="stack" style={{ maxWidth: 640, margin: "0 auto", height: "calc(100vh - var(--header-h) - 120px)" }}>
      <div className="row" style={{ gap: 8, paddingBottom: 8 }}>
        <button className="btn btn-ghost" style={{ padding: "9px 12px" }} onClick={() => router.push("/mesajlar")} aria-label="Geri">←</button>
        {conv?.otherUser ? (
          <Link href={`/satici/${conv.otherUser.id}`} className="chat-peer grow" title="Profili gör">
            <span className="chat-peer-av">
              {conv.otherUser.avatarUrl
                ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={conv.otherUser.avatarUrl} alt="" />
                : (conv.otherUser.storeName ?? conv.otherUser.name ?? "?").charAt(0).toUpperCase()}
            </span>
            <span className="chat-peer-body">
              <span className="chat-peer-name">
                {conv.otherUser.storeName ?? conv.otherUser.name}
                {conv.otherUser.isStore && <span className="badge badge-brand" style={{ fontSize: 10, padding: "1px 6px" }}>Mağaza</span>}
                <span className="chat-peer-chev">›</span>
              </span>
              <span className="chat-peer-meta">
                {(() => {
                  const p = presenceText(conv.otherUser.lastSeen);
                  if (p) return <span style={{ color: p.startsWith("●") ? "var(--success)" : "var(--text-muted)" }}>{p}</span>;
                  if (!connected) return <span>bağlanıyor…</span>;
                  return <span>Profili gör</span>;
                })()}
                {!!conv.otherUser.ratingCount && <span>· ⭐ {conv.otherUser.ratingAvg?.toFixed(1)} ({conv.otherUser.ratingCount})</span>}
              </span>
            </span>
          </Link>
        ) : <div className="grow" />}
        {conv && <button className="btn btn-ghost" style={{ padding: "9px 12px", whiteSpace: "nowrap" }} onClick={() => { setReviewOpen(true); setReviewMsg(null); }}>⭐ Değerlendir</button>}
      </div>

      <div className="card stack" style={{ flex: 1, overflowY: "auto", padding: "var(--space-4)", gap: 10 }}>
        {messages.length === 0 && <div className="empty">İlk mesajı sen yaz 👋</div>}
        {messages.map((m) => {
          const mine = m.senderId === user.id;
          if (m.type === "offer") return <OfferBubble key={m.id} m={m} mine={mine} onAct={actOnOffer} />;
          return (
            <div key={m.id} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "78%" }}>
              <div style={{ background: mine ? "var(--brand)" : "var(--surface-2)", color: mine ? "#fff" : "var(--text)", padding: "9px 13px", borderRadius: 16, borderBottomRightRadius: mine ? 4 : 16, borderBottomLeftRadius: mine ? 16 : 4 }}>
                {m.body}
              </div>
              <div className="muted" style={{ fontSize: 11, textAlign: mine ? "right" : "left", marginTop: 2 }}>{timeAgo(m.createdAt)}</div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {warning && (
        <div className="safety-strip" style={{ marginTop: 8, background: "#fff3e8", color: "var(--accent)" }}>
          ⚠️ Dikkat: Bu mesaj {warning.includes("iban") ? "IBAN" : ""} {warning.includes("scam_phrase") ? "kapora/kargo" : ""} {warning.includes("link") ? "bağlantı" : ""} içeriyor. Kapora gönderme!
        </div>
      )}

      <div className="row" style={{ gap: 6, overflowX: "auto", padding: "8px 0" }}>
        {(conv && user?.id === conv.sellerId ? QUICK_SELLER : QUICK_BUYER).map((q) => <button key={q} className="badge" style={{ whiteSpace: "nowrap", cursor: "pointer", border: "1px solid var(--border)", padding: "6px 12px" }} onClick={() => send(q)}>{q}</button>)}
      </div>
      <form className="row" style={{ gap: 8 }} onSubmit={(e) => { e.preventDefault(); send(text); }}>
        <input className="input grow" value={text} onChange={(e) => setText(e.target.value)} placeholder="Mesaj yaz…" />
        <button className="btn btn-primary" type="submit" disabled={!text.trim()}>Gönder</button>
      </form>

      {reviewOpen && (
        <div className="modal-backdrop" onClick={() => setReviewOpen(false)}>
          <div className="modal stack" style={{ gap: 12 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: 0 }}>⭐ Değerlendir</h3>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>Bu alışveriş nasıldı?</p>
            <div className="row" style={{ gap: 4, justifyContent: "center" }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)} style={{ background: "none", border: "none", fontSize: 32, color: n <= rating ? "var(--accent)" : "var(--border)" }}>★</button>
              ))}
            </div>
            <textarea className="input" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Yorumun (opsiyonel)…" />
            {reviewMsg && <p className={reviewMsg.startsWith("✓") ? "badge badge-success" : ""} style={{ color: reviewMsg.startsWith("✓") ? undefined : "var(--danger)" }}>{reviewMsg}</p>}
            <div className="row" style={{ gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setReviewOpen(false)}>Vazgeç</button>
              <button className="btn btn-primary" onClick={submitReview}>Gönder</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OfferBubble({ m, mine, onAct }: { m: Message; mine: boolean; onAct: (id: string, a: "accept" | "reject" | "counter") => void }) {
  const status = m.offerStatus;
  return (
    <div className="card" style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "85%", padding: "var(--space-3) var(--space-4)", border: "1px solid var(--brand)" }}>
      <div className="muted" style={{ fontSize: 12 }}>💰 {mine ? "Teklifin" : "Teklif"}</div>
      <div className="price" style={{ fontSize: 20 }}>{formatPrice(m.offerAmount ?? 0)}</div>
      {status === "accepted" && <span className="badge badge-success">✓ Kabul edildi</span>}
      {status === "rejected" && <span className="badge">✕ Reddedildi</span>}
      {status === "pending" && !mine && (
        <div className="row" style={{ gap: 6, marginTop: 8 }}>
          <button className="btn btn-primary" style={{ padding: "6px 12px" }} onClick={() => onAct(m.id, "accept")}>Kabul</button>
          <button className="btn btn-ghost" style={{ padding: "6px 12px" }} onClick={() => onAct(m.id, "counter")}>Karşı teklif</button>
          <button className="btn btn-ghost" style={{ padding: "6px 12px" }} onClick={() => onAct(m.id, "reject")}>Reddet</button>
        </div>
      )}
      {status === "pending" && mine && <span className="badge" style={{ marginTop: 6 }}>Yanıt bekleniyor…</span>}
    </div>
  );
}
