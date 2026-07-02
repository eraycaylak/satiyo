"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/client";
import { useAuth } from "@/lib/auth";
import { ListingCard, ListingCardSkeleton, ListingGrid } from "@/components/ListingCard";

export default function FavoritesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => { if (!loading && !user) router.replace("/giris?next=/favoriler"); }, [user, loading, router]);

  const { data, isLoading } = useQuery({ queryKey: ["favorites"], queryFn: () => api.favorites(), enabled: !!user });

  if (loading || !user) return <div className="empty">Yükleniyor…</div>;

  return (
    <div className="stack" style={{ gap: "var(--space-4)" }}>
      <h1 style={{ fontSize: 22 }}>Favorilerim</h1>
      {isLoading ? (
        <ListingGrid>{Array.from({ length: 4 }).map((_, i) => <ListingCardSkeleton key={i} />)}</ListingGrid>
      ) : !data || data.items.length === 0 ? (
        <div className="empty"><div style={{ fontSize: 40 }}>♡</div><p>Henüz favori yok.</p></div>
      ) : (
        <ListingGrid>{data.items.map((l) => <ListingCard key={l.id} listing={l} />)}</ListingGrid>
      )}
    </div>
  );
}
