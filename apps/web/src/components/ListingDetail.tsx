"use client";
import Link from "next/link";
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

  async function toggleFav() {
    if (!user) return router.push("/giris");
    const next = !fav; setFav(next);
    try { next ? await api.addFavorite(id) : await api.removeFavorite(id); } catch { setFav(!next); }
  }

  async function submitComposer() {
    if (!user) return router.push("/giris");
    setBusy(true);
    try {
      const conv = await api.startConversation(id, text || "Merhaba, ilanınız hâlâ satılık mı?");
      if (composer === "offer" && amount) {
        await api.sendMessage(conv.id, { type: "offer", offerAmount: Math.round(Number(amount) * 100) });
      }
      router.push(`/mesajlar/${conv.id}`);
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

  function share() {
    const url = window.location.href;
    if (navigator.share) navigator.share({ title: listing!.title, url }).catch(() => {});
    else { navigator.clipboard.writeText(url); alert("Bağlantı kopyalandı"); }
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
      <div className="row muted" style={{ fontSize: 13, gap: 6 }}>
        <Link href="/">Keşfet</Link> <span>›</span>
        {cat && <><Link href={`/?categoryId=${cat.id}`}>{cat.name}</Link> <span>›</span></>}
        <span>{listing.title}</span>
      </div>

      <div className="detail-grid">
        <Gallery images={listing.images} title={listing.title} />

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
              <button className="btn btn-ghost btn-lg" onClick={toggleFav} aria-label="Favori" style={{ color: fav ? "var(--danger)" : undefined }}>{fav ? "♥" : "♡"}</button>
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

      {/* Özellikler */}
      {schema.length > 0 && Object.keys(listing.attributes).length > 0 && (
        <section className="card" style={{ padding: "var(--space-4) var(--space-5)" }}>
          <h2 style={{ fontSize: 16, marginTop: 0 }}>Özellikler</h2>
          <table className="attr-table">
            <tbody>
              {schema.filter((a) => listing.attributes[a.key]).map((a) => (
                <tr key={a.key}><td>{a.label}</td><td>{listing.attributes[a.key]}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Açıklama */}
      {listing.description && (
        <section className="card" style={{ padding: "var(--space-4) var(--space-5)" }}>
          <h2 style={{ fontSize: 16, marginTop: 0 }}>Açıklama</h2>
          <p style={{ whiteSpace: "pre-wrap", margin: 0, lineHeight: 1.6 }}>{listing.description}</p>
        </section>
      )}

      <div className="row" style={{ gap: 12 }}>
        <button className="btn btn-ghost" onClick={share}>↗ Paylaş</button>
        {!isOwner && <button className="btn btn-ghost" onClick={report}>⚑ Şikayet Et</button>}
      </div>

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
