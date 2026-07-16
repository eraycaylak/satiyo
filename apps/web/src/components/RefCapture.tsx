"use client";
import { useEffect } from "react";

/**
 * Davet kodu yakalayıcı — satiyo.app/?ref=CODE ile gelen ziyaretçinin kodunu
 * localStorage'a yazar (30 gün). Kayıt anında (giris) verifyOtp'a iletilir.
 * Her sayfada mount edilir (Chrome içinde).
 */
export function RefCapture() {
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get("ref");
      if (ref && /^[0-9A-Za-z]{4,40}$/.test(ref)) {
        localStorage.setItem("satiyo_ref", JSON.stringify({ code: ref, ts: Date.now() }));
      }
    } catch {
      /* yoksay */
    }
  }, []);
  return null;
}

/** Kayıtlı davet kodunu döndürür (30 günden eskiyse yok sayar). */
export function readRefCode(): string | undefined {
  try {
    const raw = localStorage.getItem("satiyo_ref");
    if (!raw) return undefined;
    const { code, ts } = JSON.parse(raw) as { code?: string; ts?: number };
    if (!code || !ts || Date.now() - ts > 30 * 24 * 60 * 60 * 1000) return undefined;
    return code;
  } catch {
    return undefined;
  }
}
