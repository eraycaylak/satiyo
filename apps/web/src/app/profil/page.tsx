"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { STORE_MEMBERSHIP } from "@satiyo/shared";
import { api } from "@/lib/client";
import { useAuth } from "@/lib/auth";

const WA_GREETING = "Merhaba, Satıyo hakkında yardım almak istiyorum.";

/** Panelden gelen numaradan wa.me linki kurar (sadece rakam; boşsa null → satır gizlenir). */
function whatsappUrl(raw: string | null | undefined): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(WA_GREETING)}`;
}

export default function ProfilePage() {
  const { user, loading, logout, refresh } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ name: "", city: "", district: "" });
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  // Destek WhatsApp numarası panelden gelir; boşsa satır gizlenir (mobil paritesi).
  const [waUrl, setWaUrl] = useState<string | null>(null);
  useEffect(() => {
    api.config().then((c) => setWaUrl(whatsappUrl(c.supportWhatsapp))).catch(() => setWaUrl(null));
  }, []);

  useEffect(() => {
    if (!loading && !user) router.replace("/giris?next=/profil");
    if (user) setForm({ name: user.name, city: user.city ?? "", district: user.district ?? "" });
  }, [user, loading, router]);

  if (loading || !user) return <div className="empty">Yükleniyor…</div>;

  async function save() {
    setBusy(true); setSaved(false);
    try {
      await api.updateProfile(form);
      await refresh();
      setSaved(true);
    } finally { setBusy(false); }
  }

  return (
    <div style={{ maxWidth: 520, margin: "0 auto" }} className="stack">
      <div className="spread">
        <h1 style={{ fontSize: 24 }}>Profilim</h1>
        <button className="btn btn-ghost" onClick={() => { logout(); router.push("/"); }}>Çıkış yap</button>
      </div>

      <div className="card row" style={{ padding: "var(--space-4)", gap: "var(--space-3)", marginBottom: 16 }}>
        <div style={{ width: 56, height: 56, borderRadius: 999, background: "var(--brand-50)", color: "var(--brand-600)", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 24 }}>
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="grow">
          <div className="row" style={{ gap: 8 }}>
            <strong>{user.phone}</strong>
            {user.phoneVerified && <span className="badge badge-success">✓ Doğrulandı</span>}
          </div>
          <div className="muted" style={{ fontSize: 13 }}>Güven skoru: {user.trustScore}</div>
        </div>
      </div>

      <div className="card stack" style={{ padding: "var(--space-5)", gap: 0 }}>
        <div className="field">
          <label className="label">Ad</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="row" style={{ gap: 12 }}>
          <div className="field grow"><label className="label">Şehir</label>
            <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          <div className="field grow"><label className="label">Semt</label>
            <input className="input" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} /></div>
        </div>
        <button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? "Kaydediliyor…" : "Kaydet"}</button>
        {saved && <p className="badge badge-success" style={{ marginTop: 10 }}>✓ Kaydedildi</p>}
      </div>

      <div className="row" style={{ gap: 12, marginTop: 16 }}>
        <Link href="/ilanlarim" className="btn btn-ghost grow">İlanlarım</Link>
        <Link href="/favoriler" className="btn btn-ghost grow">Favorilerim</Link>
      </div>
      <Link href="/davet" className="btn btn-ghost" style={{ marginTop: 8 }}>🎁 Arkadaşını Davet Et — Kredi Kazan</Link>
      {waUrl ? (
        <a href={waUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ marginTop: 8, color: "#25D366" }}>
          💬 Satıyo Temsilcisi (WhatsApp)
        </a>
      ) : null}
      {user.isStore ? (
        <div className="card row" style={{ padding: "var(--space-4)", gap: 10, marginTop: 8 }}>
          <span className="badge badge-brand">Mağaza</span>
          <strong>{user.storeName}</strong>
          <span className="muted grow" style={{ textAlign: "right", fontSize: 13 }}>Kurumsal üyeliğin aktif</span>
        </div>
      ) : (
        <div className="card stack" style={{ padding: "var(--space-4)", gap: 8, marginTop: 8 }}>
          <strong>🏪 Mağaza Ol</strong>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            {STORE_MEMBERSHIP.perks.join(" · ")} — {new Intl.NumberFormat("tr-TR").format(STORE_MEMBERSHIP.price / 100)} ₺/ay
          </p>
          <button className="btn btn-primary" onClick={async () => {
            const name = prompt("Mağaza adın:");
            if (!name) return;
            try { await api.activateStore(name); await refresh(); } catch (e) { alert((e as Error).message); }
          }}>Mağaza üyeliği al (mock ödeme)</button>
        </div>
      )}
      {user.isAdmin && <Link href="/admin" className="btn btn-primary">🛡️ Admin Paneli</Link>}
    </div>
  );
}
