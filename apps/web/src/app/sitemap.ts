import type { MetadataRoute } from "next";

// Cloudflare Pages (next-on-pages) — dinamik sitemap edge'de çalışır.
export const runtime = "edge";
export const revalidate = 3600; // 1 saat cache

const SITE_URL = "https://satiyo.app";
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "https://api.satiyo.app";
const PAGE_SIZE = 50; // API üst sınırı
const MAX_PAGES = 20; // güvenlik: en fazla 1000 ilan

type ListingItem = { id: string; updatedAt?: number; createdAt?: number };
type ListingPage = { items?: ListingItem[]; total?: number };

async function fetchPage(page: number): Promise<ListingPage> {
  const res = await fetch(
    `${API_BASE}/listings?pageSize=${PAGE_SIZE}&page=${page}&sort=newest`,
    { signal: AbortSignal.timeout(8000) },
  );
  if (!res.ok) throw new Error(`listings ${res.status}`);
  return (await res.json()) as ListingPage;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE_URL}/gizlilik`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/kosullar`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/kvkk`, changeFrequency: "yearly", priority: 0.3 },
  ];

  try {
    const first = await fetchPage(1);
    const items: ListingItem[] = [...(first.items ?? [])];
    const total = first.total ?? items.length;
    const pages = Math.min(MAX_PAGES, Math.ceil(total / PAGE_SIZE));

    if (pages > 1) {
      const rest = await Promise.all(
        Array.from({ length: pages - 1 }, (_, i) => fetchPage(i + 2).catch(() => ({ items: [] }))),
      );
      for (const p of rest) items.push(...(p.items ?? []));
    }

    const listingUrls: MetadataRoute.Sitemap = items.map((it) => {
      const ts = it.updatedAt ?? it.createdAt;
      return {
        url: `${SITE_URL}/ilan/${it.id}`,
        lastModified: ts ? new Date(ts) : undefined,
        changeFrequency: "daily",
        priority: 0.6,
      };
    });
    return [...base, ...listingUrls];
  } catch {
    return base;
  }
}
