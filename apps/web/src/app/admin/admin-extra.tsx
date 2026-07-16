"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/client";
import { formatPrice, timeAgo } from "@/lib/format";
import { Icon } from "./icons";

const nf = (v?: number) => new Intl.NumberFormat("tr-TR").format(Math.max(0, Math.round(Number(v ?? 0))));
const dt = (ts: number) => { const d = new Date(ts); const p = (n: number) => String(n).padStart(2, "0"); return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`; };

// =================== ÖNE ÇIKANLAR (boost'lu ilanlar) ===================
export function FeaturedSection() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-featured"], queryFn: () => api.adminFeatured() });
  const items = data?.items ?? [];
  return (
    <div className="ad-panel">
      <div className="ad-panel-h"><div><h3 className="t">Öne Çıkan İlanlar</h3><p className="s">Şu an boost'lu / öne çıkarılmış aktif ilanlar</p></div><span className="hint">{items.length}</span></div>
      {isLoading ? <div className="ad-ph" style={{ padding: 30 }}>Yükleniyor…</div> :
        items.length === 0 ? <div className="ad-ph" style={{ padding: 40 }}>⭐<br />Şu an öne çıkan ilan yok.<br /><span className="s">Kullanıcılar ilan boost'ladıkça burada listelenir.</span></div> : (
          <div className="cc-cards">
            {items.map((l) => (
              <div key={l.id} className="cc-card">
                <a className="thumb" href={`/ilan/${l.id}`} target="_blank" rel="noopener noreferrer">
                  {l.images?.[0]?.url ? <img src={l.images[0].url} alt={l.title} /> : null}
                  <span className="cc-tag warn st">⭐ öne çıkan</span>
                </a>
                <div className="cbody">
                  <div className="ctitle">{l.title}</div>
                  <div className="cprice">{formatPrice(l.price, l.priceType)}</div>
                  <div className="cmeta"><span>{l.seller?.name ?? "—"}</span><span>{l.boostedUntil ? `bitiş ${timeAgo(l.boostedUntil)}` : ""}</span></div>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

// =================== MESAJLAR (moderasyon / trust & safety) ===================
export function MessagesSection() {
  const [q, setQ] = useState("");
  const [risky, setRisky] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ["admin-conversations", q, risky], queryFn: () => api.adminConversations(q || undefined, risky) });
  const items = data?.items ?? [];

  return (
    <div className="ad-panel">
      <div className="ad-panel-h" style={{ flexWrap: "wrap", gap: 8 }}>
        <div><h3 className="t">Mesajlar</h3><p className="s">Trust &amp; safety — konuşmaları izle, yasadışı/dolandırıcılık içeriği yakala</p></div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button className={`cc-btn ${risky ? "danger" : ""}`} onClick={() => setRisky((v) => !v)}>{risky ? "🚩 Sadece riskli" : "Tümü"}</button>
          <input className="cc-input" style={{ maxWidth: 220 }} placeholder="İsim / telefon / ilan ara" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      {isLoading ? <div className="ad-ph" style={{ padding: 30 }}>Yükleniyor…</div> :
        items.length === 0 ? <div className="ad-ph" style={{ padding: 40 }}>Konuşma yok.</div> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map((cv) => (
              <button key={cv.id} className="cc-urow" onClick={() => setOpenId(cv.id)}>
                <div className="av" style={{ background: cv.flaggedCount > 0 ? "var(--danger)" : undefined }}>{cv.flaggedCount > 0 ? "🚩" : "💬"}</div>
                <div className="ubody">
                  <div className="uname">{cv.buyerName} <span className="muted">↔</span> {cv.sellerName} {cv.flaggedCount > 0 && <span className="cc-tag danger">{cv.flaggedCount} riskli</span>}</div>
                  <div className="umeta">{cv.listingTitle} · {cv.buyerPhone} / {cv.sellerPhone}</div>
                </div>
                <div className="ustat"><b>{nf(cv.messageCount)}</b>mesaj · {timeAgo(cv.lastMessageAt)}</div>
              </button>
            ))}
          </div>
        )}
      {openId && <MessagesSheet id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function MessagesSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, isLoading } = useQuery({ queryKey: ["admin-conv-messages", id], queryFn: () => api.adminConversationMessages(id) });
  const msgs = data?.messages ?? [];
  return (
    <div className="cc-scrim" onClick={onClose}>
      <div className="cc-sheet" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620 }}>
        <div className="cc-sheet-h">
          <div style={{ fontWeight: 800, fontSize: 16 }}>Konuşma</div>
          <button className="cc-x" onClick={onClose}>✕</button>
        </div>
        {isLoading ? <div className="cc-empty">Yükleniyor…</div> :
          msgs.length === 0 ? <div className="cc-empty">Mesaj yok.</div> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {msgs.map((m) => (
                <div key={m.id} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "10px 12px", background: m.flagged ? "color-mix(in oklab, var(--danger) 10%, transparent)" : "var(--surface)", borderColor: m.flagged ? "var(--danger)" : "var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <strong style={{ fontSize: 13 }}>{m.senderName} {m.flagged && <span className="cc-tag danger">🚩 riskli</span>}</strong>
                    <span className="cc-sub" style={{ margin: 0 }}>{dt(m.createdAt)}</span>
                  </div>
                  {m.type === "offer"
                    ? <div style={{ fontWeight: 700, color: "var(--brand-600)" }}>💰 Teklif: {formatPrice(m.offerAmount ?? 0)} {m.offerStatus ? `(${m.offerStatus})` : ""}</div>
                    : <div style={{ fontSize: 13.5, marginTop: 2 }}>{m.body}</div>}
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}

// =================== DİĞER SAYFALAR (hub) ===================
const SITE_LINKS: { label: string; href: string; ic: string; desc: string }[] = [
  { label: "Ana Sayfa", href: "/", ic: "home", desc: "Canlı site" },
  { label: "İlan Ver", href: "/ilan-ver", ic: "plus", desc: "Yeni ilan akışı" },
  { label: "Gizlilik", href: "/gizlilik", ic: "file", desc: "Gizlilik politikası" },
  { label: "Kullanım Koşulları", href: "/kosullar", ic: "file", desc: "Kullanım koşulları" },
  { label: "KVKK", href: "/kvkk", ic: "file", desc: "KVKK aydınlatma" },
  { label: "Sitemap", href: "/sitemap.xml", ic: "layers", desc: "SEO site haritası" },
];

export function OtherPagesSection() {
  const { data: health } = useQuery({ queryKey: ["api-health"], queryFn: async () => {
    try { const r = await fetch(`${process.env.NEXT_PUBLIC_API_BASE ?? ""}/health`); return r.ok; } catch { return false; }
  } });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="ad-panel">
        <div className="ad-panel-h"><div><h3 className="t">Sayfalar &amp; Bağlantılar</h3><p className="s">Canlı site sayfaları ve araçlar</p></div></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 12 }}>
          {SITE_LINKS.map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 11, padding: "13px 14px", border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)", color: "var(--text)" }}>
              <span style={{ width: 34, height: 34, borderRadius: 9, background: "var(--brand-50)", color: "var(--brand)", display: "grid", placeItems: "center" }}><Icon name={l.ic} size={17} /></span>
              <span><span style={{ fontWeight: 700, fontSize: 14, display: "block" }}>{l.label} ↗</span><span style={{ fontSize: 12, color: "var(--text-muted)" }}>{l.desc}</span></span>
            </a>
          ))}
        </div>
      </div>
      <div className="ad-panel">
        <div className="ad-panel-h"><div><h3 className="t">Sistem</h3></div></div>
        <div className="ad-sum">
          <div className="ad-sum-row"><span className="si"><Icon name="refresh" size={15} /></span><span className="sl">API sağlık</span><span className="sv" style={{ color: health ? "var(--success)" : "var(--danger)" }}>{health == null ? "…" : health ? "çalışıyor ✓" : "erişilemiyor"}</span></div>
          <div className="ad-sum-row"><span className="si"><Icon name="layers" size={15} /></span><span className="sl">Ortam</span><span className="sv" style={{ fontSize: 13 }}>production</span></div>
          <div className="ad-sum-row"><span className="si"><Icon name="settings" size={15} /></span><span className="sl">Sürüm / güncelleme</span><span className="sv" style={{ fontSize: 13 }}>Sistem Ayarları →</span></div>
        </div>
      </div>
    </div>
  );
}

// =================== DUYURU GÖNDER (toplu push bildirim) ===================
export function BroadcastSection() {
  const [title, setTitle] = useState("Evinde para var! 💰");
  const [body, setBody] = useState("İlan yükle, kazanmaya başla — kullanmadığın eşyalar komşunun ihtiyacı olabilir.");
  const [saveInApp, setSaveInApp] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function send() {
    if (!title.trim()) { setResult("Başlık gerekli."); return; }
    if (!confirm(`Tüm kullanıcılara bildirim gönderilecek:\n\n${title}\n${body}\n\nOnaylıyor musun?`)) return;
    setBusy(true); setResult(null);
    try {
      const r = await api.adminBroadcast({ title: title.trim(), body: body.trim() || undefined, saveInApp });
      setResult(`✓ Gönderildi — ${r.pushSent}/${r.tokens} cihaza push${saveInApp ? `, ${r.inApp} uygulama-içi bildirim` : ""}${r.cleaned ? `, ${r.cleaned} ölü token temizlendi` : ""}.`);
    } catch (e) {
      setResult("Hata: " + (e as Error).message);
    } finally { setBusy(false); }
  }

  return (
    <div className="ad-panel">
      <div className="ad-panel-h"><div><h3 className="t">Duyuru Gönder</h3><p className="s">Tüm kullanıcılara anlık push bildirimi</p></div><span className="hint">📣</span></div>
      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14, maxWidth: 560 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span className="s">Başlık</span>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Başlık" />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span className="s">Metin</span>
          <textarea className="input" rows={3} value={body} onChange={(e) => setBody(e.target.value)} maxLength={200} placeholder="Bildirim metni" />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input type="checkbox" checked={saveInApp} onChange={(e) => setSaveInApp(e.target.checked)} />
          <span className="s">Uygulama-içi bildirim feed'ine de ekle</span>
        </label>
        <div style={{ background: "var(--bg-soft, #f6f7f9)", borderRadius: 10, padding: "12px 14px", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 4 }}>Önizleme</div>
          <div style={{ fontWeight: 800 }}>{title || "Başlık"}</div>
          <div style={{ fontSize: 13 }}>{body}</div>
        </div>
        <button className="btn btn-primary" onClick={send} disabled={busy} style={{ alignSelf: "flex-start" }}>
          {busy ? "Gönderiliyor…" : "📣 Herkese Gönder"}
        </button>
        {result && <div className={result.startsWith("✓") ? "badge badge-success" : ""} style={{ color: result.startsWith("✓") ? undefined : "var(--danger)" }}>{result}</div>}
      </div>
    </div>
  );
}
