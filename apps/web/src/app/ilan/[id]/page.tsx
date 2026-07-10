export const runtime = "edge";
import type { Metadata } from "next";
import { ListingDetail } from "@/components/ListingDetail";

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
};

function priceLabel(l: OgListing): string {
  if (l.priceType === "free") return "Ücretsiz";
  if (l.priceType === "trade") return "Takas";
  const tl = new Intl.NumberFormat("tr-TR").format(Math.round(l.price / 100));
  return `${tl} ₺${l.priceType === "negotiable" ? " (pazarlıklı)" : ""}`;
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
  const description = (l.description?.trim() || `${l.title} — Satıyo'da ikinci el ilan. Komşundan al, komşuna sat.`).slice(0, 160);
  const img = l.images?.[0]?.url;
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
  return <ListingDetail id={id} />;
}
