"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAttributeSchema, getCategory, BOOST_PACKAGES } from "@satiyo/shared";
import { api } from "@/lib/client";
import { useAuth } from "@/lib/auth";
import { conditionLabel, formatPrice, locationText, priceTypeLabel, timeAgo } from "@/lib/format";
import { Gallery } from "./Gallery";
import { SellerCard } from "./SellerCard";
import { ListingCard, ListingGrid } from "./ListingCard";
import { JsonLd } from "./JsonLd";

const MapView = dynamic(() => import("./MapView"), { ssr: false, loading: () => <div className="empty">Harita yükleniyor…</div> });

export function ListingDetail({ id }: { id: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const [fav, setFav] = useState(false);
  const [composer, setComposer] = useState<null | "message" | "offer">(null);
  const [text, setText] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [boostOpen, setBoostOpen] = useState(false);
  const [boostMsg, setBoostMsg] = useState<string | null>(null);
  const [tab, setTab] = useState<"info" | "desc" | "loc">("info");
  const [shortUrl, setShortUrl] = useState<string | null>(null);

  const { data: listing, isLoading, isError } = useQuery({
    queryKey: ["listing", id],
    queryFn: async () => {
      const l = await api.getListing(id);
      setFav(!!l.favorited);
      return l;
    },
  });

  const { data: similar } = useQuery({
    queryKey: ["similar", listing?.categoryId, id],
    queryFn: () => api.search({ categoryId: listing!.categoryId, pageSize: 6 }),
    enabled: !!listing,
  });

  if (isLoading) return <DetailSkeleton />;
  if (isError || !listing) return <div className="empty">İlan bulunamadı veya kaldırılmış.</div>;

  const cat = getCategory(listing.categoryId);
  const schema = getAttributeSchema(listing.categoryId);

  // SEO/rich results — Product yapılandırılmış verisi
  const productLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    description: listing.description || listing.title,
    image: (listing.images ?? []).map((im) => im.url).filter(Boolean),
    ...(cat ? { category: cat.name } : {}),
    offers: {
      "@type": "Offer",
      price: listing.price / 100,
      priceCurrency: "TRY",
      itemCondition: "https://schema.org/UsedCondition",
      availability: listing.status === "active" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `https://satiyo.app/ilan/${id}`,
    },
  };

  async function toggleFav() {
    if (!user) return router.push("/giris");
    const next = !fav; setFav(next);
    try { next ? await api.addFavorite(id) : await api.removeFavorite(id); } catch { setFav(!next); }
  }

  async function submitComposer() {
    if (!user) return router.push("/giris");
    setBusy(true);
    try {
      // A2 — önce mevcut konuşmayı ara; varsa tekrar şablon atma
      const convs = await api.conversations().catch(() => []);
      const existing = convs.find((c) => c.listingId === id && c.buyerId === user.id);
      let convId: string;
      if (existing) {
        convId = existing.id;
        if (composer === "offer" && amount) await api.sendMessage(convId, { type: "offer", offerAmount: Math.round(Number(amount) * 100) });
        else if (text.trim()) await api.sendMessage(convId, { type: "text", body: text.trim() });
      } else {
        // yeni konuşma: teklifse mesajsız aç, değilse yazılan/şablon mesaj
        const created = await api.startConversation(id, composer === "offer" ? undefined : (text.trim() || "Merhaba, ilanınız hâlâ satılık mı?"));
        convId = created.id;
        if (composer === "offer" && amount) await api.sendMessage(convId, { type: "offer", offerAmount: Math.round(Number(amount) * 100) });
      }
      router.push(`/mesajlar/${convId}`);
    } catch (e) {
      alert("Gönderilemedi: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function report() {
    if (!user) return router.push("/giris");
    const reason = prompt("Şikayet nedeni:");
    if (!reason) return;
    await api.report({ targetType: "listing", targetId: id, reason });
    alert("Şikayetiniz alındı, teşekkürler.");
  }

  // Kısa linki bir kez al, sonra sosyal paylaşımlarda kullan.
  async function getShareUrl(): Promise<string> {
    if (shortUrl) return shortUrl;
    try {
      const r = await api.shareLink(id);
      if (r?.url) { setShortUrl(r.url); return r.url; }
    } catch { /* uzun linke düş */ }
    return window.location.href;
  }

  async function shareTo(net: "wa" | "x" | "fb" | "copy") {
    const url = await getShareUrl();
    const txt = `${listing!.title} — ${formatPrice(listing!.price, listing!.priceType)} · Satıyo'da`;
    if (net === "wa") window.open(`https://wa.me/?text=${encodeURIComponent(`${txt}: ${url}`)}`, "_blank", "noopener");
    else if (net === "x") window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(txt)}&url=${encodeURIComponent(url)}`, "_blank", "noopener");
    else if (net === "fb") window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank", "noopener");
    else { await navigator.clipboard.writeText(url); alert("Kısa bağlantı kopyalandı"); }
  }

  async function doBoost(packageId: string) {
    setBusy(true); setBoostMsg(null);
    try {
      const r = await api.boostListing(id, packageId);
      const until = new Date(r.boostedUntil).toLocaleDateString("tr-TR");
      setBoostMsg(`✓ İlan ${until} tarihine kadar öne çıkarıldı!`);
      setTimeout(() => { setBoostOpen(false); window.location.reload(); }, 1400);
    } catch (e) {
      setBoostMsg("Hata: " + (e as Error).message);
    } finally { setBusy(false); }
  }

  const isOwner = user?.id === listing.sellerId;

  return (
    <div className="stack" style={{ gap: "var(--space-5)" }}>
      <JsonLd data={productLd} />
      <div className="row muted" style={{ fontSize: 13, gap: 6 }}>
        <Link href="/">Keşfet</Link> <span>›</span>
        {cat && <><Link href={`/?categoryId=${cat.id}`}>{cat.name}</Link> <span>›</span></>}
        <span>{listing.title}</span>
      </div>

      <div className="detail-grid">
        <div style={{ position: "relative" }}>
          <Gallery images={listing.images} title={listing.title} />
          {/* Sahibinden tarzı: foto üstünde sağ üst köşe — favori + sosyal paylaşım */}
          <div className="gal-actions">
            <button className="gal-act" onClick={toggleFav} aria-label="Favorilere ekle" title="Favori" style={{ color: fav ? "var(--danger)" : "var(--text)" }}>{fav ? "♥" : "♡"}</button>
            <button className="gal-act" onClick={() => shareTo("wa")} aria-label="WhatsApp'ta paylaş" title="WhatsApp">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="#25D366"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.4 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.4.6-.5.5c-.2.2-.3.4-.1.7.2.3.9 1.5 2 2.4 1.4 1.2 2.5 1.6 2.8 1.7.3.1.5.1.7-.1l1-1.2c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.6.4 0 .1 0 .7-.2 1.3z"/></svg>
            </button>
            <button className="gal-act" onClick={() => shareTo("x")} aria-label="X'te paylaş" title="X (Twitter)">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-6.4L6.4 22H3.3l7.3-8.3L1.2 2h6.4l4.4 5.9L18.9 2zm-1.1 18h1.7L7 3.7H5.1L17.8 20z"/></svg>
            </button>
            <button className="gal-act" onClick={() => shareTo("fb")} aria-label="Facebook'ta paylaş" title="Facebook">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="#1877F2"><path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z"/></svg>
            </button>
            <button className="gal-act" onClick={() => shareTo("copy")} aria-label="Bağlantıyı kopyala" title="Bağlantıyı kopyala">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>
            </button>
          </div>
        </div>

        <div className="stack" style={{ gap: "var(--space-4)" }}>
          <div className="stack" style={{ gap: 8 }}>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <span className="badge">{conditionLabel[listing.condition]}</span>
              <span className="badge">{priceTypeLabel[listing.priceType]}</span>
              {listing.status === "reserved" && <span className="badge badge-accent">Rezerve</span>}
              {listing.status === "sold" && <span className="badge">Satıldı</span>}
            </div>
            <h1 style={{ margin: 0, fontSize: 24, lineHeight: 1.25 }}>{listing.title}</h1>
            <div className="price" style={{ fontSize: 30 }}>{formatPrice(listing.price, listing.priceType)}</div>
            <div className="row muted" style={{ fontSize: 13, gap: 12, flexWrap: "wrap" }}>
              <span>📍 {locationText(listing.city, listing.district)}</span>
              <span>👁 {listing.viewCount} görüntülenme</span>
              <span>{timeAgo(listing.createdAt)}</span>
            </div>
          </div>

          {!isOwner && listing.status === "active" && (
            <div className="row" style={{ gap: 8 }}>
              <button className="btn btn-primary grow btn-lg" onClick={() => { setComposer("message"); setText(""); }}>Mesaj At</button>
              {listing.priceType === "negotiable" && (
                <button className="btn btn-ghost btn-lg" onClick={() => { setComposer("offer"); setText("Teklifim var"); }}>Teklif Ver</button>
              )}
            </div>
          )}
          {isOwner && (
            <div className="row" style={{ gap: 8 }}>
              <button className="btn btn-primary grow" onClick={() => { setBoostOpen(true); setBoostMsg(null); }}>✦ Öne Çıkar</button>
              <Link href={`/ilan-ver?duzenle=${id}`} className="btn btn-ghost">Düzenle</Link>
            </div>
          )}

          {listing.seller && <SellerCard seller={listing.seller} />}

          <div className="safety-strip">
            <span>🛡️</span>
            <span>Kapora gönderme. Yüz yüze, kalabalık ve güvenli bir yerde buluş. Şüpheli isteklere karşı dikkatli ol.</span>
          </div>
        </div>
      </div>

      {/* Sahibinden tarzı 3 sekme: İlan Bilgileri | Açıklama | Konumu */}
      <section className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="dtabs" role="tablist">
          <button role="tab" aria-selected={tab === "info"} className={"dtab" + (tab === "info" ? " on" : "")} onClick={() => setTab("info")}>İlan Bilgileri</button>
          <button role="tab" aria-selected={tab === "desc"} className={"dtab" + (tab === "desc" ? " on" : "")} onClick={() => setTab("desc")}>Açıklama</button>
          <button role="tab" aria-selected={tab === "loc"} className={"dtab" + (tab === "loc" ? " on" : "")} onClick={() => setTab("loc")}>Konumu</button>
        </div>
        <div style={{ padding: "var(--space-4) var(--space-5)" }}>
          {tab === "info" && (
            <table className="attr-table">
              <tbody>
                <tr><td>İlan No</td><td>{(() => { const hx = listing.id.replace(/^lst_/, ""); try { return String(BigInt("0x" + hx)).slice(0, 10); } catch { return hx.replace(/\D/g, "").slice(0, 10) || "0"; } })()}</td></tr>
                <tr><td>İlan Tarihi</td><td>{timeAgo(listing.createdAt)}</td></tr>
                {cat && <tr><td>Kategori</td><td>{cat.name}</td></tr>}
                <tr><td>Durum</td><td>{conditionLabel[listing.condition]}</td></tr>
                <tr><td>Fiyat Tipi</td><td>{priceTypeLabel[listing.priceType]}</td></tr>
                <tr><td>Görüntülenme</td><td>{listing.viewCount}</td></tr>
                {schema.filter((a) => listing.attributes[a.key]).map((a) => (
                  <tr key={a.key}><td>{a.label}</td><td>{listing.attributes[a.key]}</td></tr>
                ))}
              </tbody>
            </table>
          )}
          {tab === "desc" && (
            <p style={{ whiteSpace: "pre-wrap", margin: 0, lineHeight: 1.65 }}>{listing.description || "Bu ilan için açıklama girilmemiş."}</p>
          )}
          {tab === "loc" && (
            <div className="stack" style={{ gap: 12 }}>
              <div style={{ fontWeight: 700 }}>📍 {locationText(listing.city, listing.district)}</div>
              <MapView listings={[listing]} />
            </div>
          )}
        </div>
      </section>

      {!isOwner && (
        <div className="row" style={{ gap: 12 }}>
          <button className="btn btn-ghost" onClick={report} style={{ fontSize: 13 }}>⚑ Şikayet Et</button>
        </div>
      )}

      {/* Benzer ilanlar */}
      {similar && similar.items.filter((l) => l.id !== id).length > 0 && (
        <section className="stack" style={{ gap: "var(--space-3)" }}>
          <h2 style={{ fontSize: 18 }}>Benzer ilanlar</h2>
          <ListingGrid>
            {similar.items.filter((l) => l.id !== id).slice(0, 6).map((l) => <ListingCard key={l.id} listing={l} />)}
          </ListingGrid>
        </section>
      )}

      {/* Boost paket seçimi */}
      {boostOpen && (
        <div className="modal-backdrop" onClick={() => setBoostOpen(false)}>
          <div className="modal stack" style={{ gap: 12 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: 0 }}>✦ İlanı Öne Çıkar</h3>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>Daha fazla kişiye ulaş, daha hızlı sat.</p>
            {BOOST_PACKAGES.map((p) => (
              <button key={p.id} className="card spread" disabled={busy} onClick={() => doBoost(p.id)}
                style={{ padding: "var(--space-4)", textAlign: "left", cursor: "pointer", border: p.highlight ? "1px solid var(--brand)" : undefined }}>
                <div className="stack" style={{ gap: 2 }}>
                  <strong>{p.label}</strong>
                  {p.highlight && <span className="badge badge-brand">{p.highlight}</span>}
                </div>
                <span className="price">{new Intl.NumberFormat("tr-TR").format(p.price / 100)} ₺</span>
              </button>
            ))}
            {boostMsg && <p className={boostMsg.startsWith("✓") ? "badge badge-success" : ""} style={{ color: boostMsg.startsWith("✓") ? undefined : "var(--danger)" }}>{boostMsg}</p>}
            <button className="btn btn-ghost" onClick={() => setBoostOpen(false)}>Kapat</button>
            <p className="muted" style={{ fontSize: 11, textAlign: "center", margin: 0 }}>Geliştirme modunda ödeme simüle edilir (mock).</p>
          </div>
        </div>
      )}

      {/* Mesaj/Teklif kutusu */}
      {composer && (
        <div className="modal-backdrop" onClick={() => setComposer(null)}>
          <div className="modal stack" style={{ gap: 12 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: 0 }}>{composer === "offer" ? "Teklif Ver" : "Mesaj Gönder"}</h3>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>{listing.title}</p>
            {composer === "offer" && (
              <div className="field" style={{ margin: 0 }}>
                <label className="label">Teklifin (₺)</label>
                <input className="input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="örn. 15000" />
              </div>
            )}
            <textarea className="input" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Mesajını yaz…" />
            <div className="row" style={{ gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setComposer(null)}>Vazgeç</button>
              <button className="btn btn-primary" disabled={busy || (composer === "offer" && !amount)} onClick={submitComposer}>
                {busy ? "Gönderiliyor…" : "Gönder"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="detail-grid">
      <div className="skeleton" style={{ aspectRatio: "4 / 3" }} />
      <div className="stack" style={{ gap: 12 }}>
        <div className="skeleton" style={{ height: 28, width: "70%" }} />
        <div className="skeleton" style={{ height: 36, width: "40%" }} />
        <div className="skeleton" style={{ height: 48 }} />
        <div className="skeleton" style={{ height: 80 }} />
      </div>
    </div>
  );
}
