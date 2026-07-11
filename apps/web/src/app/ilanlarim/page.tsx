"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LISTING_STATUS_LABELS } from "@satiyo/shared";
import { api } from "@/lib/client";
import { useAuth } from "@/lib/auth";
import { formatPrice, timeAgo } from "@/lib/format";

const TABS: { k: string; label: string }[] = [
  { k: "all", label: "Tümü" },
  { k: "active", label: "Yayında" },
  { k: "reserved", label: "Rezerve" },
  { k: "sold", label: "Satıldı" },
  { k: "removed", label: "Kaldırıldı" },
  { k: "draft", label: "Taslak" },
];

export default function MyListingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState("all");
  useEffect(() => { if (!loading && !user) router.replace("/giris?next=/ilanlarim"); }, [user, loading, router]);

  const { data, isLoading } = useQuery({
    queryKey: ["my-listings", tab],
    queryFn: () => api.myListings(tab === "all" ? undefined : tab),
    enabled: !!user,
  });

  if (loading || !user) return <div className="empty">Yükleniyor…</div>;

  function invalidate() { qc.invalidateQueries({ queryKey: ["my-listings"] }); }

  async function remove(id: string) {
    if (!confirm("İlanı kaldırmak istediğine emin misin?")) return;
    await api.deleteListing(id);
    invalidate();
  }
  async function markSold(id: string) {
    if (!confirm("Bu ilanı satıldı olarak işaretle?")) return;
    const satiyo = confirm("Satıyo üzerinden mi sattın?  (Tamam = Satıyo, İptal = dışarıda)");
    await api.markSold(id, { channel: satiyo ? "satiyo" : "disarida" });
    invalidate();
  }

  const items = data?.items ?? [];

  return (
    <div className="stack" style={{ gap: "var(--space-4)" }}>
      <div className="spread"><h1 style={{ fontSize: 22 }}>İlanlarım</h1><Link href="/ilan-ver" className="btn btn-primary">+ İlan Ver</Link></div>

      <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button key={t.k} className={`badge ${tab === t.k ? "badge-brand" : ""}`} style={{ padding: "7px 13px", cursor: "pointer", border: "1px solid var(--border)" }} onClick={() => setTab(t.k)}>{t.label}</button>
        ))}
      </div>

      {isLoading ? <div className="empty">Yükleniyor…</div> :
        items.length === 0 ? <div className="empty">Bu durumda ilan yok.</div> :
        <div className="stack" style={{ gap: 10 }}>
          {items.map((l) => (
            <div key={l.id} className="card row" style={{ padding: "var(--space-3)", gap: "var(--space-3)" }}>
              <Link href={`/ilan/${l.id}`} style={{ width: 72, height: 72, borderRadius: "var(--radius)", overflow: "hidden", background: "var(--surface-2)", flexShrink: 0 }}>
                {l.images[0] ? <img src={l.images[0].url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ display: "grid", placeItems: "center", height: "100%", fontSize: 24, opacity: .4 }}>🖼️</div>}
              </Link>
              <div className="grow stack" style={{ gap: 2 }}>
                <Link href={`/ilan/${l.id}`}><strong>{l.title}</strong></Link>
                <span className="price">{formatPrice(l.price, l.priceType)}</span>
                <div className="row muted" style={{ fontSize: 12, gap: 8, flexWrap: "wrap" }}>
                  <span className="badge">{LISTING_STATUS_LABELS[l.status]}</span>
                  <span>👁 {l.viewCount}</span><span>{timeAgo(l.createdAt)}</span>
                  {l.status === "sold" && l.soldChannel && <span className="badge badge-brand">{l.soldChannel === "satiyo" ? "Satıyo'da satıldı" : "Dışarıda satıldı"}</span>}
                </div>
              </div>
              <div className="stack" style={{ gap: 6 }}>
                {(l.status === "active" || l.status === "reserved") && <button className="btn btn-ghost" onClick={() => markSold(l.id)} style={{ padding: "6px 12px", color: "var(--success)" }}>Satıldı</button>}
                {l.status !== "removed" && <button className="btn btn-ghost" onClick={() => remove(l.id)} style={{ padding: "6px 12px", color: "var(--danger)" }}>Kaldır</button>}
              </div>
            </div>
          ))}
        </div>}
    </div>
  );
}
