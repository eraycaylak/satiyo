"use client";
import { useEffect, useState } from "react";

// Play'e girince tek env flag ile açılır (kod değişmez): NEXT_PUBLIC_ANDROID_PLAY_LIVE=true
const PLAY_LIVE = process.env.NEXT_PUBLIC_ANDROID_PLAY_LIVE === "true";
const PKG = "com.satiyo.app";
const APP_STORE_URL = "https://apps.apple.com/app/id6786818121";
const PLAY_URL = `https://play.google.com/store/apps/details?id=${PKG}`;

type Plat = "ios" | "android" | "other";

function detect(): { plat: Plat; inApp: boolean } {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const plat: Plat = /iPhone|iPad|iPod/.test(ua) ? "ios" : /Android/.test(ua) ? "android" : "other";
  // Instagram/Facebook/vb. in-app tarayıcı: native smart banner + App Links'i bypass eder → kendi banner'ımız kritik
  const inApp = /Instagram|FBAN|FBAV|FB_IAB|Line|Twitter|GSA/i.test(ua);
  return { plat, inApp };
}

/** Paylaşılan sayfalarda platforma göre "uygulamada aç / indir" bandı. path örn: "/ilan/123". */
export function AppBanner({ path }: { path: string }) {
  const [info, setInfo] = useState<{ plat: Plat; inApp: boolean } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("satiyo_banner_x")) return;
    setInfo(detect());
  }, []);

  if (!info) return null;
  const { plat, inApp } = info;
  // Masaüstü: banner yok. iOS gerçek Safari: native apple-itunes-app banner zaten çıkıyor → JS banner gösterme.
  if (plat === "other") return null;
  if (plat === "ios" && !inApp) return null;

  let cta: { label: string; href: string } | null = null;
  let note: string;
  if (plat === "ios") {
    cta = { label: "Uygulamada Aç", href: APP_STORE_URL };
    note = "Satıyo'yu App Store'dan indir";
  } else if (plat === "android" && PLAY_LIVE) {
    // App kuruluysa aç, değilse Play'e düş
    const intent = `intent://satiyo.app${path}#Intent;scheme=https;package=${PKG};S.browser_fallback_url=${encodeURIComponent(PLAY_URL)};end`;
    cta = { label: "Uygulamada Aç", href: intent };
    note = "Satıyo uygulamasında aç";
  } else {
    // Android + Play henüz yok → web'de kalsın, zorlama yok
    note = "Web'de geziyorsun — Satıyo Android uygulaması çok yakında 🎉";
  }

  const close = () => { sessionStorage.setItem("satiyo_banner_x", "1"); setInfo(null); };

  return (
    <div style={{ position: "sticky", top: 0, zIndex: 50, display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#f0434c", color: "#fff", fontSize: 14 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.png" alt="" width={28} height={28} style={{ borderRadius: 7 }} />
      <span style={{ flex: 1, fontWeight: 600 }}>{note}</span>
      {cta && (
        <a href={cta.href} style={{ background: "#fff", color: "#f0434c", padding: "6px 12px", borderRadius: 999, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>
          {cta.label}
        </a>
      )}
      <button onClick={close} aria-label="Kapat" style={{ background: "transparent", border: "none", color: "#fff", fontSize: 20, cursor: "pointer", lineHeight: 1, padding: 0 }}>×</button>
    </div>
  );
}
