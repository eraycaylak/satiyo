"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.getAttribute("data-theme") === "dark");
  }, []);
  function toggle() {
    const next = dark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("satiyo_theme", next);
    setDark(!dark);
  }
  return (
    <button className="btn btn-ghost" onClick={toggle} aria-label="Tema değiştir" style={{ padding: "8px 12px" }}>
      {dark ? "☀️" : "🌙"}
    </button>
  );
}

function LangToggle() {
  const { locale, setLocale } = useI18n();
  return (
    <button className="btn btn-ghost" onClick={() => setLocale(locale === "tr" ? "en" : "tr")} style={{ padding: "8px 12px" }} aria-label="Dil">
      {locale === "tr" ? "TR" : "EN"}
    </button>
  );
}

export function Header() {
  const { user } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    router.push(q.trim() ? `/?q=${encodeURIComponent(q.trim())}` : "/");
  }

  return (
    <header style={{ position: "sticky", top: 0, zIndex: 50, background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
      <div className="container hdr-inner">
        <Link href="/" className="hdr-logo">
          Satıyo
        </Link>
        <form onSubmit={submit} className="hdr-search">
          <input
            className="input"
            placeholder={t("nav.search")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </form>
        <div className="hdr-actions">
          <LangToggle />
          <ThemeToggle />
          <Link href="/favoriler" className="btn btn-ghost" style={{ padding: "8px 12px" }} aria-label="Favoriler">♥</Link>
          <Link href="/bildirimler" className="btn btn-ghost" style={{ padding: "8px 12px" }} aria-label="Bildirimler">🔔</Link>
          <Link href="/mesajlar" className="btn btn-ghost" style={{ padding: "8px 12px" }} aria-label="Mesajlar">✉</Link>
          {user ? (
            <Link href="/profil" className="btn btn-ghost">{user.name.split(" ")[0]}</Link>
          ) : (
            <Link href="/giris" className="btn btn-ghost">{t("nav.login")}</Link>
          )}
          <Link href="/ilan-ver" className="btn btn-primary">+ {t("nav.sell")}</Link>
        </div>
      </div>
    </header>
  );
}
