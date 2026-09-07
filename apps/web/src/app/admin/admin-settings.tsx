"use client";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/client";
import { timeAgo } from "@/lib/format";
import { AiSection, SearchSection } from "./sections";

// =================== C4 — MAĞAZA BAŞVURULARI ===================
export function StoresSection() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("pending");
  const { data, isLoading } = useQuery({ queryKey: ["admin-stores", status], queryFn: () => api.adminStoreApplications(status) });
  const apps = data ?? [];

  async function approve(id: string) {
    await api.adminApproveStore(id);
    qc.invalidateQueries({ queryKey: ["admin-stores"] });
  }
  async function reject(id: string) {
    const note = window.prompt("Ret nedeni (kullanıcıya iletilir):", "") ?? "";
    await api.adminRejectStore(id, note);
    qc.invalidateQueries({ queryKey: ["admin-stores"] });
  }

  return (
    <div className="ad-panel">
      <div className="ad-panel-h" style={{ flexWrap: "wrap", gap: 8 }}>
        <div><h3 className="t">Mağaza Başvuruları</h3><p className="s">Belge + kimlik doğrulama kuyruğu</p></div>
        <div style={{ display: "flex", gap: 3, padding: 3, borderRadius: 10, background: "var(--surface-2)" }}>
          {([["pending", "Bekleyen"], ["approved", "Onaylı"], ["rejected", "Reddedilen"]] as const).map(([v, l]) => (
            <button key={v} onClick={() => setStatus(v)}
              style={{ padding: "6px 12px", borderRadius: 8, border: 0, fontSize: 12.5, fontWeight: 600, background: status === v ? "var(--surface)" : "transparent", color: status === v ? "var(--text)" : "var(--text-muted)", boxShadow: status === v ? "var(--shadow-sm)" : "none" }}>{l}</button>
          ))}
        </div>
      </div>
      {isLoading ? <div className="ad-ph" style={{ padding: 30 }}>Yükleniyor…</div> :
        apps.length === 0 ? <div className="ad-ph" style={{ padding: 40 }}>Başvuru yok.</div> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {apps.map((a) => (
              <div key={a.id} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{a.storeName}</div>
                    <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{a.userName} · {a.userPhone} · {timeAgo(a.createdAt)}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "flex-start" }}>
                    <span className="ad-st" style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>{a.legalType === "company" ? "Şirket" : "Bireysel"}</span>
                    {a.legalType === "company"
                      ? <span className={`ad-st ${a.taxVerified ? "active" : "removed"}`}>Vergi No {a.taxVerified ? "✓" : "✗"}</span>
                      : <span className={`ad-st ${a.tcVerified ? "active" : "removed"}`}>TC {a.tcVerified ? "✓" : "✗"}</span>}
                  </div>
                </div>
                {a.taxNo && <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 6 }}>Vergi No: {a.taxNo}</div>}
                {a.docUrls.length > 0 && (
                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    {a.docUrls.map((u, i) => (
                      <a key={i} href={u} target="_blank" rel="noopener noreferrer">
                        <img src={u} alt={`belge ${i + 1}`} style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border)" }} />
                      </a>
                    ))}
                  </div>
                )}
                {a.reviewNote && <div style={{ fontSize: 12.5, color: "var(--danger)", marginTop: 8 }}>Not: {a.reviewNote}</div>}
                {a.status === "pending" && (
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button className="cc-btn primary" onClick={() => approve(a.id)}>Onayla</button>
                    <button className="cc-btn danger" onClick={() => reject(a.id)}>Reddet</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

// =================== C2 — ZORUNLU GÜNCELLEME / SÜRÜM ===================
const CONFIG_FIELDS: { key: string; label: string; hint: string }[] = [
  { key: "min_version_ios", label: "iOS — Min. sürüm", hint: "Bunun altı ZORUNLU güncellenir. 0.0.0 = kimseyi bloklama." },
  { key: "min_version_android", label: "Android — Min. sürüm", hint: "Bunun altı ZORUNLU güncellenir." },
  { key: "latest_version_ios", label: "iOS — Son sürüm", hint: "Store'daki güncel sürüm." },
  { key: "latest_version_android", label: "Android — Son sürüm", hint: "Store'daki güncel sürüm." },
  { key: "store_url_ios", label: "iOS Store URL", hint: "App Store linki." },
  { key: "store_url_android", label: "Android Store URL", hint: "Play/site linki." },
  { key: "update_message", label: "Güncelleme mesajı", hint: "Engelleme ekranında gösterilir." },
  { key: "support_whatsapp", label: "Destek WhatsApp (Satıyo Temsilcisi)", hint: "Ülke koduyla, sadece rakam: ör. 905XXXXXXXXX. Boş bırakılırsa uygulamada WhatsApp satırı gizlenir." },
  { key: "marketing_push_enabled", label: "Günlük pazarlama bildirimleri", hint: "Günün belirli saatlerinde (10:00 / 13:00 / 19:00 / 21:30 TR) otomatik slogan bildirimi. Durdurmak için 'false' yaz; açık için boş bırak veya 'true'." },
];

export function VersionSection() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-config"], queryFn: () => api.adminConfig() });
  const [vals, setVals] = useState<Record<string, string>>({});
  const [savedKey, setSavedKey] = useState<string | null>(null);
  useEffect(() => { if (data) setVals(data); }, [data]);

  async function save(key: string) {
    await api.adminSetConfig(key, vals[key] ?? "");
    setSavedKey(key);
    qc.invalidateQueries({ queryKey: ["admin-config"] });
    setTimeout(() => setSavedKey(null), 1500);
  }

  return (
    <div className="ad-panel">
      <div className="ad-panel-h"><div><h3 className="t">Zorunlu Güncelleme</h3><p className="s">Uygulama açılışında sürüm kapısı (deploy/store güncellemesi gerektirmez)</p></div></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {CONFIG_FIELDS.map((f) => (
          <div key={f.key}>
            <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>{f.label}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="cc-input" value={vals[f.key] ?? ""} placeholder={f.key.includes("version") ? "0.0.0" : ""} onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))} />
              <button className="cc-btn primary" onClick={() => save(f.key)}>{savedKey === f.key ? "✓" : "Kaydet"}</button>
            </div>
            <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 3 }}>{f.hint}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Sistem Ayarları hub'ı = Sürüm + AI
export function SystemSettings() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <VersionSection />
      <AiSection />
    </div>
  );
}

// Uygulama Ayarları hub'ı = Mağaza başvuruları + Arama sözlüğü
export function AppSettings() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <StoresSection />
      <SearchSection />
    </div>
  );
}
