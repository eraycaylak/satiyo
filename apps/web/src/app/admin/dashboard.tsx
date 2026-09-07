"use client";
import { useQuery } from "@tanstack/react-query";
import { CATEGORIES, getCategory, type AdminStats } from "@satiyo/shared";
import { api } from "@/lib/client";
import { timeAgo } from "@/lib/format";
import { Icon } from "./icons";
import { AreaChart, Donut, DonutLegend, HBars } from "./charts";

const APP_VERSION = "v1.1.0";
const nf = (v?: number) => new Intl.NumberFormat("tr-TR").format(Math.max(0, Math.round(Number(v ?? 0))));
const moneyInt = (kurus?: number) => "₺" + new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(Math.round((kurus ?? 0) / 100));
const money2 = (kurus?: number) => "₺" + new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format((kurus ?? 0) / 100);

function catPath(categoryId: string): string {
  const c = getCategory(categoryId);
  if (!c) return categoryId;
  const parent = c.parentId ? getCategory(c.parentId) : undefined;
  return parent ? `${parent.name} › ${c.name}` : c.name;
}
function dayLabel(iso: string): string {
  const [, m, d] = iso.split("-");
  const months = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
  return `${Number(d)} ${months[Number(m) - 1] ?? ""}`;
}
function dateTime(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const KPI_TINT: Record<string, { fg: string; bg: string }> = {
  red: { fg: "#f0434c", bg: "#fff1f2" },
  green: { fg: "#16a34a", bg: "#e8f7ee" },
  blue: { fg: "#3b82f6", bg: "#eff6ff" },
  orange: { fg: "#f97316", bg: "#fff3e8" },
  purple: { fg: "#8b5cf6", bg: "#f3f0ff" },
};

export function Dashboard({ stats, onNav }: { stats?: AdminStats; onNav: (t: string) => void }) {
  const { data: ov } = useQuery({ queryKey: ["admin-overview"], queryFn: () => api.adminOverview() });
  const { data: listingsData } = useQuery({ queryKey: ["admin-listings", "", ""], queryFn: () => api.adminListings() });
  const today = new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });

  if (!stats) return <div className="ad-ph">Yükleniyor…</div>;
  const L = stats.listings, U = stats.users, E = stats.engagement;
  const pasif = Math.max(0, L.total - L.active - L.sold - L.reserved - L.removed);

  const kpis = [
    { lbl: "Kullanıcılar", val: nf(U.total), sub: "Toplam kullanıcı", delta: U.new24h, icon: "user", tint: "red" },
    { lbl: "İlanlar", val: nf(L.total), sub: "Toplam ilan", delta: L.new24h, icon: "file", tint: "green" },
    { lbl: "Aktif İlanlar", val: nf(L.active), sub: "Aktif ilan", delta: null, icon: "eye", tint: "blue" },
    { lbl: "Satılanlar", val: nf(L.sold), sub: "Bugün satılan", delta: null, icon: "bag", tint: "orange" },
    { lbl: "Favoriler", val: nf(E.favorites), sub: "Toplam favori", delta: null, icon: "heart", tint: "purple" },
    { lbl: "Toplam Gelir", val: money2(stats.revenue.totalKurus), sub: "Toplam kazanç", delta: null, icon: "dollar", tint: "green" },
  ];

  const statusSegs = [
    { value: L.active, color: "#16a34a", label: "Aktif" },
    { value: pasif, color: "#3b82f6", label: "Pasif" },
    { value: L.sold, color: "#8b5cf6", label: "Satıldı" },
    { value: L.reserved, color: "#f97316", label: "Rezerve" },
    { value: L.removed, color: "#94a3b8", label: "Kaldırıldı" },
  ];
  const statusTotal = statusSegs.reduce((a, s) => a + s.value, 0) || 1;

  const userSegs = [
    { value: U.active24h, color: "#3b82f6", label: "Aktif (24s)" },
    { value: U.active7d, color: "#16a34a", label: "Aktif (7g)" },
    { value: U.new24h, color: "#8b5cf6", label: "Yeni (24s)" },
    { value: U.new7d, color: "#f97316", label: "Yeni (7g)" },
    { value: U.admins, color: "#14b8a6", label: "Admin" },
  ];
  const userSegTotal = userSegs.reduce((a, s) => a + s.value, 0) || 1;

  const feedMeta: Record<string, { icon: string; fg: string; bg: string }> = {
    user: { icon: "userplus", fg: "#3b82f6", bg: "#eff6ff" },
    listing: { icon: "file", fg: "#16a34a", bg: "#e8f7ee" },
    report: { icon: "alert", fg: "#f0434c", bg: "#fff1f2" },
  };

  const recent = (listingsData?.items ?? []).slice(0, 5);

  return (
    <>
      <div className="ad-welcome">
        <div>
          <h1>Hoş geldin, Eray Çaylak! 👋</h1>
          <p>Satıyo paneline hoş geldiniz. Bugün neler olmuş bir göz atalım.</p>
        </div>
        <div className="ad-datepick"><Icon name="calendar" size={16} /> {today} <Icon name="chevron" size={14} /></div>
      </div>

      {/* KPI */}
      <div className="ad-kpis">
        {kpis.map((k) => {
          const t = KPI_TINT[k.tint]!;
          return (
            <div key={k.lbl} className="ad-kpi">
              <div className="ad-kpi-top">
                <div className="k-lbl">{k.lbl}</div>
                <div className="k-ico" style={{ background: t.bg, color: t.fg }}><Icon name={k.icon} size={20} /></div>
              </div>
              <div className="k-val">{k.val}</div>
              <div className="k-sub">{k.sub}</div>
              {k.delta != null && k.delta > 0
                ? <div className="k-delta up">↑ {nf(k.delta)} bugün</div>
                : <div className="k-delta">— değişim yok</div>}
            </div>
          );
        })}
      </div>

      {/* satır: performans + durum + aktivite */}
      <div className="ad-row3">
        <div className="ad-panel">
          <div className="ad-panel-h">
            <div><h3 className="t">İlan Performansı</h3><p className="s">Son 7 gün</p></div>
            <div className="ad-sel">7 Gün <Icon name="chevron" size={13} /></div>
          </div>
          <AreaChart
            data={(ov?.listingsDaily ?? []).map((d) => d.count)}
            labels={(ov?.listingsDaily ?? []).map((d) => dayLabel(d.day))}
          />
        </div>

        <div className="ad-panel">
          <div className="ad-panel-h"><div><h3 className="t">İlan Durum Dağılımı</h3><p className="s">Toplam {nf(L.total)} ilan</p></div></div>
          <div className="ad-donutbox">
            <Donut segments={statusSegs} center={nf(L.total)} centerSub="Toplam" />
            <DonutLegend items={statusSegs.map((s) => ({ label: s.label, value: s.value, color: s.color, pct: Math.round((s.value / statusTotal) * 100) }))} />
          </div>
        </div>

        <div className="ad-panel">
          <div className="ad-panel-h"><div><h3 className="t">Son Aktiviteler</h3></div></div>
          <div className="ad-feed">
            {(ov?.recentActivity ?? []).slice(0, 5).map((a, i) => {
              const m = feedMeta[a.type] ?? feedMeta.listing!;
              return (
                <div key={i} className="ad-feed-row">
                  <div className="fi" style={{ background: m.bg, color: m.fg }}><Icon name={m.icon} size={17} /></div>
                  <div className="fb"><b>{a.title}</b><span>{a.subtitle}</span></div>
                  <div className="ft">{timeAgo(a.at)}</div>
                </div>
              );
            })}
            {(!ov || ov.recentActivity.length === 0) && <div className="ad-ph" style={{ padding: 24 }}>Aktivite yok</div>}
          </div>
          <button className="ad-linkbtn" onClick={() => onNav("users")}>Tüm aktiviteleri görüntüle →</button>
        </div>
      </div>

      {/* satır: kullanıcı dağılımı + kategoriler + hızlı işlemler + sistem özeti */}
      <div className="ad-row3b">
        <div className="ad-panel">
          <div className="ad-panel-h"><div><h3 className="t">Kullanıcı Dağılımı</h3><p className="s">Toplam {nf(U.total)} kullanıcı</p></div></div>
          <div className="ad-donutbox">
            <Donut segments={userSegs} center={nf(U.total)} centerSub="kullanıcı" size={150} thickness={20} />
            <DonutLegend items={userSegs.map((s) => ({ label: s.label, value: s.value, color: s.color, pct: Math.round((s.value / userSegTotal) * 100) }))} />
          </div>
        </div>

        <div className="ad-panel">
          <div className="ad-panel-h"><div><h3 className="t">Popüler Kategoriler</h3><p className="s">Son 7 güne göre</p></div></div>
          {ov && ov.categoryBreakdown.length > 0
            ? <HBars items={ov.categoryBreakdown.map((c) => ({ label: c.name, value: c.count, icon: c.icon }))} />
            : <div className="ad-ph" style={{ padding: 24 }}>Veri yok</div>}
        </div>

        <div className="ad-panel">
          <div className="ad-panel-h"><div><h3 className="t">Hızlı İşlemler</h3></div></div>
          <div className="ad-qa">
            <button className="ad-qa-tile" style={{ background: "#fff1f2", color: "#f0434c" }} onClick={() => window.open("/ilan-ver", "_blank")}><Icon name="plus" size={22} /> Yeni İlan Ekle</button>
            <button className="ad-qa-tile" style={{ background: "#eff6ff", color: "#3b82f6" }} onClick={() => onNav("users")}><Icon name="userplus" size={22} /> Kullanıcı Ekle</button>
            <button className="ad-qa-tile" style={{ background: "#e8f7ee", color: "#16a34a" }} onClick={() => onNav("categories")}><Icon name="folderplus" size={22} /> Kategori Ekle</button>
            <button className="ad-qa-tile" style={{ background: "#fff3e8", color: "#f97316" }} onClick={() => onNav("featured")}><Icon name="star" size={22} /> Öne Çıkan Ekle</button>
          </div>
        </div>

        <div className="ad-panel">
          <div className="ad-panel-h"><div><h3 className="t">Sistem Özeti</h3></div></div>
          <div className="ad-sum">
            {[
              { ic: "file", l: "Toplam İlan", v: nf(L.total) },
              { ic: "users", l: "Toplam Kullanıcı", v: nf(U.total) },
              { ic: "grid", l: "Toplam Kategori", v: nf(CATEGORIES.length) },
              { ic: "mail", l: "Toplam Mesaj", v: nf(E.messages) },
              { ic: "alert", l: "Toplam Şikayet", v: nf(E.reportsTotal) },
              { ic: "refresh", l: "Sistem Versiyonu", v: APP_VERSION },
            ].map((r) => (
              <div key={r.l} className="ad-sum-row">
                <span className="si"><Icon name={r.ic} size={15} /></span>
                <span className="sl">{r.l}</span>
                <span className="sv">{r.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Son eklenen ilanlar */}
      <div className="ad-panel">
        <div className="ad-panel-h">
          <div><h3 className="t">Son Eklenen İlanlar</h3></div>
          <button className="ad-linkbtn" style={{ width: "auto", marginTop: 0, padding: "7px 12px" }} onClick={() => onNav("listings")}>Tüm ilanları görüntüle →</button>
        </div>
        <div className="ad-tablewrap">
          <table className="ad-table">
            <thead>
              <tr><th>İlan Başlığı</th><th>Kategori</th><th>Fiyat</th><th>Durum</th><th>Eklenme Tarihi</th><th>İşlemler</th></tr>
            </thead>
            <tbody>
              {recent.map((l) => (
                <tr key={l.id}>
                  <td>
                    <div className="ad-tl">
                      {l.images?.[0]?.url ? <img className="th" src={l.images[0].url.replace("/media/", "/media/thumb/200/")} loading="lazy" alt="" /> : <span className="th" />}
                      <b>{l.title}</b>
                    </div>
                  </td>
                  <td>{catPath(l.categoryId)}</td>
                  <td className="ad-price">{moneyInt(l.price)}</td>
                  <td><span className={`ad-st ${l.status}`}>{statusText(l.status)}</span></td>
                  <td style={{ color: "var(--text-muted)" }}>{dateTime(l.createdAt)}</td>
                  <td>
                    <div className="ad-rowacts">
                      <a href={`/ilan/${l.id}`} target="_blank" rel="noopener noreferrer"><button><Icon name="eye" size={15} /></button></a>
                      <button onClick={() => onNav("listings")}><Icon name="dots" size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {recent.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)", padding: 30 }}>İlan yok</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function statusText(s: string): string {
  return { active: "Aktif", sold: "Satıldı", reserved: "Rezerve", removed: "Kaldırıldı", draft: "Taslak" }[s] ?? s;
}

/** Kategoriler sekmesi — mevcut taksonomiyi grid'de gösterir. */
export function CategoriesSection() {
  return (
    <div className="ad-panel">
      <div className="ad-panel-h"><div><h3 className="t">Kategoriler</h3><p className="s">{CATEGORIES.length} kategori</p></div></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px,1fr))", gap: 12 }}>
        {CATEGORIES.map((c) => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)" }}>
            <span style={{ fontSize: 22 }}>{c.icon}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{c.parentId ? "alt kategori" : "ana kategori"}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Placeholder({ title }: { title: string }) {
  return (
    <div className="ad-panel">
      <div className="ad-ph">
        <div className="big">🚧</div>
        <h3>{title}</h3>
        <p>Bu bölüm yakında burada olacak.</p>
      </div>
    </div>
  );
}
