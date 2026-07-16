"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/client";
import { useAuth } from "@/lib/auth";
import { readRefCode } from "@/components/RefCapture";

function LoginInner() {
  const { setSession } = useAuth();
  const router = useRouter();
  const next = useSearchParams().get("next") ?? "/";

  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fullPhone = "+90" + phone.replace(/\D/g, "").slice(0, 10);

  async function requestCode() {
    setError(null);
    if (phone.replace(/\D/g, "").length !== 10) return setError("10 haneli telefon numarası gir (5XX…)");
    setBusy(true);
    try {
      const res = await api.requestOtp(fullPhone);
      setDevCode(res.devCode ?? null);
      setStep("code");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setError(null);
    setBusy(true);
    try {
      const session = await api.verifyOtp(fullPhone, code.replace(/\D/g, ""), readRefCode());
      try { localStorage.removeItem("satiyo_ref"); } catch { /* yoksay */ }
      setSession(session.token, session.user);
      router.push(next);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 400, margin: "var(--space-6) auto", padding: "var(--space-6)" }}>
      <h1 style={{ fontSize: 24, marginTop: 0 }}>Satıyo'ya giriş</h1>
      <p className="muted" style={{ marginTop: 0 }}>Telefonunla saniyeler içinde giriş yap.</p>

      {step === "phone" ? (
        <>
          <div className="field">
            <label className="label">Telefon</label>
            <div className="row" style={{ gap: 8 }}>
              <span className="btn btn-ghost" style={{ pointerEvents: "none" }}>🇹🇷 +90</span>
              <input className="input grow" inputMode="numeric" placeholder="5XX XXX XX XX"
                value={phone} onChange={(e) => setPhone(e.target.value)} onKeyDown={(e) => e.key === "Enter" && requestCode()} autoFocus />
            </div>
          </div>
          {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}
          <button className="btn btn-primary btn-block btn-lg" disabled={busy} onClick={requestCode}>
            {busy ? "Gönderiliyor…" : "Kod gönder"}
          </button>
          <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }} disabled={busy}
            onClick={async () => { try { const s = await api.devLogin(); setSession(s.token, s.user); router.push(next); } catch (e) { setError((e as Error).message); } }}>
            🛠️ Numarasız dev giriş (geçici)
          </button>
        </>
      ) : (
        <>
          <div className="field">
            <label className="label">{fullPhone} numarasına gelen 6 haneli kod</label>
            <input className="input" inputMode="numeric" placeholder="• • • • • •" style={{ letterSpacing: 8, textAlign: "center", fontSize: 22 }}
              value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && verify()} autoFocus />
          </div>
          {devCode && (
            <div className="badge badge-brand" style={{ marginBottom: 12 }}>
              Geliştirme kodu: <strong style={{ marginLeft: 4 }}>{devCode}</strong>
            </div>
          )}
          {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}
          <button className="btn btn-primary btn-block btn-lg" disabled={busy || code.length < 6} onClick={verify}>
            {busy ? "Doğrulanıyor…" : "Giriş yap"}
          </button>
          <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={() => setStep("phone")}>← Numarayı değiştir</button>
        </>
      )}
      <p className="muted" style={{ fontSize: 12, marginTop: 16, textAlign: "center" }}>
        Devam ederek kullanım koşullarını ve gizlilik politikasını kabul edersin.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="empty">Yükleniyor…</div>}>
      <LoginInner />
    </Suspense>
  );
}
