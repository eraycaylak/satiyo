"use client";
import Link from "next/link";
import { useState } from "react";
import type { Listing } from "@satiyo/shared";
import { formatPrice, locationText, timeAgo } from "@/lib/format";
import { api } from "@/lib/client";
import { useAuth } from "@/lib/auth";

export function ListingCard({ listing }: { listing: Listing }) {
  const { user } = useAuth();
  const [fav, setFav] = useState(!!listing.favorited);
  const cover = listing.images[0]?.url;
  const boosted = listing.boostedUntil != null && listing.boostedUntil > Date.now();

  async function toggleFav(e: React.MouseEvent) {
    e.preventDefault();
    if (!user) { window.location.href = "/giris"; return; }
    const next = !fav;
    setFav(next);
    try {
      next ? await api.addFavorite(listing.id) : await api.removeFavorite(listing.id);
    } catch { setFav(!next); }
  }

  return (
    <Link href={`/ilan/${listing.id}`} className="card listing-card" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ position: "relative", aspectRatio: "4 / 3", background: "var(--surface-2)" }}>
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={listing.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ display: "grid", placeItems: "center", height: "100%", fontSize: 40, opacity: 0.4 }}>🖼️</div>
        )}
        {boosted && <span className="badge badge-accent" style={{ position: "absolute", top: 8, left: 8 }}>✦ Öne çıkan</span>}
        <button
          onClick={toggleFav}
          aria-label="Favori"
          style={{
            position: "absolute", top: 8, right: 8, width: 34, height: 34, borderRadius: 999,
            border: "none", background: "rgba(255,255,255,0.92)", color: fav ? "var(--danger)" : "#888",
            fontSize: 17, display: "grid", placeItems: "center", boxShadow: "var(--shadow-sm)",
          }}
        >
          {fav ? "♥" : "♡"}
        </button>
      </div>
      <div className="stack" style={{ padding: "var(--space-3)", gap: 6, flex: 1 }}>
        <div className="price" style={{ fontSize: 17 }}>{formatPrice(listing.price, listing.priceType)}</div>
        <div style={{ fontWeight: 500, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: 38 }}>
          {listing.title}
        </div>
        <div className="spread muted" style={{ fontSize: 12, marginTop: "auto" }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{locationText(listing.city, listing.district)}</span>
          <span>{timeAgo(listing.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}

export function ListingGrid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gap: "var(--space-4)", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))" }}>
      {children}
    </div>
  );
}

export function ListingCardSkeleton() {
  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div className="skeleton" style={{ aspectRatio: "4 / 3", borderRadius: 0 }} />
      <div className="stack" style={{ padding: "var(--space-3)", gap: 8 }}>
        <div className="skeleton" style={{ height: 18, width: "50%" }} />
        <div className="skeleton" style={{ height: 14, width: "90%" }} />
        <div className="skeleton" style={{ height: 12, width: "70%" }} />
      </div>
    </div>
  );
}
