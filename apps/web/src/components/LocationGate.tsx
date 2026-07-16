"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { detectProvince, getLocationPref, setLocationPref } from "@/lib/location";

// İlk ziyarette bir kez sorulan kapsam modal'ı:
// "Bulunduğun ildeki ilanlar mı, tüm Türkiye mi?"
// Seçim URL'deki `city` param'ını kurar (Explore onu okur). Konum izni yalnızca
// "Bulunduğum il" seçilince istenir.
export function LocationGate() {
  const router = useRouter();
  const params = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    // Zaten sorulduysa veya URL'de şehir/arama varsa (derin bağlantı) sorma.
    if (getLocationPref()) return;
    if (params.get("city") || params.get("q") || params.get("categoryId")) return;
    setVisible(true);
  }, [params]);

  function goWithCity(city: string) {
    const next = new URLSearchParams(params.toString());
    if (city) next.set("city", city);
    else next.delete("city");
    const qs = next.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  async function chooseLocal() {
    setBusy(true);
    setNote(null);
    try {
      const province = await detectProvince();
      if (province) {
        setLocationPref({ scope: "local", city: province });
        setVisible(false);
        goWithCity(province);
      } else {
        setNote("Konumun alınamadı. Tüm Türkiye gösteriliyor — istediğinde ilini üstten seçebilirsin.");
        setLocationPref({ scope: "all", city: "" });
        setTimeout(() => setVisible(false), 1600);
      }
    } finally {
      setBusy(false);
    }
  }

  function chooseAll() {
    setLocationPref({ scope: "all", city: "" });
    setVisible(false);
    goWithCity("");
  }

  if (!visible) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="locgate-title">
      <div className="modal" style={{ textAlign: "center" }}>
        <div
          aria-hidden="true"
          style={{
            width: 64, height: 64, borderRadius: 999, margin: "0 auto var(--space-3)",
            background: "var(--brand-50, #fff1f2)", display: "grid", placeItems: "center", fontSize: 30,
          }}
        >
          📍
        </div>
        <h2 id="locgate-title" style={{ fontSize: 22, margin: "0 0 8px", letterSpacing: "-.02em" }}>
          İlanları nasıl görelim?
        </h2>
        <p className="muted" style={{ margin: "0 0 var(--space-4)", lineHeight: 1.5 }}>
          Evinde para var. Bulunduğun ildeki ilanları öne mi çıkaralım, yoksa tüm Türkiye'yi mi görmek istersin?
        </p>

        {note && (
          <p style={{ color: "var(--accent, #f97316)", fontSize: 14, margin: "0 0 var(--space-3)" }}>{note}</p>
        )}

        <div className="stack" style={{ gap: "var(--space-3)" }}>
          <button
            className="btn btn-primary"
            onClick={chooseLocal}
            disabled={busy}
            style={{ justifyContent: "center", padding: "14px 18px", fontSize: 16, fontWeight: 800 }}
          >
            {busy ? "Konum alınıyor…" : "📍 Bulunduğum ildekiler"}
          </button>
          <button
            className="btn"
            onClick={chooseAll}
            disabled={busy}
            style={{ justifyContent: "center", padding: "14px 18px", fontSize: 16, fontWeight: 800 }}
          >
            🇹🇷 Tüm Türkiye
          </button>
        </div>

        <p className="muted" style={{ fontSize: 12, margin: "var(--space-3) 0 0" }}>
          Bu seçimi sonradan üstten değiştirebilirsin.
        </p>
      </div>
    </div>
  );
}
