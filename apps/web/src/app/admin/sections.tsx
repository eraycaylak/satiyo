"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdminStats, Listing } from "@satiyo/shared";
import { api } from "@/lib/client";
import { formatPrice, timeAgo } from "@/lib/format";

// ---- shared helpers ----
export function initials(name?: string | null): string {
  const t = (name ?? "").trim();
  if (!t) return "?";
  const p = t.split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase() || t[0]!.toUpperCase();
}
const nf = new Intl.NumberFormat("tr-TR");
const n = (v: number | undefined | null) => nf.format(Math.max(0, Math.round(Number(v ?? 0))));

const TXN_LABEL: Record<string, string> = {
  signup_bonus: "Üyelik bonusu",
  referral_reward: "Davet ödülü",
  adjustment: "Manuel ayar",
};
const txnLabel = (t: string, amount: number) =>
  TXN_LABEL[t] ?? (amount < 0 ? "Harcama" : "Kredi");

const STATUS: Record<string, { t: string; c: string }> = {
  active: { t: "Aktif", c: "ok" },
  sold: { t: "Satıldı", c: "brand" },
  reserved: { t: "Rezerve", c: "warn" },
  removed: { t: "Kaldırıldı", c: "danger" },
  draft: { t: "Taslak", c: "" },
};

// =================== ÖZET ===================
export function Overview({ stats }: { stats?: AdminStats }) {
  const { data: wallets } = useQuery({ queryKey: ["admin-wallets"], queryFn: () => api.adminWallets() });
  const { data: ai } = useQuery({ queryKey: ["admin-ai"], queryFn: () => api.adminAiStatus() });

  if (!stats) return <KpiSkeleton />;
  const recent = wallets?.recent ?? [];
  const top = wallets?.top ?? [];

  const kpis: { lbl: string; ic: string; val: string; delta?: string; bar?: string }[] = [
    { lbl: "Kullanıcı", ic: "👥", val: n(stats.users.total), delta: `+${n(stats.users.new24h)} bugün`, bar: "var(--brand)" },
    { lbl: "Aktif (24s)", ic: "⚡", val: n(stats.users.active24h), delta: `7g: ${n(stats.users.active7d)}`, bar: "var(--success)" },
    { lbl: "İlan", ic: "🏷️", val: n(stats.listings.total), delta: `+${n(stats.listings.new24h)} bugün`, bar: "var(--accent)" },
    { lbl: "Aktif ilan", ic: "🟢", val: n(stats.listings.active), delta: `Satıldı: ${n(stats.listings.sold)}`, bar: "var(--success)" },
    { lbl: "Konuşma", ic: "💬", val: n(stats.engagement.conversations), delta: `${n(stats.engagement.messages)} mesaj`, bar: "var(--brand)" },
    { lbl: "Favori", ic: "❤️", val: n(stats.engagement.favorites), bar: "var(--danger)" },
    { lbl: "Gelir", ic: "💰", val: formatPrice(stats.revenue.totalKurus), delta: `${n(stats.revenue.payments)} ödeme`, bar: "var(--warning)" },
    { lbl: "Dağıtılan kredi", ic: "🎁", val: formatPrice(stats.wallet?.outstandingKurus ?? 0), delta: `${n(stats.wallet?.wallets)} cüzdan`, bar: "var(--accent)" },
    { lbl: "AI öneri", ic: "✨", val: n(stats.ai?.suggestionsTotal), delta: `bugün ${n(stats.ai?.suggestionsToday)}`, bar: "var(--brand)" },
    { lbl: "Takip", ic: "🔔", val: n(stats.engagementExtra?.follows), delta: `${n(stats.engagement.reviews)} değerlendirme`, bar: "var(--success)" },
  ];

  return (
    <>
      <div className="cc-kpis">
        {kpis.map((k) => (
          <div key={k.lbl} className="cc-kpi" style={{ ["--accent-bar" as string]: k.bar }}>
            <div className="lbl"><span>{k.ic}</span>{k.lbl}</div>
            <div className="val">{k.val}</div>
            {k.delta && <div className="delta up">{k.delta}</div>}
          </div>
        ))}
      </div>

      <div className="cc-grid2">
        <div className="cc-panel">
          <div className="cc-panel-h"><h2>Canlı Akış — Kredi Hareketleri</h2><span className="hint">son {recent.length}</span></div>
          {recent.length === 0 ? <div className="cc-empty">Henüz hareket yok.</div> : (
            <div className="cc-feed">
              {recent.slice(0, 14).map((r, i) => {
                const neg = r.amount < 0;
                return (
                  <div key={i} className="cc-feed-row">
                    <div className={`ico ${neg ? "neg" : "pos"}`}>{neg ? "↘" : "↗"}</div>
                    <div className="body">
                      <b>{r.name || "—"}</b>
                      <span>{txnLabel(r.type, r.amount)} · {timeAgo(r.createdAt)}</span>
                    </div>
                    <div className={`amt ${neg ? "neg" : "pos"}`}>{neg ? "−" : "+"}{formatPrice(Math.abs(r.amount))}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="cc-panel">
            <div className="cc-panel-h"><h2>AI Motoru</h2>
              <span className={`cc-tag ${ai?.health === "ok" ? "ok" : ai ? "danger" : ""}`}>{ai?.health === "ok" ? "çalışıyor" : ai?.health ?? "…"}</span>
            </div>
            <div className="cc-mini">
              <div><div className="k">Bu ay çağrı</div><div className="v">{n(ai?.monthCalls)}</div></div>
              <div><div className="k">Kullanıcı</div><div className="v">{n(ai?.monthUsers)}</div></div>
              <div><div className="k">Maliyet</div><div className="v">${(ai?.estimatedCostUsd ?? 0).toFixed(2)}</div></div>
            </div>
            <p className="cc-sub" style={{ marginTop: 10 }}>Anahtar: {ai?.keySource === "panel" ? "panel" : ai?.keySource === "secret" ? "secret" : "yok"} {ai?.keyMasked ? `· ${ai.keyMasked}` : ""}</p>
          </div>

          <div className="cc-panel">
            <div className="cc-panel-h"><h2>Moderasyon</h2>
              {stats.engagement.reportsOpen > 0
                ? <span className="cc-tag danger">{stats.engagement.reportsOpen} açık</span>
                : <span className="cc-tag ok">temiz</span>}
            </div>
            <p className="cc-sub" style={{ margin: 0 }}>Toplam {n(stats.engagement.reportsTotal)} şikayet · {n(stats.users.banned)} banlı kullanıcı · {n(stats.listings.removed)} kaldırılan ilan</p>
          </div>

          <div className="cc-panel">
            <div className="cc-panel-h"><h2>En Değerli Cüzdanlar</h2></div>
            {top.length === 0 ? <div className="cc-empty">—</div> : top.slice(0, 5).map((w, i) => (
              <div key={w.userId} className="cc-feed-row">
                <div className="ico">{i + 1}</div>
                <div className="body"><b>{w.name || "—"}</b><span>{w.phone}</span></div>
                <div className="amt pos">{formatPrice(w.balance)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function KpiSkeleton() {
  return (
    <div className="cc-kpis">
      {Array.from({ length: 10 }).map((_, i) => <div key={i} className="cc-sk" style={{ height: 74 }} />)}
    </div>
  );
}

// =================== KULLANICILAR ===================
export function UsersSection() {
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const { data: users, isLoading } = useQuery({ queryKey: ["admin-users", q], queryFn: () => api.adminUsers(q || undefined) });

  return (
    <div className="cc-panel">
      <div className="cc-panel-h">
        <h2>Kullanıcılar</h2>
        <input className="cc-input" style={{ maxWidth: 260 }} placeholder="İsim veya telefon ara" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {isLoading ? <SkList /> :
        !users || users.length === 0 ? <div className="cc-empty">Kullanıcı bulunamadı.</div> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {users.map((u) => (
              <button key={u.id} className="cc-urow" onClick={() => setOpenId(u.id)}>
                <div className="av">{initials(u.name)}</div>
                <div className="ubody">
                  <div className="uname">{u.name ?? "—"} {u.isAdmin && <span className="cc-tag brand">admin</span>} {u.isStore && <span className="cc-tag">mağaza</span>} {u.banned && <span className="cc-tag danger">banlı</span>}</div>
                  <div className="umeta">{u.phone} · {u.city ?? "konum yok"} · üyelik {timeAgo(u.createdAt)}</div>
                </div>
                <div className="ustat"><b>{n(u.listingCount)}</b>ilan</div>
              </button>
            ))}
          </div>
        )}
      {openId && <UserDetailSheet id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function UserDetailSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const { data: u, isLoading } = useQuery({ queryKey: ["admin-user", id], queryFn: () => api.adminUser(id) });

  async function grant() {
    const tl = Math.round(Number(amount));
    if (!tl || tl <= 0) return;
    setBusy(true);
    try {
      await api.adminGrantCredit(id, tl * 100, "admin panel");
      setAmount("");
      qc.invalidateQueries({ queryKey: ["admin-user", id] });
      qc.invalidateQueries({ queryKey: ["admin-wallets"] });
    } finally { setBusy(false); }
  }
  async function toggleBan() {
    if (!u) return;
    setBusy(true);
    try {
      if (u.banned) await api.adminUnbanUser(id); else await api.adminBanUser(id);
      qc.invalidateQueries({ queryKey: ["admin-user", id] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } finally { setBusy(false); }
  }

  return (
    <div className="cc-scrim" onClick={onClose}>
      <div className="cc-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="cc-sheet-h">
          <div className="row" style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div className="av" style={{ width: 42, height: 42, borderRadius: "50%", display: "grid", placeItems: "center", color: "#fff", fontWeight: 800, background: "linear-gradient(135deg,var(--brand),var(--brand-600))" }}>{initials(u?.name)}</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{u?.name ?? "Yükleniyor…"}</div>
              <div className="cc-sub" style={{ margin: 0 }}>{u?.phone}</div>
            </div>
          </div>
          <button className="cc-x" onClick={onClose}>✕</button>
        </div>

        {isLoading || !u ? <SkList /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {u.isAdmin && <span className="cc-tag brand">admin</span>}
              {u.isStore && <span className="cc-tag">mağaza{u.storeName ? `: ${u.storeName}` : ""}</span>}
              {u.phoneVerified && <span className="cc-tag ok">✓ doğrulanmış</span>}
              {u.banned && <span className="cc-tag danger">banlı</span>}
              <span className="cc-tag">güven {n(u.trustScore)}</span>
              {u.city && <span className="cc-tag">📍 {[u.district, u.city].filter(Boolean).join(", ")}</span>}
            </div>

            <div className="cc-mini">
              <div><div className="k">Bakiye</div><div className="v">{formatPrice(u.wallet.balance)}</div></div>
              <div><div className="k">İlan</div><div className="v">{n(u.listings.total)}</div></div>
              <div><div className="k">Aktif</div><div className="v">{n(u.listings.active)}</div></div>
              <div><div className="k">Takipçi</div><div className="v">{n(u.stats.followers)}</div></div>
              <div><div className="k">Konuşma</div><div className="v">{n(u.stats.conversations)}</div></div>
              <div><div className="k">Puan</div><div className="v">{u.stats.ratingAvg ? u.stats.ratingAvg.toFixed(1) : "—"}</div></div>
            </div>

            <div className="cc-panel" style={{ padding: 12 }}>
              <div className="cc-panel-h"><h2>Kredi Ver</h2></div>
              <div style={{ display: "flex", gap: 8 }}>
                <input className="cc-input" inputMode="numeric" placeholder="TL tutarı" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))} />
                <button className="cc-btn primary" disabled={busy || !amount} onClick={grant}>Ver</button>
              </div>
            </div>

            {u.wallet.history.length > 0 && (
              <div>
                <div className="cc-panel-h"><h2>Cüzdan Geçmişi</h2></div>
                <div className="cc-feed">
                  {u.wallet.history.slice(0, 8).map((h, i) => {
                    const neg = h.amount < 0;
                    return (
                      <div key={i} className="cc-feed-row">
                        <div className={`ico ${neg ? "neg" : "pos"}`}>{neg ? "↘" : "↗"}</div>
                        <div className="body"><b>{txnLabel(h.type, h.amount)}</b><span>{timeAgo(h.createdAt)}</span></div>
                        <div className={`amt ${neg ? "neg" : "pos"}`}>{neg ? "−" : "+"}{formatPrice(Math.abs(h.amount))}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button className={`cc-btn ${u.banned ? "" : "danger"}`} disabled={busy} onClick={toggleBan}>{u.banned ? "Ban Kaldır" : "Kullanıcıyı Banla"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// =================== İLANLAR ===================
export function ListingsSection() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Listing | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ["admin-listings", status, q], queryFn: () => api.adminListings(status || undefined, q || undefined) });
  const items = data?.items ?? [];

  async function remove(lid: string) {
    await api.adminRemoveListing(lid);
    qc.invalidateQueries({ queryKey: ["admin-listings"] });
  }

  return (
    <div className="cc-panel">
      <div className="cc-panel-h" style={{ flexWrap: "wrap", gap: 8 }}>
        <h2>İlanlar — kim ne koymuş</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div className="cc-seg">
            {([["", "Hepsi"], ["active", "Aktif"], ["sold", "Satıldı"], ["removed", "Kaldırıldı"]] as const).map(([v, l]) => (
              <button key={v} className={status === v ? "on" : ""} onClick={() => setStatus(v)}>{l}</button>
            ))}
          </div>
          <input className="cc-input" style={{ maxWidth: 200 }} placeholder="Başlık ara" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      {isLoading ? <SkGrid /> :
        items.length === 0 ? <div className="cc-empty">İlan bulunamadı.</div> : (
          <div className="cc-cards">
            {items.map((l) => {
              const st = STATUS[l.status] ?? { t: l.status, c: "" };
              const img = l.images?.[0]?.url;
              return (
                <div key={l.id} className="cc-card">
                  <a className="thumb" href={`/ilan/${l.id}`} target="_blank" rel="noopener noreferrer">
                    {img ? <img src={img} alt={l.title} /> : null}
                    <span className={`cc-tag ${st.c} st`}>{st.t}</span>
                  </a>
                  <div className="cbody">
                    <div className="ctitle">{l.title}</div>
                    <div className="cprice">{formatPrice(l.price, l.priceType)}</div>
                    <div className="cmeta">
                      <span>{l.seller?.name ?? "—"}</span>
                      <span>{timeAgo(l.createdAt)}</span>
                    </div>
                    <div className="cmeta">
                      <span>{[l.district, l.city].filter(Boolean).join(", ") || "konum yok"} · 👁 {n(l.viewCount)}</span>
                      <span style={{ display: "flex", gap: 6 }}>
                        <button className="cc-tag" style={{ border: 0, cursor: "pointer" }} onClick={() => setEdit(l)}>düzenle</button>
                        {l.status !== "removed" && <button className="cc-tag danger" style={{ border: 0, cursor: "pointer" }} onClick={() => remove(l.id)}>kaldır</button>}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      {edit && <ListingEditSheet listing={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

function ListingEditSheet({ listing, onClose }: { listing: Listing; onClose: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(listing.title);
  const [priceTl, setPriceTl] = useState(String(Math.round(listing.price / 100)));
  const [status, setStatus] = useState(listing.status);
  const [views, setViews] = useState(String(listing.viewCount));
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await api.adminUpdateListing(listing.id, {
        title: title.trim(),
        price: Math.max(0, Math.round(Number(priceTl) || 0)) * 100,
        status,
        viewCount: Math.max(0, Math.round(Number(views) || 0)),
      });
      qc.invalidateQueries({ queryKey: ["admin-listings"] });
      onClose();
    } finally { setBusy(false); }
  }

  return (
    <div className="cc-scrim" onClick={onClose}>
      <div className="cc-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="cc-sheet-h">
          <div style={{ fontWeight: 800, fontSize: 16 }}>İlanı Düzenle</div>
          <button className="cc-x" onClick={onClose}>✕</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label className="cc-sub" style={{ margin: 0 }}>Başlık
            <input className="cc-input" style={{ marginTop: 4 }} value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <div style={{ display: "flex", gap: 10 }}>
            <label className="cc-sub" style={{ margin: 0, flex: 1 }}>Fiyat (TL)
              <input className="cc-input" style={{ marginTop: 4 }} inputMode="numeric" value={priceTl} onChange={(e) => setPriceTl(e.target.value.replace(/[^0-9]/g, ""))} />
            </label>
            <label className="cc-sub" style={{ margin: 0, flex: 1 }}>Görüntüleme
              <input className="cc-input" style={{ marginTop: 4 }} inputMode="numeric" value={views} onChange={(e) => setViews(e.target.value.replace(/[^0-9]/g, ""))} />
            </label>
          </div>
          <label className="cc-sub" style={{ margin: 0 }}>Durum
            <select className="cc-input" style={{ marginTop: 4 }} value={status} onChange={(e) => setStatus(e.target.value as Listing["status"])}>
              {(["active", "sold", "reserved", "removed", "draft"] as const).map((s) => (
                <option key={s} value={s}>{STATUS[s]?.t ?? s}</option>
              ))}
            </select>
          </label>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="cc-btn" onClick={onClose}>Vazgeç</button>
            <button className="cc-btn primary" disabled={busy || !title.trim()} onClick={save}>{busy ? "Kaydediliyor…" : "Kaydet"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =================== CÜZDANLAR ===================
export function WalletsSection() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-wallets"], queryFn: () => api.adminWallets() });
  const top = data?.top ?? [];
  const recent = data?.recent ?? [];
  if (isLoading) return <div className="cc-panel"><SkList /></div>;
  return (
    <div className="cc-grid2">
      <div className="cc-panel">
        <div className="cc-panel-h"><h2>En Değerli Cüzdanlar</h2><span className="hint">{top.length}</span></div>
        {top.length === 0 ? <div className="cc-empty">Bakiyeli cüzdan yok.</div> : top.map((w, i) => (
          <div key={w.userId} className="cc-feed-row">
            <div className="ico">{i + 1}</div>
            <div className="body"><b>{w.name || "—"}</b><span>{w.phone}</span></div>
            <div className="amt pos">{formatPrice(w.balance)}</div>
          </div>
        ))}
      </div>
      <div className="cc-panel">
        <div className="cc-panel-h"><h2>Son Hareketler</h2><span className="hint">{recent.length}</span></div>
        {recent.length === 0 ? <div className="cc-empty">Hareket yok.</div> : recent.slice(0, 20).map((r, i) => {
          const neg = r.amount < 0;
          return (
            <div key={i} className="cc-feed-row">
              <div className={`ico ${neg ? "neg" : "pos"}`}>{neg ? "↘" : "↗"}</div>
              <div className="body"><b>{r.name || "—"}</b><span>{txnLabel(r.type, r.amount)} · {timeAgo(r.createdAt)}</span></div>
              <div className={`amt ${neg ? "neg" : "pos"}`}>{neg ? "−" : "+"}{formatPrice(Math.abs(r.amount))}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =================== MODERASYON ===================
export function ModerationSection() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"reports" | "ai">("reports");
  const [reportStatus, setReportStatus] = useState<"open" | "resolved">("open");
  const { data: reports, isLoading } = useQuery({ queryKey: ["admin-reports", reportStatus], queryFn: () => api.adminReports(reportStatus), enabled: tab === "reports" });
  const { data: aiData, isLoading: aiLoading } = useQuery({ queryKey: ["admin-moderation-queue"], queryFn: () => api.adminModerationQueue(), enabled: tab === "ai" });

  async function resolve(rid: string, targetType: string, targetId: string, remove: boolean) {
    if (remove && targetType === "listing") await api.adminRemoveListing(targetId);
    if (remove && targetType === "user") await api.adminBanUser(targetId);
    await api.adminResolveReport(rid);
    qc.invalidateQueries({ queryKey: ["admin-reports"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
  }
  async function removeListing(lid: string) { await api.adminRemoveListing(lid); qc.invalidateQueries({ queryKey: ["admin-moderation-queue"] }); }
  async function clearRisk(lid: string) { await api.adminClearRisk(lid); qc.invalidateQueries({ queryKey: ["admin-moderation-queue"] }); }

  const aiItems = aiData?.items ?? [];

  return (
    <div className="cc-panel">
      <div className="cc-panel-h" style={{ flexWrap: "wrap", gap: 8 }}>
        <h2>Moderasyon</h2>
        <div className="cc-seg">
          <button className={tab === "reports" ? "on" : ""} onClick={() => setTab("reports")}>Şikayetler</button>
          <button className={tab === "ai" ? "on" : ""} onClick={() => setTab("ai")}>🤖 AI Riskli İlanlar</button>
        </div>
      </div>

      {tab === "reports" ? (
        <>
          <div className="cc-seg" style={{ marginBottom: 12 }}>
            <button className={reportStatus === "open" ? "on" : ""} onClick={() => setReportStatus("open")}>Açık</button>
            <button className={reportStatus === "resolved" ? "on" : ""} onClick={() => setReportStatus("resolved")}>Çözülenler</button>
          </div>
          {isLoading ? <SkList /> :
            !reports || reports.length === 0 ? <div className="cc-empty">{reportStatus === "open" ? "Açık şikayet yok 🎉" : "Çözülmüş şikayet yok."}</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {reports.map((r) => (
                  <div key={r.id} className="cc-panel" style={{ padding: 12 }}>
                    <div className="cc-panel-h" style={{ marginBottom: 8 }}>
                      <span className="cc-tag">{r.targetType}</span>
                      <span className="hint">{timeAgo(r.createdAt)}</span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{r.reason}</div>
                    <div className="cc-sub" style={{ margin: "3px 0 10px" }}>Bildiren: {r.reporterName} · Hedef: {r.targetId}</div>
                    {reportStatus === "open" ? (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button className="cc-btn" onClick={() => resolve(r.id, r.targetType, r.targetId, false)}>Çözüldü işaretle</button>
                        {r.targetType === "listing" && <button className="cc-btn danger" onClick={() => resolve(r.id, r.targetType, r.targetId, true)}>İlanı kaldır + çöz</button>}
                        {r.targetType === "user" && <button className="cc-btn danger" onClick={() => resolve(r.id, r.targetType, r.targetId, true)}>Kullanıcıyı banla + çöz</button>}
                      </div>
                    ) : (
                      <span className="cc-tag" style={{ opacity: 0.75 }}>✓ Çözüldü</span>
                    )}
                  </div>
                ))}
              </div>
            )}
        </>
      ) : (
        aiLoading ? <SkList /> :
          aiItems.length === 0 ? <div className="cc-empty">AI riskli ilan işaretlemedi 🎉<br /><span className="cc-sub">Yeni ilanlar oluşturuldukça Gemini otomatik tarar.</span></div> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {aiItems.map((l) => {
                const score = l.riskScore ?? 0;
                const cls = score >= 80 ? "danger" : score >= 60 ? "warn" : "";
                return (
                  <div key={l.id} className="cc-panel" style={{ padding: 12, display: "flex", gap: 12 }}>
                    <a href={`/ilan/${l.id}`} target="_blank" rel="noopener noreferrer" style={{ width: 60, height: 60, borderRadius: 10, overflow: "hidden", background: "var(--surface-2)", flexShrink: 0 }}>
                      {l.images?.[0]?.url ? <img src={l.images[0].url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
                    </a>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span className={`cc-tag ${cls}`}>risk {score}</span>
                        {l.riskCategory && l.riskCategory !== "temiz" && <span className="cc-tag">{l.riskCategory}</span>}
                        <strong style={{ fontSize: 13.5 }}>{l.title}</strong>
                      </div>
                      <div className="cc-sub" style={{ margin: "3px 0" }}>{formatPrice(l.price, l.priceType)} · {l.seller?.name ?? "—"} · {timeAgo(l.createdAt)}</div>
                      {l.riskReasons && l.riskReasons.length > 0 && <div className="cc-sub" style={{ margin: 0, color: "var(--danger)" }}>⚠ {l.riskReasons.join(" · ")}</div>}
                      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                        <button className="cc-btn danger" onClick={() => removeListing(l.id)}>İlanı Kaldır</button>
                        <button className="cc-btn" onClick={() => clearRisk(l.id)}>Temiz (yanlış alarm)</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
      )}
    </div>
  );
}

// =================== ARAMA (SYNONYM) ===================
export function SearchSection() {
  const qc = useQueryClient();
  const [term, setTerm] = useState("");
  const [aliases, setAliases] = useState("");
  const { data: synonyms } = useQuery({ queryKey: ["admin-synonyms"], queryFn: () => api.adminSynonyms() });

  async function add() {
    if (!term.trim() || !aliases.trim()) return;
    await api.adminAddSynonym(term.trim(), aliases.split(",").map((s) => s.trim()).filter(Boolean));
    setTerm(""); setAliases("");
    qc.invalidateQueries({ queryKey: ["admin-synonyms"] });
  }

  return (
    <div className="cc-panel">
      <div className="cc-panel-h"><h2>Arama Sözlüğü (Synonym)</h2></div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <input className="cc-input" style={{ maxWidth: 200 }} placeholder="Terim (ör. telefon)" value={term} onChange={(e) => setTerm(e.target.value)} />
        <input className="cc-input" style={{ flex: 1, minWidth: 200 }} placeholder="Eşler, virgülle (cep, smartphone, ayfon)" value={aliases} onChange={(e) => setAliases(e.target.value)} />
        <button className="cc-btn primary" onClick={add}>Ekle</button>
      </div>
      {!synonyms || synonyms.length === 0 ? <p className="cc-sub">Henüz özel synonym yok (koddaki varsayılanlar geçerli).</p> :
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {synonyms.map((s) => (
            <div key={s.id} className="cc-feed-row">
              <div className="body"><b>{s.term}</b><span>→ {s.aliases.join(", ")}</span></div>
              <button className="cc-tag danger" style={{ border: 0, cursor: "pointer" }} onClick={async () => { await api.adminDeleteSynonym(s.id); qc.invalidateQueries({ queryKey: ["admin-synonyms"] }); }}>sil</button>
            </div>
          ))}
        </div>}
    </div>
  );
}

// =================== AI ===================
export function AiSection() {
  const qc = useQueryClient();
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const { data: ai, isLoading } = useQuery({ queryKey: ["admin-ai"], queryFn: () => api.adminAiStatus() });

  async function save() {
    if (!key.trim()) return;
    setBusy(true); setMsg(null);
    try {
      const r = await api.adminSetGeminiKey(key.trim());
      setMsg(`Kaydedildi ✓ (${r.keyMasked})`);
      setKey("");
      qc.invalidateQueries({ queryKey: ["admin-ai"] });
    } catch (e) {
      setMsg((e as Error).message || "Anahtar kaydedilemedi");
    } finally { setBusy(false); }
  }

  return (
    <div className="cc-grid2">
      <div className="cc-panel">
        <div className="cc-panel-h"><h2>AI Motoru (Gemini Vision)</h2>
          <span className={`cc-tag ${ai?.health === "ok" ? "ok" : ai ? "danger" : ""}`}>{ai?.health ?? (isLoading ? "…" : "?")}</span>
        </div>
        <div className="cc-mini">
          <div><div className="k">Bu ay çağrı</div><div className="v">{n(ai?.monthCalls)}</div></div>
          <div><div className="k">Kullanıcı</div><div className="v">{n(ai?.monthUsers)}</div></div>
          <div><div className="k">Maliyet</div><div className="v">${(ai?.estimatedCostUsd ?? 0).toFixed(2)}</div></div>
          <div><div className="k">Günlük limit</div><div className="v">{n(ai?.dailyLimitPerUser)}</div></div>
          <div><div className="k">Anahtar</div><div className="v" style={{ fontSize: 13 }}>{ai?.keySource ?? "—"}</div></div>
          <div><div className="k">Maskeli</div><div className="v" style={{ fontSize: 12 }}>{ai?.keyMasked ?? "—"}</div></div>
        </div>
        {ai?.note && <p className="cc-sub" style={{ marginTop: 10 }}>{ai.note}</p>}
      </div>

      <div className="cc-panel">
        <div className="cc-panel-h"><h2>Gemini Anahtarı Değiştir</h2></div>
        <p className="cc-sub" style={{ marginTop: 0 }}>Yeni anahtar önce test edilir, geçerliyse kaydedilir. Uygulama güncellemesi gerekmez.</p>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <input className="cc-input" type="password" autoComplete="off" placeholder="Yeni Gemini API anahtarı" value={key} onChange={(e) => setKey(e.target.value)} />
          <button className="cc-btn primary" disabled={busy || !key} onClick={save}>{busy ? "Test…" : "Kaydet"}</button>
        </div>
        {msg && <p className="cc-sub" style={{ marginTop: 10, color: msg.includes("✓") ? "var(--success)" : "var(--danger)" }}>{msg}</p>}
      </div>
    </div>
  );
}

// ---- skeletons ----
function SkList() {
  return <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>{Array.from({ length: 6 }).map((_, i) => <div key={i} className="cc-sk" style={{ height: 56 }} />)}</div>;
}
function SkGrid() {
  return <div className="cc-cards">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="cc-sk" style={{ height: 210 }} />)}</div>;
}
