"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { CATEGORIES, getChildren, type SearchFilters, type SortOption } from "@satiyo/shared";
import { useState } from "react";
import dynamic from "next/dynamic";
import { api } from "@/lib/client";
import { useAuth } from "@/lib/auth";
import { ListingCard, ListingCardSkeleton, ListingGrid } from "./ListingCard";

const MapView = dynamic(() => import("./MapView"), { ssr: false, loading: () => <div className="empty">Harita yükleniyor…</div> });

const SORTS: { value: SortOption; label: string }[] = [
  { value: "relevance", label: "İlgili" },
  { value: "newest", label: "En yeni" },
  { value: "price_asc", label: "Artan fiyat" },
  { value: "price_desc", label: "Azalan fiyat" },
];

export function Explore() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useAuth();
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "map">("list");

  const q = params.get("q") ?? undefined;
  const categoryId = params.get("categoryId") ?? undefined;
  const sort = (params.get("sort") as SortOption) ?? "relevance";

  const filters: SearchFilters = {
    q,
    categoryId,
    sort,
    minPrice: params.get("minPrice") ? Number(params.get("minPrice")) * 100 : undefined,
    maxPrice: params.get("maxPrice") ? Number(params.get("maxPrice")) * 100 : undefined,
    condition: (params.get("condition") as "new" | "used") ?? undefined,
    sellerType: (params.get("sellerType") as "individual" | "store") ?? undefined,
    withImageOnly: params.get("withImageOnly") === "1" || undefined,
    pageSize: 24,
  };

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ["listings", filters],
    queryFn: () => api.search(filters),
    placeholderData: keepPreviousData,
  });

  const browsing = !q && !categoryId;
  const { data: reco } = useQuery({
    queryKey: ["recommendations"],
    queryFn: () => api.recommendations(),
    enabled: !!user && browsing,
  });

  function setParam(key: string, value?: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value); else next.delete(key);
    router.push(`/?${next.toString()}`);
  }

  async function saveSearch() {
    if (!user) { router.push("/giris?next=/"); return; }
    try {
      await api.saveSearch(filters, true);
      setSavedMsg("🔔 Arama kaydedildi — eşleşen yeni ilanlarda haber vereceğiz.");
      setTimeout(() => setSavedMsg(null), 3500);
    } catch { setSavedMsg("Kaydedilemedi."); }
  }
  const hasCriteria = !!(q || categoryId || filters.minPrice || filters.maxPrice || filters.condition);

  const rootCats = getChildren(null);
  const activeCat = categoryId ? CATEGORIES.find((c) => c.id === categoryId) : null;

  return (
    <div className="stack" style={{ gap: "var(--space-4)" }}>
      {/* Senin için (kişiselleştirilmiş öneriler) */}
      {browsing && reco && reco.items.length > 0 && (
        <div className="stack" style={{ gap: "var(--space-2)" }}>
          <h2 style={{ fontSize: 18, margin: 0 }}>✨ Senin için</h2>
          <div className="row" style={{ gap: "var(--space-4)", overflowX: "auto", paddingBottom: 4 }}>
            {reco.items.map((l) => (
              <div key={l.id} style={{ width: 180, flexShrink: 0 }}><ListingCard listing={l} /></div>
            ))}
          </div>
        </div>
      )}

      {/* Kategori çubuğu */}
      <div className="row" style={{ gap: 8, overflowX: "auto", paddingBottom: 4 }}>
        <button className={`badge ${!categoryId ? "badge-brand" : ""}`} style={chip} onClick={() => setParam("categoryId")}>
          Tümü
        </button>
        {rootCats.map((c) => (
          <button key={c.id} className={`badge ${categoryId === c.id ? "badge-brand" : ""}`} style={chip} onClick={() => setParam("categoryId", c.id)}>
            {c.icon} {c.name}
          </button>
        ))}
      </div>

      {/* Başlık + filtre satırı */}
      <div className="spread" style={{ flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontSize: 20, margin: 0 }}>
          {q ? `“${q}” için sonuçlar` : activeCat ? activeCat.name : "Keşfet"}
          {data && <span className="muted" style={{ fontWeight: 400, fontSize: 14 }}> · {data.total} ilan</span>}
        </h1>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <input className="input" style={{ width: 96 }} type="number" placeholder="En az ₺"
            defaultValue={params.get("minPrice") ?? ""} onBlur={(e) => setParam("minPrice", e.target.value || undefined)} />
          <input className="input" style={{ width: 96 }} type="number" placeholder="En çok ₺"
            defaultValue={params.get("maxPrice") ?? ""} onBlur={(e) => setParam("maxPrice", e.target.value || undefined)} />
          <select className="input" style={{ width: "auto" }} value={params.get("condition") ?? ""} onChange={(e) => setParam("condition", e.target.value || undefined)}>
            <option value="">Tüm durumlar</option>
            <option value="new">Sıfır</option>
            <option value="used">İkinci el</option>
          </select>
          <select className="input" style={{ width: "auto" }} value={sort} onChange={(e) => setParam("sort", e.target.value)}>
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          {hasCriteria && <button className="btn btn-ghost" onClick={saveSearch}>🔔 Aramayı kaydet</button>}
          <button className="btn btn-ghost" onClick={() => setView(view === "list" ? "map" : "list")}>
            {view === "list" ? "🗺️ Harita" : "☰ Liste"}
          </button>
        </div>
      </div>
      {savedMsg && <div className="badge badge-brand" style={{ padding: "8px 14px" }}>{savedMsg}</div>}

      {/* Sonuçlar */}
      {isLoading ? (
        <ListingGrid>{Array.from({ length: 12 }).map((_, i) => <ListingCardSkeleton key={i} />)}</ListingGrid>
      ) : isError ? (
        <div className="empty">Bir şeyler ters gitti. Lütfen tekrar deneyin.</div>
      ) : !data || data.items.length === 0 ? (
        <div className="empty">
          <div style={{ fontSize: 40, marginBottom: 8 }}>🔍</div>
          <p>Sonuç bulunamadı{q ? ` — “${q}”` : ""}.</p>
          <p className="muted">Farklı bir anahtar kelime ya da kategori deneyin.</p>
        </div>
      ) : (
        view === "map" ? (
          <MapView listings={data.items} />
        ) : (
          <div style={{ opacity: isFetching ? 0.6 : 1, transition: "opacity .15s" }}>
            <ListingGrid>
              {data.items.map((l) => <ListingCard key={l.id} listing={l} />)}
            </ListingGrid>
          </div>
        )
      )}
    </div>
  );
}

const chip: React.CSSProperties = { whiteSpace: "nowrap", cursor: "pointer", border: "1px solid var(--border)", padding: "7px 14px", fontSize: 14 };
