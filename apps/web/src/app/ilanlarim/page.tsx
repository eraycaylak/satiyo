"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/client";
import { useAuth } from "@/lib/auth";
import { formatPrice, timeAgo } from "@/lib/format";

const statusLabel: Record<string, string> = { active: "Yayında", reserved: "Rezerve", sold: "Satıldı", draft: "Taslak" };

export default function MyListingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  useEffect(() => { if (!loading && !user) router.replace("/giris?next=/ilanlarim"); }, [user, loading, router]);

  const { data, isLoading } = useQuery({ queryKey: ["my-listings"], queryFn: () => api.myListings(), enabled: !!user });

  if (loading || !user) return <div className="empty">Yükleniyor…</div>;

  async function remove(id: string) {
    if (!confirm("İlanı kaldırmak istediğine emin misin?")) return;
    await api.deleteListing(id);
    qc.invalidateQueries({ queryKey: ["my-listings"] });
  }

  return (
    <div className="stack" style={{ gap: "var(--space-4)" }}>
      <div className="spread"><h1 style={{ fontSize: 22 }}>İlanlarım</h1><Link href="/ilan-ver" className="btn btn-primary">+ İlan Ver</Link></div>
      {isLoading ? <div className="empty">Yükleniyor…</div> :
        !data || data.items.length === 0 ? <div className="empty">Henüz ilanın yok.</div> :
        <div className="stack" style={{ gap: 10 }}>
          {data.items.map((l) => (
            <div key={l.id} className="card row" style={{ padding: "var(--space-3)", gap: "var(--space-3)" }}>
              <Link href={`/ilan/${l.id}`} style={{ width: 72, height: 72, borderRadius: "var(--radius)", overflow: "hidden", background: "var(--surface-2)", flexShrink: 0 }}>
                {l.images[0] ? <img src={l.images[0].url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ display: "grid", placeItems: "center", height: "100%", fontSize: 24, opacity: .4 }}>🖼️</div>}
              </Link>
              <div className="grow stack" style={{ gap: 2 }}>
                <Link href={`/ilan/${l.id}`}><strong>{l.title}</strong></Link>
                <span className="price">{formatPrice(l.price, l.priceType)}</span>
                <div className="row muted" style={{ fontSize: 12, gap: 8 }}>
                  <span className="badge">{statusLabel[l.status]}</span>
                  <span>👁 {l.viewCount}</span><span>{timeAgo(l.createdAt)}</span>
                </div>
              </div>
              <button className="btn btn-ghost" onClick={() => remove(l.id)} style={{ color: "var(--danger)" }}>Kaldır</button>
            </div>
          ))}
        </div>}
    </div>
  );
}
