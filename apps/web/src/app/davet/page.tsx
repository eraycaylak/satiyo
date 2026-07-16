"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/client";
import { useAuth } from "@/lib/auth";

const tl = (minor: number) => new Intl.NumberFormat("tr-TR").format(Math.round(minor / 100));

export default function DavetPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const { data } = useQuery({ queryKey: ["referral"], queryFn: () => api.referral(), enabled: !!user });

  if (!loading && !user) { router.replace("/giris?next=/davet"); return null; }

  const link = data?.link ?? "";
  const reward = tl(data?.rewardMinor ?? 5000);

  async function copy() {
    try { await navigator.clipboard.writeText(link); } catch { /* yoksay */ }
    setCopied(true); setTimeout(() => setCopied(false), 1600);
  }
  function shareTo(net: "wa" | "x" | "fb") {
    const txt = `Satıyo'ya davetlisin! Reklamsız ikinci-el pazar. İlk ilanını verince ikimize de ${reward} TL öne çıkarma kredisi 💰`;
    const url =
      net === "wa" ? `https://wa.me/?text=${encodeURIComponent(`${txt} ${link}`)}` :
      net === "x" ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(txt)}&url=${encodeURIComponent(link)}` :
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`;
    window.open(url, "_blank", "noopener");
  }

  return (
    <div className="stack" style={{ gap: "var(--space-5)", maxWidth: 560, margin: "0 auto" }}>
      <div style={{ textAlign: "center", paddingTop: "var(--space-4)" }}>
        <div style={{ fontSize: 48 }}>🎁</div>
        <h1 style={{ margin: "8px 0 4px", fontSize: 26 }}>Arkadaşını davet et, kazan</h1>
        <p className="muted" style={{ margin: 0 }}>
          Davet ettiğin arkadaşın ilk ilanını verince <b style={{ color: "var(--brand)" }}>ikinize de {reward} TL</b> öne çıkarma kredisi.
        </p>
      </div>

      <div className="card" style={{ padding: "var(--space-4)", display: "flex", gap: 8, alignItems: "center" }}>
        <input className="input" readOnly value={link} style={{ flex: 1, fontSize: 13 }} onFocus={(e) => e.currentTarget.select()} />
        <button className="btn btn-primary" onClick={copy} style={{ whiteSpace: "nowrap" }}>{copied ? "✓ Kopyalandı" : "Kopyala"}</button>
      </div>

      <div className="row" style={{ gap: 10, justifyContent: "center" }}>
        <button className="btn btn-ghost" onClick={() => shareTo("wa")}>WhatsApp</button>
        <button className="btn btn-ghost" onClick={() => shareTo("x")}>X</button>
        <button className="btn btn-ghost" onClick={() => shareTo("fb")}>Facebook</button>
      </div>

      <div className="card" style={{ padding: "var(--space-4)", display: "flex", justifyContent: "space-around", textAlign: "center" }}>
        <div><div style={{ fontSize: 24, fontWeight: 800 }}>{data?.invited ?? 0}</div><div className="muted" style={{ fontSize: 13 }}>Davet</div></div>
        <div><div style={{ fontSize: 24, fontWeight: 800 }}>{data?.rewarded ?? 0}</div><div className="muted" style={{ fontSize: 13 }}>Ödüllü</div></div>
        <div><div style={{ fontSize: 24, fontWeight: 800, color: "var(--brand)" }}>{tl(data?.earnedMinor ?? 0)} ₺</div><div className="muted" style={{ fontSize: 13 }}>Kazanç</div></div>
      </div>

      <p className="muted" style={{ fontSize: 12, textAlign: "center", margin: 0 }}>
        Krediler reklamsız ilan öne çıkarmada (boost) kullanılır. Kendini davet etmek geçersizdir.
      </p>
    </div>
  );
}
