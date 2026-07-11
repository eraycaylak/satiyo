"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/client";
import { useAuth } from "@/lib/auth";
import { formatPrice, timeAgo } from "@/lib/format";

export default function ConversationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => { if (!loading && !user) router.replace("/giris?next=/mesajlar"); }, [user, loading, router]);

  const { data, isLoading } = useQuery({ queryKey: ["conversations"], queryFn: () => api.conversations(), enabled: !!user, refetchInterval: 15000 });

  if (loading || !user) return <div className="empty">Yükleniyor…</div>;

  return (
    <div className="stack" style={{ gap: "var(--space-4)", maxWidth: 640, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22 }}>Mesajlar</h1>
      {isLoading ? <div className="empty">Yükleniyor…</div> :
        !data || data.length === 0 ? <div className="empty"><div style={{ fontSize: 40 }}>✉</div><p>Henüz mesajın yok.</p></div> :
        <div className="stack" style={{ gap: 8 }}>
          {data.map((cv) => (
            <Link key={cv.id} href={`/mesajlar/${cv.id}`} className="card row" style={{ padding: "var(--space-3)", gap: "var(--space-3)" }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div style={{ width: 56, height: 56, borderRadius: "var(--radius)", overflow: "hidden", background: "var(--surface-2)" }}>
                  {cv.listing?.coverUrl ? <img src={cv.listing.coverUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ display: "grid", placeItems: "center", height: "100%", fontSize: 22, opacity: .4 }}>🖼️</div>}
                </div>
                <div style={{ position: "absolute", right: -5, bottom: -5, width: 26, height: 26, borderRadius: 999, overflow: "hidden", background: "var(--brand-50)", color: "var(--brand-600)", border: "2px solid var(--surface)", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 800 }}>
                  {cv.otherUser?.avatarUrl ? <img src={cv.otherUser.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (cv.otherUser?.name ?? "?").charAt(0).toUpperCase()}
                </div>
              </div>
              <div className="grow stack" style={{ gap: 2, minWidth: 0 }}>
                <div className="spread">
                  <strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cv.otherUser?.name ?? "Kullanıcı"}</strong>
                  <span className="muted" style={{ fontSize: 12 }}>{timeAgo(cv.lastMessageAt)}</span>
                </div>
                <span className="muted" style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {cv.lastMessage?.type === "offer" ? `💰 Teklif: ${formatPrice(cv.lastMessage.offerAmount ?? 0)}` : cv.lastMessage?.body ?? "—"}
                </span>
                <span className="muted" style={{ fontSize: 12 }}>{cv.listing?.title}</span>
              </div>
              {!!cv.unreadCount && <span className="badge" style={{ background: "var(--brand)", color: "#fff" }}>{cv.unreadCount}</span>}
            </Link>
          ))}
        </div>}
    </div>
  );
}
