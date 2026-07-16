export const runtime = "edge";
import type { Metadata } from "next";

const API = process.env.NEXT_PUBLIC_API_BASE ?? "https://api.satiyo.app";
const SITE = "https://satiyo.app";
const APP_STORE_ID = "6786818121";

type OgListing = {
  title: string;
  description?: string | null;
  price: number;
  priceType: string;
  images?: { url: string }[];
  city?: string | null;
  district?: string | null;
};

function priceLabel(l: OgListing): string {
  if (l.priceType === "free") return "Ücretsiz";
  if (l.priceType === "trade") return "Takas";
  const tl = new Intl.NumberFormat("tr-TR").format(Math.round(l.price / 100));
  return `${tl} ₺${l.priceType === "negotiable" ? " (pazarlıklı)" : ""}`;
}

async function resolveCode(code: string): Promise<string | null> {
  try {
    const r = await fetch(`${API}/links/${encodeURIComponent(code)}`, { next: { revalidate: 300 } });
    if (!r.ok) return null;
    const j = (await r.json()) as { listingId?: string };
    return j.listingId ?? null;
  } catch {
    return null;
  }
}

async function fetchListing(id: string): Promise<OgListing | null> {
  try {
    const r = await fetch(`${API}/listings/${id}`, { next: { revalidate: 300 } });
    if (!r.ok) return null;
    return (await r.json()) as OgListing;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const id = await resolveCode(code);
  if (!id) return { title: "Satıyo — Evinde para var", robots: { index: false, follow: true } };

  const target = `${SITE}/ilan/${id}`;
  const banner = { "apple-itunes-app": `app-id=${APP_STORE_ID}, app-argument=${target}` };
  const l = await fetchListing(id);
  if (!l) return { title: "İlan — Satıyo", alternates: { canonical: target }, other: banner };

  const loc = [l.city, l.district].filter(Boolean).join(", ");
  const title = `${l.title} — ${priceLabel(l)}${loc ? " · " + loc : ""}`;
  const description = (l.description?.trim() || `${l.title} — Satıyo'da ikinci el ilan. Evinde para var.`).slice(0, 160);
  const img = l.images?.[0]?.url;
  return {
    title,
    description,
    alternates: { canonical: target },
    openGraph: {
      title,
      description,
      url: target,
      type: "website",
      siteName: "Satıyo",
      images: img ? [{ url: img }] : undefined,
    },
    twitter: {
      card: img ? "summary_large_image" : "summary",
      title,
      description,
      images: img ? [img] : undefined,
    },
    other: banner,
  };
}

export default async function ShortLinkPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const id = await resolveCode(code);
  const target = id ? `/ilan/${id}` : "/";
  return (
    <main style={{ minHeight: "60vh", display: "grid", placeItems: "center", gap: 12, padding: 24, textAlign: "center" }}>
      <p style={{ color: "var(--text-muted)" }}>Yönlendiriliyor…</p>
      <a href={target} className="btn btn-primary">İlana git</a>
      {/* İnsanları anında yönlendir; tarayıcısız crawler'lar OG meta'yı head'den okur. */}
      <script dangerouslySetInnerHTML={{ __html: `location.replace(${JSON.stringify(target)})` }} />
    </main>
  );
}
