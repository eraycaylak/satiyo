"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/client";
import { useAuth } from "@/lib/auth";
import {
  UsersSection, ListingsSection, WalletsSection,
  ModerationSection, initials,
} from "./sections";
import { SystemSettings, AppSettings } from "./admin-settings";
import { FeaturedSection, MessagesSection, OtherPagesSection, BroadcastSection } from "./admin-extra";
import { Dashboard, CategoriesSection, Placeholder } from "./dashboard";
import { Icon } from "./icons";
import "./admin.css";
import "./admin-dash.css";

type Tab =
  | "overview" | "users" | "listings" | "categories" | "orders"
  | "featured" | "reports" | "messages" | "moderation" | "system" | "appsettings" | "broadcast" | "other";

const NAV: { k: Tab; ic: string; label: string; badge?: "red" | "green" }[] = [
  { k: "overview", ic: "home", label: "Özet" },
  { k: "users", ic: "users", label: "Kullanıcılar" },
  { k: "listings", ic: "tag", label: "İlanlar" },
  { k: "categories", ic: "grid", label: "Kategoriler" },
  { k: "orders", ic: "cart", label: "Siparişler" },
  { k: "featured", ic: "star", label: "Öne Çıkanlar" },
  { k: "reports", ic: "barchart", label: "Raporlar" },
  { k: "messages", ic: "chat", label: "Mesajlar", badge: "green" },
  { k: "moderation", ic: "alert", label: "Şikayetler", badge: "red" },
  { k: "system", ic: "settings", label: "Sistem Ayarları" },
  { k: "appsettings", ic: "sliders", label: "Uygulama Ayarları" },
  { k: "broadcast", ic: "chat", label: "Duyuru Gönder" },
  { k: "other", ic: "layers", label: "Diğer Sayfalar" },
];

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/giris?next=/admin");
    if (!loading && user && !user.isAdmin) router.replace("/");
  }, [user, loading, router]);
  useEffect(() => { setDark(document.documentElement.getAttribute("data-theme") === "dark"); }, []);

  const { data: stats } = useQuery({ queryKey: ["admin-stats"], queryFn: () => api.adminStats(), enabled: !!user?.isAdmin });

  function toggleTheme() {
    const next = dark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("satiyo_theme", next); } catch { /* yoksay */ }
    setDark(!dark);
  }
  function go(k: Tab) { setTab(k); setOpen(false); }

  if (loading || !user?.isAdmin) return <div style={{ padding: 80, textAlign: "center", color: "var(--text-muted)" }}>Yükleniyor…</div>;

  const reportsOpen = stats?.engagement.reportsOpen ?? 0;
  const badgeVal = (k: Tab) => (k === "moderation" ? reportsOpen : k === "messages" ? (stats?.engagement.conversations ?? 0) : 0);

  return (
    <div className={`ad ${open ? "open" : ""}`}>
      <div className="ad-backdrop" onClick={() => setOpen(false)} />

      {/* Sidebar */}
      <aside className="ad-side">
        <div className="ad-brand">Satıyo</div>
        <nav className="ad-nav">
          {NAV.map((it) => {
            const bv = badgeVal(it.k);
            return (
              <button key={it.k} className={`ad-navitem ${tab === it.k ? "on" : ""}`} onClick={() => go(it.k)}>
                <span className="ic"><Icon name={it.ic} size={19} /></span>
                <span className="txt">{it.label}</span>
                {it.badge && bv > 0 && <span className={`badge ${it.badge}`}>{bv > 99 ? "99+" : bv}</span>}
              </button>
            );
          })}
        </nav>
        <div className="ad-promo">
          <h4>Satıyo</h4>
          <p>Premium deneyim için mobil uygulamamızı deneyin.</p>
          <div className="ad-store">
            <a className="ad-storebtn" href="https://apps.apple.com/app/id6786818121" target="_blank" rel="noopener noreferrer">
              <Icon name="apple" size={18} fill /><span><span className="sm">App Store'dan</span><br /><span className="big">İndir</span></span>
            </a>
            <div className="ad-storebtn" style={{ opacity: 0.85 }}>
              <Icon name="play" size={16} fill /><span><span className="sm">Google Play</span><br /><span className="big">Yakında</span></span>
            </div>
          </div>
        </div>
        <div className="ad-foot">© 2026 Satıyo<br />Tüm hakları saklıdır.</div>
      </aside>

      {/* Main */}
      <div className="ad-main">
        <header className="ad-top">
          <button className="ad-burger" onClick={() => setOpen(true)}><Icon name="menu" size={17} /></button>
          <div className="ad-search">
            <Icon name="search" size={17} />
            <input placeholder="Ne arıyorsun? (ör. iPhone, koltuk, bisiklet)" aria-label="Ara" />
            <span className="kbd">⌘K</span>
          </div>
          <div className="ad-topright">
            <span className="ad-pill">TR</span>
            <button className="ad-icobtn" onClick={toggleTheme} aria-label="Tema"><Icon name={dark ? "sun" : "moon"} size={18} /></button>
            <button className="ad-icobtn" aria-label="Favoriler"><Icon name="heart" size={18} /></button>
            <button className="ad-icobtn" aria-label="Bildirimler"><Icon name="bell" size={18} />{reportsOpen > 0 && <span className="dot">{reportsOpen > 99 ? "99+" : reportsOpen}</span>}</button>
            <div className="ad-user">
              <span className="av">{initials(user.name)}</span>
              <span className="who"><b>{user.name ?? "Admin"}</b><span>Administrator</span></span>
              <Icon name="chevron" size={15} />
            </div>
          </div>
        </header>

        <div className="ad-content">
          {tab === "overview" && <Dashboard stats={stats} onNav={(t) => go(t as Tab)} />}
          {tab === "users" && <UsersSection />}
          {tab === "listings" && <ListingsSection />}
          {tab === "categories" && <CategoriesSection />}
          {tab === "reports" && <WalletsSection />}
          {tab === "moderation" && <ModerationSection />}
          {tab === "system" && <SystemSettings />}
          {tab === "appsettings" && <AppSettings />}
          {tab === "orders" && <Placeholder title="Siparişler" />}
          {tab === "featured" && <FeaturedSection />}
          {tab === "messages" && <MessagesSection />}
          {tab === "broadcast" && <BroadcastSection />}
          {tab === "other" && <OtherPagesSection />}
        </div>
      </div>
    </div>
  );
}
