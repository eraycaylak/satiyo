"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  TR_PROVINCES,
  getCategory,
  getChildren,
  getCategoryPath,
  rootCategories,
  leafCategories,
  categoryVisual,
  foldTr,
  type SearchFilters,
  type SortOption,
} from "@satiyo/shared";
import { api } from "@/lib/client";
import { CategoryRail } from "./CategoryRail";

/**
 * Keşfet full filtre paneli (letgo "Filtrele" paritesi).
 * Sağdan açılan drawer; kategori drill-down + dinamik öznitelik filtreleri +
 * canlı "Uygula (N) ilan" sayacı. Taslak URL'e ancak "Uygula" ile yazılır.
 */

const SORTS: { value: SortOption; label: string }[] = [
  { value: "relevance", label: "İlgili" },
  { value: "newest", label: "En yeni" },
  { value: "price_asc", label: "Artan fiyat" },
  { value: "price_desc", label: "Azalan fiyat" },
];

const nfmt = new Intl.NumberFormat("tr-TR");

interface Draft {
  q: string;
  categoryId?: string;
  city?: string;
  minPrice: string; // TL (ham metin)
  maxPrice: string; // TL
  condition?: "new" | "used";
  sellerType?: "individual" | "store";
  boostedOnly: boolean;
  attrs: Record<string, string>;
  sort: SortOption;
}

/** URL attrs parametresini güvenli parse eder (string→string map). */
export function parseAttrsParam(raw: string | null): Record<string, string> | undefined {
  if (!raw) return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return undefined;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "string" && v) out[k] = v;
    }
    return Object.keys(out).length ? out : undefined;
  } catch {
    return undefined;
  }
}

/** Uygulanmış aktif filtre sayısı ("Filtrele" rozetinde gösterilir; q hariç). */
export function activeFilterCount(params: { get(name: string): string | null }): number {
  const attrs = parseAttrsParam(params.get("attrs"));
  const sort = params.get("sort");
  return (
    (params.get("categoryId") ? 1 : 0) +
    (params.get("city") ? 1 : 0) +
    (params.get("minPrice") ? 1 : 0) +
    (params.get("maxPrice") ? 1 : 0) +
    (params.get("condition") ? 1 : 0) +
    (params.get("sellerType") ? 1 : 0) +
    (params.get("boosted") ? 1 : 0) +
    (sort && sort !== "relevance" ? 1 : 0) +
    (attrs ? Object.keys(attrs).length : 0)
  );
}

function draftFromParams(p: URLSearchParams): Draft {
  return {
    q: p.get("q") ?? "",
    categoryId: p.get("categoryId") ?? undefined,
    city: p.get("city") ?? undefined,
    minPrice: p.get("minPrice") ?? "",
    maxPrice: p.get("maxPrice") ?? "",
    condition: (p.get("condition") as "new" | "used") || undefined,
    sellerType: (p.get("sellerType") as "individual" | "store") || undefined,
    boostedOnly: p.get("boosted") === "1",
    attrs: parseAttrsParam(p.get("attrs")) ?? {},
    sort: (p.get("sort") as SortOption) || "relevance",
  };
}

function toKurus(tl: string): number | undefined {
  if (!tl.trim()) return undefined;
  const n = Number(tl);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : undefined;
}

/** Basit debounce (canlı sayaç istekleri her tuşta atılmasın). */
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
}

export function FilterSheet({ open, onClose }: FilterSheetProps) {
  const router = useRouter();
  const params = useSearchParams();

  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => draftFromParams(new URLSearchParams(params.toString())));
  const [view, setView] = useState<"main" | "category">("main");
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [ilQ, setIlQ] = useState("");

  useEffect(() => setMounted(true), []);

  // Panel her açılışta güncel URL'den yeniden başlar.
  useEffect(() => {
    if (!open) return;
    setDraft(draftFromParams(new URLSearchParams(params.toString())));
    setView("main");
    setOpenKey(null);
    setIlQ("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Body scroll kilidi + Escape ile kapat.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const cat = draft.categoryId ? getCategory(draft.categoryId) : undefined;
  const selectAttrs = useMemo(() => (cat?.attributes ?? []).filter((a) => a.type === "select"), [cat]);

  const countFilters = useMemo<SearchFilters>(
    () => ({
      q: draft.q.trim() || undefined,
      categoryId: draft.categoryId,
      city: draft.city,
      minPrice: toKurus(draft.minPrice),
      maxPrice: toKurus(draft.maxPrice),
      condition: draft.condition,
      sellerType: draft.sellerType,
      boostedOnly: draft.boostedOnly || undefined,
      attrs: Object.keys(draft.attrs).length ? draft.attrs : undefined,
      sort: draft.sort,
      page: 1,
      pageSize: 1,
    }),
    [draft],
  );
  const countKey = useDebounce(JSON.stringify(countFilters), 300);
  const { data: count, isFetching: countFetching } = useQuery({
    queryKey: ["filter-count", countKey],
    queryFn: () => api.search(JSON.parse(countKey) as SearchFilters).then((r) => r.total),
    enabled: open,
    placeholderData: keepPreviousData,
  });

  // --- Taslak güncelleyiciler (immutable) ---
  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  function setAttr(key: string, val?: string) {
    setDraft((d) => {
      const attrs = { ...d.attrs };
      if (val) attrs[key] = val;
      else delete attrs[key];
      // Bağımlı öznitelikleri temizle (ör. marka değişince model sıfırlanır).
      for (const a of cat?.attributes ?? []) if (a.dependsOn === key) delete attrs[a.key];
      return { ...d, attrs };
    });
  }

  function chooseCategory(id?: string) {
    setDraft((d) => ({ ...d, categoryId: id, attrs: {} }));
    setView("main");
    setOpenKey(null);
  }

  function clearAll() {
    setDraft({
      q: "",
      categoryId: undefined,
      city: undefined,
      minPrice: "",
      maxPrice: "",
      condition: undefined,
      sellerType: undefined,
      boostedOnly: false,
      attrs: {},
      sort: "relevance",
    });
    setOpenKey(null);
    setIlQ("");
  }

  function apply() {
    const next = new URLSearchParams(params.toString());
    const set = (k: string, v?: string) => {
      if (v) next.set(k, v);
      else next.delete(k);
    };
    set("q", draft.q.trim() || undefined);
    set("categoryId", draft.categoryId);
    set("city", draft.city);
    set("minPrice", draft.minPrice.trim() || undefined);
    set("maxPrice", draft.maxPrice.trim() || undefined);
    set("condition", draft.condition);
    set("sellerType", draft.sellerType);
    set("boosted", draft.boostedOnly ? "1" : undefined);
    set("sort", draft.sort !== "relevance" ? draft.sort : undefined);
    set("attrs", Object.keys(draft.attrs).length ? JSON.stringify(draft.attrs) : undefined);
    router.push(`/?${next.toString()}`);
    onClose();
  }

  if (!mounted || !open) return null;

  const catPath = draft.categoryId ? getCategoryPath(draft.categoryId) : [];
  const applyLabel = count == null && countFetching ? "Uygula" : `Uygula (${nfmt.format(count ?? 0)}) ilan`;

  return createPortal(
    <div className="fs-overlay" onClick={onClose}>
      <div
        className="fs-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Filtrele"
        onClick={(e) => e.stopPropagation()}
      >
        {view === "category" ? (
          <>
            <header className="fs-head">
              <button type="button" className="fs-x" aria-label="Geri" onClick={() => setView("main")}>
                ‹
              </button>
              <h2 className="fs-title">Bir kategori seç</h2>
              <span style={{ width: 38 }} />
            </header>
            <div className="fs-body">
              <CategoryStep value={draft.categoryId} onPick={chooseCategory} />
            </div>
          </>
        ) : (
          <>
            <header className="fs-head">
              <button type="button" className="fs-x" aria-label="Kapat" onClick={onClose}>
                ✕
              </button>
              <h2 className="fs-title">Filtrele</h2>
              <button type="button" className="fs-clear" onClick={clearAll}>
                Temizle
              </button>
            </header>

            <div className="fs-body">
              {/* Kategori — renkli ikon + drill-down */}
              <div className="fs-card">
                <button type="button" className="fs-row" onClick={() => setView("category")}>
                  {draft.categoryId ? <CatDot id={draft.categoryId} /> : null}
                  <span className="fs-row-main">
                    <span className="fs-row-label">Kategori</span>
                    <span className="fs-row-value">
                      {catPath.length ? catPath.map((c) => c.name).join(" › ") : "Tüm kategoriler"}
                    </span>
                  </span>
                  {draft.categoryId ? <span className="fs-count">1</span> : null}
                  <span className="fs-chev">›</span>
                </button>
              </div>

              {/* Öne Çıkan toggle */}
              <div className="fs-card">
                <button
                  type="button"
                  className="fs-row"
                  role="switch"
                  aria-checked={draft.boostedOnly}
                  onClick={() => patch({ boostedOnly: !draft.boostedOnly })}
                >
                  <span className="fs-row-main">
                    <span className="fs-row-label">Öne Çıkan İlanlar</span>
                    <span className="fs-row-sub">Yalnızca vitrindeki ilanlar</span>
                  </span>
                  <span className={`fs-switch ${draft.boostedOnly ? "on" : ""}`} aria-hidden="true" />
                </button>
              </div>

              {/* İl */}
              <AccordionCard
                id="il"
                label="İl"
                value={draft.city ?? "Tüm Türkiye"}
                count={draft.city ? 1 : 0}
                openKey={openKey}
                setOpenKey={setOpenKey}
              >
                <input
                  className="input"
                  placeholder="İl ara…"
                  value={ilQ}
                  onChange={(e) => setIlQ(e.target.value)}
                  aria-label="İl ara"
                />
                <div className="fs-scroll">
                  <button
                    type="button"
                    className={`fs-cat-item ${!draft.city ? "on" : ""}`}
                    onClick={() => {
                      patch({ city: undefined });
                      setOpenKey(null);
                    }}
                  >
                    Tüm Türkiye
                  </button>
                  {TR_PROVINCES.filter((p) => foldTr(p).includes(foldTr(ilQ.trim()))).map((p) => (
                    <button
                      type="button"
                      key={p}
                      className={`fs-cat-item ${draft.city === p ? "on" : ""}`}
                      onClick={() => {
                        patch({ city: p });
                        setOpenKey(null);
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </AccordionCard>

              {/* Fiyat */}
              <AccordionCard
                id="fiyat"
                label="Fiyat"
                value={priceLabel(draft.minPrice, draft.maxPrice)}
                openKey={openKey}
                setOpenKey={setOpenKey}
              >
                <div className="fs-price">
                  <input
                    className="input"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    placeholder="En az ₺"
                    value={draft.minPrice}
                    onChange={(e) => patch({ minPrice: e.target.value })}
                    aria-label="En az fiyat"
                  />
                  <span className="fs-price-sep">—</span>
                  <input
                    className="input"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    placeholder="En çok ₺"
                    value={draft.maxPrice}
                    onChange={(e) => patch({ maxPrice: e.target.value })}
                    aria-label="En çok fiyat"
                  />
                </div>
              </AccordionCard>

              {/* Durum */}
              <div className="fs-card fs-inline">
                <span className="fs-inline-label">Durum</span>
                <Segmented<"new" | "used">
                  options={[
                    { value: undefined, label: "Tümü" },
                    { value: "new", label: "Sıfır" },
                    { value: "used", label: "İkinci el" },
                  ]}
                  value={draft.condition}
                  onChange={(v) => patch({ condition: v })}
                />
              </div>

              {/* Dinamik öznitelik filtreleri (kategoriye bağlı) */}
              {selectAttrs.map((a) => {
                const parentVal = a.dependsOn ? draft.attrs[a.dependsOn] : undefined;
                const options = a.dependsOn
                  ? parentVal
                    ? a.optionsByParent?.[parentVal] ?? []
                    : []
                  : a.options ?? [];
                const disabled = Boolean(a.dependsOn) && !parentVal;
                const val = draft.attrs[a.key];
                const parentLabel = a.dependsOn
                  ? cat?.attributes?.find((x) => x.key === a.dependsOn)?.label ?? "önceki"
                  : "";
                return (
                  <AccordionCard
                    key={a.key}
                    id={`attr:${a.key}`}
                    label={a.label}
                    value={val}
                    count={val ? 1 : 0}
                    openKey={openKey}
                    setOpenKey={setOpenKey}
                  >
                    {disabled ? (
                      <p className="muted" style={{ margin: 0, fontSize: 14 }}>
                        Önce {parentLabel} seçin.
                      </p>
                    ) : (
                      <Chips options={options} value={val} onChange={(v) => setAttr(a.key, v)} />
                    )}
                  </AccordionCard>
                );
              })}

              {/* Satıcı tipi */}
              <div className="fs-card fs-inline">
                <span className="fs-inline-label">Satıcı tipi</span>
                <Segmented<"individual" | "store">
                  options={[
                    { value: undefined, label: "Tümü" },
                    { value: "individual", label: "Bireysel" },
                    { value: "store", label: "Mağaza" },
                  ]}
                  value={draft.sellerType}
                  onChange={(v) => patch({ sellerType: v })}
                />
              </div>

              {/* Sıralama */}
              <div className="fs-card fs-inline">
                <span className="fs-inline-label">Sıralama</span>
                <div className="fs-chips">
                  {SORTS.map((s) => (
                    <button
                      type="button"
                      key={s.value}
                      className={`fs-chip ${draft.sort === s.value ? "on" : ""}`}
                      onClick={() => patch({ sort: s.value })}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Kelime ile Filtrele */}
              <AccordionCard
                id="kelime"
                label="Kelime ile Filtrele"
                value={draft.q.trim() || undefined}
                openKey={openKey}
                setOpenKey={setOpenKey}
              >
                <div className="fs-search">
                  <span className="fs-search-ic" aria-hidden="true">
                    🔍
                  </span>
                  <input
                    className="input"
                    placeholder="Ürün, kategori veya marka ara…"
                    value={draft.q}
                    onChange={(e) => patch({ q: e.target.value })}
                    aria-label="Kelime ile filtrele"
                  />
                </div>
              </AccordionCard>
            </div>

            <footer className="fs-foot">
              <button type="button" className="btn btn-primary btn-lg btn-block fs-apply" onClick={apply}>
                {applyLabel}
              </button>
            </footer>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

// --- Kategori seçim adımı (renkli ikon rayı + drill-down + arama) ---
function CategoryStep({ value, onPick }: { value?: string; onPick: (id?: string) => void }) {
  const [level, setLevel] = useState<string | null>(value ? getCategory(value)?.parentId ?? null : null);
  const [q, setQ] = useState("");

  const browseRoot = level ? getCategoryPath(level)[0]?.id : undefined;
  const nodes = level === null ? rootCategories() : getChildren(level);
  const path = level ? getCategoryPath(level) : [];

  const results = useMemo(() => {
    const t = foldTr(q.trim());
    if (!t) return [];
    return leafCategories()
      .filter((c) => foldTr(c.name).includes(t))
      .slice(0, 40);
  }, [q]);

  return (
    <>
      <input
        className="input"
        placeholder="Kategori ara (ör. telefon, koltuk, bmw)"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Kategori ara"
      />

      {q ? (
        <div className="fs-catlist">
          {results.length === 0 ? (
            <p className="muted" style={{ padding: 8 }}>
              Sonuç yok.
            </p>
          ) : (
            results.map((c) => (
              <button type="button" key={c.id} className="fs-cat-item" onClick={() => onPick(c.id)}>
                <CatDot id={c.id} />
                <span className="grow">{c.name}</span>
                <span className="muted" style={{ fontSize: 12 }}>
                  {getCategoryPath(c.id)
                    .slice(0, -1)
                    .map((p) => p.name)
                    .join(" › ")}
                </span>
              </button>
            ))
          )}
        </div>
      ) : (
        <>
          {/* Kök renkli ikon rayı (letgo ref-08) */}
          <CategoryRail
            active={browseRoot}
            onSelect={(id) => {
              setLevel(id ?? null);
            }}
          />

          {/* Breadcrumb */}
          <div className="fs-crumbs">
            <button type="button" className="badge" style={crumbStyle} onClick={() => setLevel(null)}>
              Tümü
            </button>
            {path.map((c) => (
              <span key={c.id} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span className="muted">›</span>
                <button type="button" className="badge" style={crumbStyle} onClick={() => setLevel(c.id)}>
                  {c.name}
                </button>
              </span>
            ))}
          </div>

          <div className="fs-catlist">
            {level === null ? (
              <button
                type="button"
                className={`fs-cat-item ${!value ? "on" : ""}`}
                onClick={() => onPick(undefined)}
              >
                <span className="fs-cat-dot" style={{ background: "var(--brand)" }} aria-hidden="true">
                  ▦
                </span>
                <span className="grow">Tüm kategoriler</span>
              </button>
            ) : (
              <button
                type="button"
                className={`fs-cat-item ${value === level ? "on" : ""}`}
                onClick={() => onPick(level)}
              >
                <CatDot id={level} />
                <span className="grow">Tüm {getCategory(level)?.name}</span>
              </button>
            )}

            {nodes.map((c) => {
              const hasKids = getChildren(c.id).length > 0;
              return (
                <button
                  type="button"
                  key={c.id}
                  className={`fs-cat-item ${value === c.id ? "on" : ""}`}
                  onClick={() => (hasKids ? setLevel(c.id) : onPick(c.id))}
                >
                  <CatDot id={c.id} />
                  <span className="grow">{c.name}</span>
                  {hasKids ? <span className="fs-chev">›</span> : null}
                </button>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

// --- Küçük sunum bileşenleri ---
function AccordionCard({
  id,
  label,
  value,
  count,
  openKey,
  setOpenKey,
  children,
}: {
  id: string;
  label: string;
  value?: string;
  count?: number;
  openKey: string | null;
  setOpenKey: (k: string | null) => void;
  children: ReactNode;
}) {
  const isOpen = openKey === id;
  return (
    <div className="fs-card">
      <button
        type="button"
        className="fs-row"
        aria-expanded={isOpen}
        onClick={() => setOpenKey(isOpen ? null : id)}
      >
        <span className="fs-row-main">
          <span className="fs-row-label">{label}</span>
          {value ? <span className="fs-row-value">{value}</span> : null}
        </span>
        {count ? <span className="fs-count">{count}</span> : null}
        <span className={`fs-chev ${isOpen ? "open" : ""}`}>›</span>
      </button>
      {isOpen ? <div className="fs-panel-body">{children}</div> : null}
    </div>
  );
}

function Chips({
  options,
  value,
  onChange,
}: {
  options: string[];
  value?: string;
  onChange: (v?: string) => void;
}) {
  if (options.length === 0) return <p className="muted" style={{ margin: 0, fontSize: 14 }}>Seçenek yok.</p>;
  return (
    <div className="fs-chips">
      {options.map((o) => (
        <button
          type="button"
          key={o}
          className={`fs-chip ${value === o ? "on" : ""}`}
          onClick={() => onChange(value === o ? undefined : o)}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value?: T; label: string }[];
  value?: T;
  onChange: (v?: T) => void;
}) {
  return (
    <div className="fs-seg">
      {options.map((o, i) => (
        <button
          type="button"
          key={o.value ?? `_${i}`}
          className={value === o.value ? "on" : ""}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function CatDot({ id }: { id: string }) {
  const rootId = getCategoryPath(id)[0]?.id;
  const node = getCategory(id);
  return (
    <span className="fs-cat-dot" style={{ background: categoryVisual(rootId).color }} aria-hidden="true">
      {node?.icon ?? "📦"}
    </span>
  );
}

function priceLabel(min: string, max: string): string | undefined {
  const mn = min.trim();
  const mx = max.trim();
  if (!mn && !mx) return undefined;
  if (mn && mx) return `${nfmt.format(Number(mn))} – ${nfmt.format(Number(mx))} ₺`;
  if (mn) return `${nfmt.format(Number(mn))} ₺ ve üzeri`;
  return `${nfmt.format(Number(mx))} ₺ ve altı`;
}

const crumbStyle: React.CSSProperties = { cursor: "pointer", border: "1px solid var(--border)" };
