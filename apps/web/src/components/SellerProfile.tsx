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
      <div className="card row" style={{ padding: "var(--space-5)", gap: "var(--space-4)" }}>
        <div style={{ width: 64, height: 64, borderRadius: 999, background: "var(--brand-50)", color: "var(--brand-600)", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 26, flexShrink: 0 }}>
          {(seller?.storeName ?? seller?.name ?? "?").charAt(0).toUpperCase()}
        </div>
        <div className="grow stack" style={{ gap: 4 }}>
          <div className="row" style={{ gap: 8 }}>
            <h1 style={{ margin: 0, fontSize: 22 }}>{seller?.storeName ?? seller?.name ?? "…"}</h1>
            {seller?.isStore && <span className="badge badge-brand">Mağaza</span>}
          </div>
          <div className="row muted" style={{ fontSize: 13, gap: 10, flexWrap: "wrap" }}>
            {seller?.ratingCount ? <span>⭐ {seller.ratingAvg?.toFixed(1)} ({seller.ratingCount} değerlendirme)</span> : <span>Henüz puan yok</span>}
            {seller && <span>Üyelik {timeAgo(seller.createdAt)}</span>}
            {seller?.phoneVerified && <span className="badge badge-success">✓ Telefon</span>}
            {seller?.identityVerified && <span className="badge badge-success">✓ Kimlik</span>}
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
