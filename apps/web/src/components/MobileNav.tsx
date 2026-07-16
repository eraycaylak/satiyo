"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

/**
 * Mobil alt gezinme çubuğu — mobil app'in tab bar'ı ile aynı his.
 * Sadece dar ekranda görünür (CSS .mnav). Ortadaki + ilan verme.
 */
export function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  const items = [
    {
      href: "/", label: "Keşfet",
      icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>,
    },
    {
      href: "/favoriler", label: "Favoriler",
      icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21s-7.5-4.7-9.5-9A5.5 5.5 0 0 1 12 6.6 5.5 5.5 0 0 1 21.5 12c-2 4.3-9.5 9-9.5 9z"/></svg>,
    },
    {
      href: "/ilan-ver", label: "", primary: true,
      icon: <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M12 5v14M5 12h14"/></svg>,
    },
    {
      href: "/mesajlar", label: "Mesajlar",
      icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a8 8 0 0 1-8 8H4l1.5-3A8 8 0 1 1 21 12z"/></svg>,
    },
    {
      href: user ? "/profil" : "/giris", label: user ? "Profil" : "Giriş",
      icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/></svg>,
    },
  ];

  return (
    <nav className="mnav" aria-label="Alt gezinme">
      {items.map((it) => (
        <Link key={it.href + it.label} href={it.href}
          className={"mnav-item" + (pathname === it.href ? " on" : "") + (it.primary ? " mnav-sell" : "")}>
          {it.primary ? <span className="mnav-plus">{it.icon}</span> : it.icon}
          {it.label ? <span>{it.label}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
