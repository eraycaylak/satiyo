"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/client";
import { useAuth } from "@/lib/auth";
import { timeAgo } from "@/lib/format";

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"stats" | "reports" | "synonyms">("stats");
  const [newTerm, setNewTerm] = useState("");
  const [newAliases, setNewAliases] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/giris?next=/admin");
    if (!loading && user && !user.isAdmin) router.replace("/");
  }, [user, loading, router]);

  const { data: stats } = useQuery({ queryKey: ["admin-stats"], queryFn: () => api.adminStats(), enabled: !!user?.isAdmin });
  const { data: reports } = useQuery({ queryKey: ["admin-reports"], queryFn: () => api.adminReports("open"), enabled: !!user?.isAdmin && tab === "reports" });
  const { data: synonyms } = useQuery({ queryKey: ["admin-synonyms"], queryFn: () => api.adminSynonyms(), enabled: !!user?.isAdmin && tab === "synonyms" });

  if (loading || !user?.isAdmin) return <div className="empty">Yükleniyor…</div>;

  async function resolveReport(id: string, targetType: string, targetId: string, removeTarget: boolean) {
    if (removeTarget && targetType === "listing") await api.adminRemoveListing(targetId);
    if (removeTarget && targetType === "user") await api.adminBanUser(targetId);
    await api.adminResolveReport(id);
    qc.invalidateQueries({ queryKey: ["admin-reports"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
  }
  async function addSynonym() {
    if (!newTerm.trim() || !newAliases.trim()) return;
    await api.adminAddSynonym(newTerm.trim(), newAliases.split(",").map((s) => s.trim()).filter(Boolean));
    setNewTerm(""); setNewAliases("");
    qc.invalidateQueries({ queryKey: ["admin-synonyms"] });
  }

  return (
    <div className="stack" style={{ gap: "var(--space-4)", maxWidth: 760, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24 }}>🛡️ Admin Paneli</h1>
      <div className="row" style={{ gap: 8 }}>
        {(["stats", "reports", "synonyms"] as const).map((tb) => (
          <button key={tb} className={`badge ${tab === tb ? "badge-brand" : ""}`} style={{ padding: "8px 14px", cursor: "pointer", border: "1px solid var(--border)" }} onClick={() => setTab(tb)}>
            {tb === "stats" ? "Özet" : tb === "reports" ? "Şikayetler" : "Synonym Sözlüğü"}
          </button>
        ))}
      </div>

      {tab === "stats" && stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: 12 }}>
          {[
            { l: "Kullanıcı", v: stats.users },
            { l: "Aktif İlan", v: stats.activeListings },
            { l: "Açık Şikayet", v: stats.openReports },
            { l: "Gelir (₺)", v: new Intl.NumberFormat("tr-TR").format(stats.revenue / 100) },
          ].map((s) => (
            <div key={s.l} className="card" style={{ padding: "var(--space-5)" }}>
              <div className="muted" style={{ fontSize: 13 }}>{s.l}</div>
              <div className="price" style={{ fontSize: 28 }}>{s.v}</div>
            </div>
          ))}
        </div>
      )}

      {tab === "reports" && (
        !reports || reports.length === 0 ? <div className="empty">Açık şikayet yok 🎉</div> :
        reports.map((r) => (
          <div key={r.id} className="card" style={{ padding: "var(--space-4)" }}>
            <div className="spread">
              <span className="badge">{r.targetType}</span>
              <span className="muted" style={{ fontSize: 12 }}>{timeAgo(r.createdAt)}</span>
            </div>
            <p style={{ margin: "8px 0" }}><strong>{r.reason}</strong></p>
            <p className="muted" style={{ fontSize: 12, margin: 0 }}>Bildiren: {r.reporterName} · Hedef: {r.targetId}</p>
            <div className="row" style={{ gap: 8, marginTop: 10 }}>
              <button className="btn btn-ghost" onClick={() => resolveReport(r.id, r.targetType, r.targetId, false)}>Çözüldü işaretle</button>
              {r.targetType === "listing" && <button className="btn btn-primary" onClick={() => resolveReport(r.id, r.targetType, r.targetId, true)}>İlanı kaldır + çöz</button>}
              {r.targetType === "user" && <button className="btn btn-primary" style={{ background: "var(--danger)" }} onClick={() => resolveReport(r.id, r.targetType, r.targetId, true)}>Kullanıcıyı banla + çöz</button>}
            </div>
          </div>
        ))
      )}

      {tab === "synonyms" && (
        <div className="stack" style={{ gap: 12 }}>
          <div className="card stack" style={{ padding: "var(--space-4)", gap: 8 }}>
            <strong>Yeni synonym ekle</strong>
            <input className="input" placeholder="Terim (ör. telefon)" value={newTerm} onChange={(e) => setNewTerm(e.target.value)} />
            <input className="input" placeholder="Eşler, virgülle (ör. cep, smartphone, ayfon)" value={newAliases} onChange={(e) => setNewAliases(e.target.value)} />
            <button className="btn btn-primary" onClick={addSynonym}>Ekle</button>
          </div>
          {synonyms?.map((s) => (
            <div key={s.id} className="card spread" style={{ padding: "var(--space-3) var(--space-4)" }}>
              <span><strong>{s.term}</strong> → {s.aliases.join(", ")}</span>
              <button className="btn btn-ghost" onClick={async () => { await api.adminDeleteSynonym(s.id); qc.invalidateQueries({ queryKey: ["admin-synonyms"] }); }}>Sil</button>
            </div>
          ))}
          {synonyms && synonyms.length === 0 && <p className="muted">Henüz özel synonym yok (koddaki varsayılanlar geçerli).</p>}
        </div>
      )}
    </div>
  );
}
