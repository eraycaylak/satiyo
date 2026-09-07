"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { TR_PROVINCES } from "@satiyo/shared";
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

/** 📍 Konum seçici — mobil app'teki pin ile aynı davranış: Tüm Türkiye / il seç. */
function LocationPin() {
  const router = useRouter();
  const params = useSearchParams();
  const city = params.get("city") ?? "";
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function go(c: string) {
    setOpen(false);
    router.push(c ? `/?city=${encodeURIComponent(c)}` : "/");
  }

  return (
    <div className="hdr-pin-wrap" ref={wrapRef}>
      <button className={"hdr-pin" + (city ? " on" : "")} onClick={() => setOpen(!open)} aria-label="Konum seç" title={city || "Tüm Türkiye"}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>
      </button>
      {open && (
        <div className="hdr-pin-pop">
          <div className="hdr-pin-title">📍 {city || "Tüm Türkiye"}</div>
          <button className="btn btn-ghost btn-block" onClick={() => go("")}>🇹🇷 Tüm Türkiye</button>
          <select className="input" value={city} onChange={(e) => go(e.target.value)} aria-label="İl seç">
            <option value="">İl seç…</option>
            {TR_PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      )}
    </div>
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
        <Link href="/" className="hdr-logo" aria-label="Satıyo.App ana sayfa">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/satiyo-logo.png"
            alt="Satıyo.App — Al · Sat · Kazan"
            style={{ height: 30, width: "auto", display: "block", background: "#fff", borderRadius: 8, padding: "3px 7px" }}
          />
        </Link>
        <form onSubmit={submit} className="hdr-search">
          <input
            className="input"
            placeholder={t("nav.search")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </form>
        <LocationPin />
        {/* Masaüstü: aksiyonlar + İlan Ver. Mobilde gizli — alt gezinme çubuğu var. */}
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
        </div>
        <Link href="/ilan-ver" className="btn btn-primary hdr-sell">+ {t("nav.sell")}</Link>
      </div>
    </header>
  );
}
