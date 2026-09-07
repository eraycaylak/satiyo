"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Yüzen "Arkadaşını Davet Et" hediye-kutusu butonu (web) — mobil ReferralFab paritesi.
 * Sağ altta sabit; mobilde alt gezinme çubuğunun üstünde. Modal-benzeri / tam-ekran
 * sayfalarda (admin, giriş, ilan-ver, davet'in kendisi) gizlenir.
 */

// Modal/detay/CTA'lı sayfalarda gizle (ilan detayındaki "Mesaj At"ı örtmesin) — mobil paritesi.
const HIDE_PREFIXES = ["/admin", "/giris", "/ilan-ver", "/davet", "/ilan/", "/sohbet", "/mesajlar/"];

export function ReferralFab() {
  const pathname = usePathname() ?? "/";
  if (HIDE_PREFIXES.some((p) => pathname.startsWith(p))) return null;
  return (
    <Link href="/davet" className="referral-fab" aria-label="Arkadaşını davet et, 50 TL kazan" title="Arkadaşını Davet Et">
      <span className="referral-fab-badge">50₺</span>
      🎁
    </Link>
  );
}
