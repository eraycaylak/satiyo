"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/client";
import { useAuth } from "@/lib/auth";
import { timeAgo } from "@/lib/format";

export default function NotificationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  useEffect(() => { if (!loading && !user) router.replace("/giris?next=/bildirimler"); }, [user, loading, router]);

  const { data, isLoading } = useQuery({ queryKey: ["notifications"], queryFn: () => api.notifications(), enabled: !!user });

  useEffect(() => {
    if (user && data && data.some((n) => !n.readAt)) {
      api.markNotificationsRead().then(() => qc.invalidateQueries({ queryKey: ["notifications"] }));
    }
  }, [user, data, qc]);

  if (loading || !user) return <div className="empty">Yükleniyor…</div>;

  return (
    <div className="stack" style={{ gap: "var(--space-3)", maxWidth: 640, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22 }}>Bildirimler</h1>
      {isLoading ? <div className="empty">Yükleniyor…</div> :
        !data || data.length === 0 ? <div className="empty"><div style={{ fontSize: 40 }}>🔔</div><p>Bildirim yok.</p><p className="muted">Bir aramayı kaydet, eşleşen yeni ilanlarda burada görürsün.</p></div> :
        data.map((n) => {
          const href = n.data?.listingId ? `/ilan/${n.data.listingId}` : "#";
          return (
            <Link key={n.id} href={href} className="card" style={{ padding: "var(--space-4)", borderLeft: n.readAt ? undefined : "3px solid var(--brand)" }}>
              <div className="spread"><strong>{n.title}</strong><span className="muted" style={{ fontSize: 12 }}>{timeAgo(n.createdAt)}</span></div>
              {n.body && <p className="muted" style={{ margin: "4px 0 0" }}>{n.body}</p>}
            </Link>
          );
        })}
    </div>
  );
}
