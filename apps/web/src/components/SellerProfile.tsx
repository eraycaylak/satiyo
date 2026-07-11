"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/client";
import { timeAgo } from "@/lib/format";
import { ListingCard, ListingCardSkeleton, ListingGrid } from "./ListingCard";

export function SellerProfile({ id }: { id: string }) {
  const { data: seller } = useQuery({ queryKey: ["seller", id], queryFn: () => api.getSeller(id) });
  const { data: listings, isLoading } = useQuery({ queryKey: ["seller-listings", id], queryFn: () => api.sellerListings(id) });
  const { data: reviews } = useQuery({ queryKey: ["seller-reviews", id], queryFn: () => api.sellerReviews(id) });

  return (
    <div className="stack" style={{ gap: "var(--space-5)" }}>
      <div className="card stack" style={{ padding: "var(--space-5)", gap: "var(--space-4)" }}>
        <div className="row" style={{ gap: "var(--space-4)" }}>
          <div className="pf-av">
            {seller?.avatarUrl
              ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={seller.avatarUrl} alt={seller.name} />
              : (seller?.storeName ?? seller?.name ?? "?").charAt(0).toUpperCase()}
          </div>
          <div className="grow stack" style={{ gap: 6 }}>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <h1 style={{ margin: 0, fontSize: 22, letterSpacing: "-.02em" }}>{seller?.storeName ?? seller?.name ?? "…"}</h1>
              {seller?.isStore && <span className="badge badge-brand">Mağaza</span>}
            </div>
            <div className="pf-badges">
              {seller?.phoneVerified && <span className="pf-badge ok">✓ Telefon doğrulandı</span>}
              {seller?.identityVerified && <span className="pf-badge ok">✓ Kimlik doğrulandı</span>}
              {!!seller?.ratingCount && (seller.ratingAvg ?? 0) >= 4.5 && seller.ratingCount >= 3 && <span className="pf-badge gold">★ Güvenilir satıcı</span>}
              {seller?.responseTimeAvg != null && <span className="pf-badge">⚡ Hızlı yanıt</span>}
              {!!seller?.followerCount && <span className="pf-badge">👤 {seller.followerCount} takipçi</span>}
            </div>
          </div>
        </div>

        <div className="pf-stats">
          <div className="pf-stat">
            <span className="v">{seller && (seller.trustScore ?? 0) > 0 ? Math.min(100, seller.trustScore) : "—"}</span>
            <span className="k">🛡️ Güven puanı</span>
          </div>
          <div className="pf-stat">
            <span className="v">{seller?.salesCount ?? 0}</span>
            <span className="k">🤝 Satış</span>
          </div>
          <div className="pf-stat">
            <span className="v">{seller?.ratingCount ? `⭐${seller.ratingAvg?.toFixed(1)}` : "—"}</span>
            <span className="k">{seller?.ratingCount ? `${seller.ratingCount} değerlendirme` : "Puan yok"}</span>
          </div>
          <div className="pf-stat">
            <span className="v" style={{ fontSize: 15 }}>{seller ? timeAgo(seller.createdAt) : "…"}</span>
            <span className="k">📅 Üyelik</span>
          </div>
        </div>
      </div>

      <section className="stack" style={{ gap: "var(--space-3)" }}>
        <h2 style={{ fontSize: 18 }}>İlanları {listings && `(${listings.total})`}</h2>
        {isLoading ? (
          <ListingGrid>{Array.from({ length: 4 }).map((_, i) => <ListingCardSkeleton key={i} />)}</ListingGrid>
        ) : !listings || listings.items.length === 0 ? (
          <div className="empty">Aktif ilan yok.</div>
        ) : (
          <ListingGrid>{listings.items.map((l) => <ListingCard key={l.id} listing={l} />)}</ListingGrid>
        )}
      </section>

      {reviews && reviews.length > 0 && (
        <section className="stack" style={{ gap: "var(--space-3)" }}>
          <h2 style={{ fontSize: 18 }}>Değerlendirmeler</h2>
          {reviews.map((r) => (
            <div key={r.id} className="card" style={{ padding: "var(--space-4)" }}>
              <div className="spread">
                <strong>{r.reviewer?.name ?? "Kullanıcı"}</strong>
                <span>{"⭐".repeat(r.rating)}</span>
              </div>
              {r.comment && <p style={{ margin: "6px 0 0", lineHeight: 1.5 }}>{r.comment}</p>}
              <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>{timeAgo(r.createdAt)}</div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
