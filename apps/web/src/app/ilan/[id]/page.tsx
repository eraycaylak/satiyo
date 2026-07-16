export const runtime = "edge";
import type { Metadata } from "next";
import { ListingDetail } from "@/components/ListingDetail";
import { AppBanner } from "@/components/AppBanner";

const API = process.env.NEXT_PUBLIC_API_BASE ?? "https://api.satiyo.app";
const SITE = "https://satiyo.app";
const APP_STORE_ID = "6786818121"; // App Store Connect App ID (apple-itunes-app smart banner)

type OgListing = {
  title: string;
  description?: string | null;
  price: number; // kuruş
  priceType: string; // fixed | negotiable | trade | free
  images?: { url: string }[];
  city?: string | null;
  district?: string | null;
  condition?: "new" | "used" | null;
  status?: string | null; // active | reserved | sold | removed
  categoryId?: string | null;
  seller?: { name?: string | null; isStore?: boolean | null } | null;
};

function priceLabel(l: OgListing): string {
  if (l.priceType === "free") return "Ücretsiz";
  if (l.priceType === "trade") return "Takas";
  const tl = new Intl.NumberFormat("tr-TR").format(Math.round(l.price / 100));
  return `${tl} ₺${l.priceType === "negotiable" ? " (pazarlıklı)" : ""}`;
}

/** Google zengin sonuçları için Product + Offer yapısal verisi (schema.org). */
function productLd(l: OgListing, url: string): Record<string, unknown> {
  const cond = l.condition === "new" ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition";
  const avail = l.status === "sold" || l.status === "removed"
    ? "https://schema.org/SoldOut"
    : "https://schema.org/InStock";
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: l.title,
    description: (l.description?.trim() || `${l.title} — Satıyo'da ikinci el ilan.`).slice(0, 500),
    image: (l.images ?? []).map((i) => i.url).slice(0, 6),
    itemCondition: cond,
  };
  if (l.categoryId) ld.category = l.categoryId;
  // Takasta fiyat anlamlı değil → Offer eklenmez; ücretsizde 0.
  if (l.priceType !== "trade") {
    const offer: Record<string, unknown> = {
      "@type": "Offer",
      priceCurrency: "TRY",
      price: l.priceType === "free" ? 0 : Math.round(l.price / 100),
      availability: avail,
      itemCondition: cond,
      url,
    };
    if (l.seller?.name) {
      offer.seller = { "@type": l.seller.isStore ? "Organization" : "Person", name: l.seller.name };
    }
    ld.offers = offer;
  }
  return ld;
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

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const url = `${SITE}/ilan/${id}`;
  const l = await fetchListing(id);
  // İlan yoksa/hata olsa bile smart banner + kanonik kalsın
  const banner = { "apple-itunes-app": `app-id=${APP_STORE_ID}, app-argument=${url}` };
  if (!l) {
    return { title: "İlan — Satıyo", alternates: { canonical: url }, other: banner };
  }
  const loc = [l.city, l.district].filter(Boolean).join(", ");
  const title = `${l.title} — ${priceLabel(l)}${loc ? " · " + loc : ""}`;
  const description = (l.description?.trim() || `${l.title} — Satıyo'da ikinci el ilan. Evinde para var.`).slice(0, 160);
  const img = l.images?.[0]?.url?.replace("/media/", "/media/thumb/800/");
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
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

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // generateMetadata ile aynı fetch (Next dedupe eder) → ekstra istek yok.
  const l = await fetchListing(id);
  const ld = l ? productLd(l, `${SITE}/ilan/${id}`) : null;
  return (
    <>
      {ld ? (
        <script
          type="application/ld+json"
          // JSON-LD; `<` kaçışı </script> breakout'unu önler.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }}
        />
      ) : null}
      <AppBanner path={`/ilan/${id}`} />
      <ListingDetail id={id} />
    </>
  );
}
