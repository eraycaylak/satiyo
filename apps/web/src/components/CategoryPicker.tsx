"use client";
import { useMemo, useState } from "react";
import { getChildren, getCategory, getCategoryPath, rootCategories, leafCategories, categoryVisual, foldTr } from "@satiyo/shared";

/** Çok-seviyeli kategori seçici — breadcrumb + drill-down + arama. Yaprak seçilince onSelect. */
export function CategoryPicker({ value, onSelect }: { value: string; onSelect: (id: string) => void }) {
  const [level, setLevel] = useState<string | null>(null); // mevcut seviye parentId (null = kökler)
  const [q, setQ] = useState("");

  const selected = value ? getCategory(value) : undefined;
  const selectedPath = value ? getCategoryPath(value) : [];

  const children = getChildren(level);
  const parentPath = level ? getCategoryPath(level) : [];

  const searchResults = useMemo(() => {
    const t = foldTr(q.trim());
    if (!t) return [];
    return leafCategories()
      .filter((c) => foldTr(c.name).includes(t) || (getCategory(c.parentId ?? "")?.name && foldTr(getCategory(c.parentId ?? "")!.name).includes(t)))
      .slice(0, 30);
  }, [q]);

  function pick(id: string) {
    const kids = getChildren(id);
    if (kids.length === 0) { onSelect(id); setLevel(null); setQ(""); }
    else setLevel(id);
  }

  // Seçili + arama yokken kompakt özet göster
  if (selected && !q && level === null) {
    return (
      <div className="card" style={{ padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
          <RootDot id={selectedPath[0]?.id} />
          {selectedPath.map((c) => c.name).join(" › ")}
        </span>
        <button className="btn btn-ghost" style={{ padding: "6px 12px" }} onClick={() => setLevel(selected.parentId ?? null)}>Değiştir</button>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      <input className="input" placeholder="Kategori ara (ör. telefon, koltuk, bmw)" value={q} onChange={(e) => setQ(e.target.value)} />

      {q ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 320, overflowY: "auto" }}>
          {searchResults.length === 0 ? <p className="muted" style={{ padding: 8 }}>Sonuç yok.</p> :
            searchResults.map((c) => (
              <button key={c.id} className="row" style={rowStyle} onClick={() => { onSelect(c.id); setQ(""); }}>
                <RootDot id={getCategoryPath(c.id)[0]?.id} />
                <span style={{ fontWeight: 600 }}>{c.name}</span>
                <span className="muted" style={{ fontSize: 12, marginLeft: "auto" }}>{getCategoryPath(c.id).slice(0, -1).map((p) => p.name).join(" › ")}</span>
              </button>
            ))}
        </div>
      ) : (
        <>
          <div className="row" style={{ gap: 4, flexWrap: "wrap", fontSize: 13 }}>
            <button className="badge" style={crumbStyle} onClick={() => setLevel(null)}>Tümü</button>
            {parentPath.map((c) => (
              <span key={c.id} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span className="muted">›</span>
                <button className="badge" style={crumbStyle} onClick={() => setLevel(c.id)}>{c.name}</button>
              </span>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px,1fr))", gap: 8, maxHeight: 340, overflowY: "auto" }}>
            {(level === null ? rootCategories() : children).map((c) => {
              const hasKids = getChildren(c.id).length > 0;
              return (
                <button key={c.id} className="row" style={rowStyle} onClick={() => pick(c.id)}>
                  {c.parentId === null ? <RootDot id={c.id} /> : <span style={{ fontSize: 18 }}>{c.icon}</span>}
                  <span style={{ fontWeight: 600 }}>{c.name}</span>
                  {hasKids && <span className="muted" style={{ marginLeft: "auto" }}>›</span>}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function RootDot({ id }: { id?: string }) {
  const v = categoryVisual(id);
  const emoji = id ? getCategory(id)?.icon : undefined;
  return <span style={{ width: 26, height: 26, borderRadius: 8, background: v.color, display: "grid", placeItems: "center", fontSize: 14, flexShrink: 0 }}>{emoji ?? "📦"}</span>;
}

const rowStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", border: "1px solid var(--border)", borderRadius: 10, background: "var(--surface)", cursor: "pointer", textAlign: "left", width: "100%" };
const crumbStyle: React.CSSProperties = { cursor: "pointer", border: "1px solid var(--border)" };
