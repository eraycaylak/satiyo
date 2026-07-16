"use client";
import { useEffect } from "react";

/**
 * Ana sayfaya mobil cihazdan giren ziyaretçiyi mağazaya yönlendirir:
 * iPhone/iPad → App Store, Android → Google Play (Play canlıysa).
 *
 * Güvenlik önlemleri:
 * - Sadece kök sayfada (/) mount edilir (bkz. app/page.tsx).
 * - `?web=1` parametresiyle atlanır (web'de kalmak isteyen için kaçış).
 * - Oturum başına bir kez (sessionStorage) — geri tuşunda döngü olmaz.
 * - Bilinen botlar (Googlebot vb.) yönlendirilmez → SEO korunur.
 * - Play henüz yayında değilse Android yönlendirilmez (NEXT_PUBLIC_ANDROID_PLAY_LIVE).
 */
const PLAY_LIVE = process.env.NEXT_PUBLIC_ANDROID_PLAY_LIVE === "true";
const APP_STORE_URL = "https://apps.apple.com/app/id6786818121";
const PLAY_URL = "https://play.google.com/store/apps/details?id=com.satiyo.app";
const GUARD_KEY = "satiyo_store_redirect";

export function MobileStoreRedirect() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const ua = navigator.userAgent || "";

    // Botları asla yönlendirme (SEO / önizleme crawler'ları)
    if (/bot|crawler|spider|crawling|facebookexternalhit|preview|slurp|bingpreview/i.test(ua)) return;

    // Kaçış: satiyo.app/?web=1 → web'de kal
    const params = new URLSearchParams(window.location.search);
    if (params.get("web") === "1") return;

    // Oturum kilidi — bir kez yönlendir
    if (sessionStorage.getItem(GUARD_KEY)) return;

    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);

    let target: string | null = null;
    if (isIOS) target = APP_STORE_URL;
    else if (isAndroid && PLAY_LIVE) target = PLAY_URL;

    if (!target) return;

    sessionStorage.setItem(GUARD_KEY, "1");
    // replace: geri tuşunda döngüye girmesin
    window.location.replace(target);
  }, []);

  return null;
}
