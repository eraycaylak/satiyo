"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getAttributeSchema, getCategory, type PriceType } from "@satiyo/shared";
import { api } from "@/lib/client";
import { useAuth } from "@/lib/auth";
import { uploadImage, type UploadedImage } from "@/lib/upload";
import { guessCategory } from "@/lib/categoryGuess";
import { CategoryPicker } from "@/components/CategoryPicker";
import { formatPrice } from "@/lib/format";

const STEPS = ["Fotoğraf", "Başlık & Kategori", "Özellikler", "Fiyat", "Konum", "Önizleme"];

export default function CreateListingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [images, setImages] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [touchedCat, setTouchedCat] = useState(false);
  const [attributes, setAttributes] = useState<Record<string, string>>({});
  const [price, setPrice] = useState("");
  const [priceType, setPriceType] = useState<PriceType>("fixed");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/giris?next=/ilan-ver");
    if (user) { setCity((c) => c || user.city || ""); setDistrict((d) => d || user.district || ""); }
  }, [user, loading, router]);

  // Başlık yazılırken kategori otomatik tahmin (kullanıcı elle değiştirmediyse)
  useEffect(() => {
    if (touchedCat) return;
    const guess = guessCategory(title);
    if (guess) setCategoryId(guess);
  }, [title, touchedCat]);

  const schema = useMemo(() => (categoryId ? getAttributeSchema(categoryId) : []), [categoryId]);

  if (loading || !user) return <div className="empty">Yükleniyor…</div>;

  async function onFiles(files: FileList | null) {
    if (!files) return;
    setUploading(true); setError(null);
    try {
      for (const file of Array.from(files).slice(0, 12 - images.length)) {
        const img = await uploadImage(file);
        setImages((prev) => [...prev, img]);
      }
    } catch (e) { setError((e as Error).message); }
    finally { setUploading(false); }
  }

  function canNext(): boolean {
    if (step === 0) return images.length >= 1;
    if (step === 1) return title.trim().length >= 3 && !!categoryId;
    if (step === 3) return priceType !== "fixed" || Number(price) > 0;
    return true;
  }

  async function publish(status: "active" | "draft") {
    setBusy(true); setError(null);
    try {
      const listing = await api.createListing({
        title: title.trim(),
        description: description.trim(),
        categoryId,
        price: priceType === "free" ? 0 : Math.round(Number(price || 0) * 100),
        priceType,
        condition: attributes.condition === "Sıfır" ? "new" : "used",
        city: city || undefined,
        district: district || undefined,
        attributes,
        imageIds: images.map((i) => i.imageId),
        status,
      });
      router.push(`/ilan/${listing.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }} className="stack">
      {/* Adım göstergesi */}
      <div className="row" style={{ gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
        {STEPS.map((s, i) => (
          <div key={s} className="row" style={{ gap: 6 }}>
            <span className="badge" style={{ background: i <= step ? "var(--brand)" : "var(--surface-2)", color: i <= step ? "#fff" : "var(--text-muted)" }}>
              {i + 1}
            </span>
            {i === step && <strong style={{ fontSize: 14 }}>{s}</strong>}
          </div>
        ))}
      </div>

      <div className="card stack" style={{ padding: "var(--space-5)", gap: "var(--space-4)" }}>
        {step === 0 && (
          <>
            <h2 style={{ margin: 0 }}>Fotoğraf ekle <span className="muted" style={{ fontWeight: 400, fontSize: 14 }}>(en az 1, en fazla 12)</span></h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px,1fr))", gap: 8 }}>
              {images.map((img, i) => (
                <div key={img.imageId} style={{ position: "relative", aspectRatio: "1", borderRadius: "var(--radius-sm)", overflow: "hidden", background: "var(--surface-2)" }}>
                  <img src={img.url.replace("/media/", "/media/thumb/200/")} loading="lazy" alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  {i === 0 && <span className="badge badge-brand" style={{ position: "absolute", bottom: 4, left: 4, fontSize: 10 }}>Kapak</span>}
                  <button onClick={() => setImages(images.filter((x) => x.imageId !== img.imageId))}
                    style={{ position: "absolute", top: 2, right: 2, border: "none", borderRadius: 999, width: 22, height: 22, background: "rgba(0,0,0,.6)", color: "#fff" }}>×</button>
                </div>
              ))}
              {images.length < 12 && (
                <label style={{ aspectRatio: "1", border: "2px dashed var(--border)", borderRadius: "var(--radius-sm)", display: "grid", placeItems: "center", cursor: "pointer", color: "var(--text-muted)" }}>
                  {uploading ? "…" : "+"}
                  <input type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
                </label>
              )}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="field" style={{ margin: 0 }}>
              <label className="label">Başlık</label>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="örn. iPhone 13 128 GB temiz" autoFocus />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label className="label">Kategori {!touchedCat && categoryId && <span className="badge badge-brand">otomatik</span>}</label>
              <CategoryPicker value={categoryId} onSelect={(id) => { setCategoryId(id); setTouchedCat(true); }} />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label className="label">Açıklama</label>
              <textarea className="input" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ürünü, durumunu, neden sattığını anlat…" />
            </div>
          </>
        )}

        {step === 2 && (
          schema.length === 0 ? <p className="muted">Bu kategoride ek özellik yok, devam edebilirsin.</p> :
          schema.map((a) => (
            <div className="field" style={{ margin: 0 }} key={a.key}>
              <label className="label">{a.label}{a.required && " *"}{a.unit ? ` (${a.unit})` : ""}</label>
              {a.type === "select" ? (() => {
                const depVal = a.dependsOn ? attributes[a.dependsOn] : undefined;
                const opts = a.dependsOn ? (a.optionsByParent?.[depVal ?? ""] ?? []) : (a.options ?? []);
                const depLabel = a.dependsOn ? (schema.find((x) => x.key === a.dependsOn)?.label ?? a.dependsOn) : "";
                return (
                  <select className="input" value={attributes[a.key] ?? ""} disabled={!!a.dependsOn && !depVal}
                    onChange={(e) => setAttributes({ ...attributes, [a.key]: e.target.value })}>
                    <option value="">{a.dependsOn && !depVal ? `Önce ${depLabel} seç` : "Seç…"}</option>
                    {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                );
              })() : (
                <input className="input" type={a.type === "number" ? "number" : "text"} value={attributes[a.key] ?? ""}
                  onChange={(e) => setAttributes({ ...attributes, [a.key]: e.target.value })} />
              )}
            </div>
          ))
        )}

        {step === 3 && (
          <>
            <div className="field" style={{ margin: 0 }}>
              <label className="label">Fiyat tipi</label>
              <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                {(["fixed", "negotiable", "trade", "free"] as PriceType[]).map((pt) => (
                  <button key={pt} className={`badge ${priceType === pt ? "badge-brand" : ""}`} style={{ padding: "8px 14px", cursor: "pointer", border: "1px solid var(--border)" }}
                    onClick={() => setPriceType(pt)}>
                    {pt === "fixed" ? "Sabit" : pt === "negotiable" ? "Pazarlık" : pt === "trade" ? "Takas" : "Ücretsiz"}
                  </button>
                ))}
              </div>
            </div>
            {priceType !== "free" && priceType !== "trade" && (
              <div className="field" style={{ margin: 0 }}>
                <label className="label">Fiyat (₺)</label>
                <input className="input" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="örn. 15000" autoFocus />
              </div>
            )}
          </>
        )}

        {step === 4 && (
          <div className="row" style={{ gap: 12 }}>
            <div className="field grow" style={{ margin: 0 }}><label className="label">Şehir</label>
              <input className="input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="İstanbul" /></div>
            <div className="field grow" style={{ margin: 0 }}><label className="label">Semt</label>
              <input className="input" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Kadıköy" /></div>
          </div>
        )}

        {step === 5 && (
          <>
            <h2 style={{ margin: 0 }}>Önizleme</h2>
            <div className="row" style={{ gap: 12 }}>
              {images[0] && <img src={images[0].url.replace("/media/", "/media/thumb/200/")} loading="lazy" alt="" style={{ width: 110, height: 110, objectFit: "cover", borderRadius: "var(--radius)" }} />}
              <div className="stack" style={{ gap: 4 }}>
                <div className="price" style={{ fontSize: 22 }}>{priceType === "free" ? "Ücretsiz" : priceType === "trade" ? "Takas" : formatPrice(Number(price) * 100)}</div>
                <strong>{title}</strong>
                <span className="muted">{getCategory(categoryId)?.name} · {[district, city].filter(Boolean).join(", ")}</span>
              </div>
            </div>
            {description && <p style={{ whiteSpace: "pre-wrap" }}>{description}</p>}
          </>
        )}

        {error && <p style={{ color: "var(--danger)", fontSize: 13, margin: 0 }}>{error}</p>}

        {/* Navigasyon */}
        <div className="spread" style={{ marginTop: 8 }}>
          <button className="btn btn-ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>← Geri</button>
          {step < STEPS.length - 1 ? (
            <button className="btn btn-primary" disabled={!canNext()} onClick={() => setStep(step + 1)}>İleri →</button>
          ) : (
            <div className="row" style={{ gap: 8 }}>
              <button className="btn btn-ghost" disabled={busy} onClick={() => publish("draft")}>Taslak kaydet</button>
              <button className="btn btn-primary" disabled={busy} onClick={() => publish("active")}>{busy ? "Yayınlanıyor…" : "Yayınla"}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
