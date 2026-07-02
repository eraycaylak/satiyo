"use client";
import Link from "next/link";
import type { PublicSeller } from "@satiyo/shared";
import { timeAgo } from "@/lib/format";

export function SellerCard({ seller }: { seller: PublicSeller }) {
  const initial = (seller.storeName ?? seller.name).charAt(0).toUpperCase();
  return (
    <Link href={`/satici/${seller.id}`} className="card row" style={{ padding: "var(--space-4)", gap: "var(--space-3)" }}>
      <div style={{
        width: 52, height: 52, borderRadius: 999, background: "var(--brand-50)", color: "var(--brand-600)",
        display: "grid", placeItems: "center", fontWeight: 800, fontSize: 22, overflow: "hidden", flexShrink: 0,
      }}>
        {seller.avatarUrl ? <img src={seller.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initial}
      </div>
      <div className="grow stack" style={{ gap: 3 }}>
        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          <strong>{seller.storeName ?? seller.name}</strong>
          {seller.isStore && <span className="badge badge-brand">Mağaza</span>}
        </div>
        <div className="row muted" style={{ fontSize: 13, gap: 10, flexWrap: "wrap" }}>
          {seller.ratingCount ? <span>⭐ {seller.ratingAvg?.toFixed(1)} ({seller.ratingCount})</span> : <span>Henüz puan yok</span>}
          <span>Üyelik {timeAgo(seller.createdAt)}</span>
        </div>
        <div className="row" style={{ gap: 6, flexWrap: "wrap", marginTop: 2 }}>
          {seller.phoneVerified && <span className="badge badge-success">✓ Telefon</span>}
          {seller.identityVerified && <span className="badge badge-success">✓ Kimlik</span>}
          {seller.responseTimeAvg != null && <span className="badge">⚡ Genelde hızlı yanıtlar</span>}
        </div>
      </div>
      <span className="muted" style={{ fontSize: 20 }}>›</span>
    </Link>
  );
}
