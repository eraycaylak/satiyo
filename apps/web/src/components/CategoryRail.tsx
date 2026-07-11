"use client";
import { getChildren, categoryVisual } from "@satiyo/shared";
import type { ReactNode } from "react";

/**
 * Anasayfa kategori rayı — mobildeki renkli ikon dilini web'e taşır.
 * Renkli app-ikon karesi + beyaz çizgi ikon (letgo/Dolap tarzı), yatay kaydırma.
 * Kütüphane yok: her kök için satır-içi SVG glyph.
 */

const STROKE = { fill: "none", stroke: "#fff", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const GLYPHS: Record<string, ReactNode> = {
  all: (<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>),
  elektronik: (<><rect x="6" y="6" width="12" height="12" rx="2" /><rect x="9.5" y="9.5" width="5" height="5" rx="1" /><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" /></>),
  "ev-yasam": (<><path d="M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3" /><rect x="2.5" y="11" width="19" height="6" rx="2.5" /><path d="M6 17v2.5M18 17v2.5" /></>),
  moda: (<path d="M15.5 3 20.5 6.5 17.5 10.5l-2-1.5V21h-7V9l-2 1.5L3.5 6.5 8.5 3a3.5 3.5 0 0 0 7 0z" />),
  vasita: (<><path d="M4.5 13l1.6-4.7A2 2 0 0 1 8 7h8a2 2 0 0 1 1.9 1.3L19.5 13" /><path d="M3 13h18v3.5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1V15H6.5v1.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" /><circle cx="7.5" cy="16" r=".6" /><circle cx="16.5" cy="16" r=".6" /></>),
  emlak: (<><path d="M4 21V9l8-5 8 5v12" /><path d="M3 21h18" /><path d="M9.5 21v-5h5v5" /><path d="M9 10.5h.01M15 10.5h.01" /></>),
  hobi: (<><rect x="2" y="6.5" width="20" height="11" rx="5.5" /><path d="M6.5 12h3M8 10.5v3" /><path d="M15 11h.01M17.5 13h.01" /></>),
  "spor-outdoor": (<><rect x="1.5" y="9" width="3" height="6" rx="1" /><rect x="19.5" y="9" width="3" height="6" rx="1" /><rect x="4.5" y="10" width="2.2" height="4" rx="1" /><rect x="17.3" y="10" width="2.2" height="4" rx="1" /><path d="M6.7 12h10.6" /></>),
  bebek: (<><path d="M9.5 3h5M10.5 3l-.4 2.5M13.5 3l.4 2.5" /><rect x="8" y="5.5" width="8" height="3.5" rx="1.2" /><path d="M9 9h6v9.5a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z" /><path d="M11 12h2M11 15h2" /></>),
  "is-sanayi": (<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3-3a6 6 0 0 1-7.9 7.9l-6.1 6.1a2.1 2.1 0 0 1-3-3l6.1-6.1a6 6 0 0 1 7.9-7.9l-3 3z" />),
  "hayvanlar-alemi": (<><circle cx="7" cy="8" r="1.6" /><circle cx="12" cy="6.2" r="1.6" /><circle cx="17" cy="8" r="1.6" /><circle cx="19.2" cy="12.8" r="1.4" /><path d="M12 11.5c-2.6 0-4.6 2-4.6 4.1 0 1.5 1 2.6 2.6 2.6.9 0 1.4-.3 2-.3s1.1.3 2 .3c1.6 0 2.6-1.1 2.6-2.6 0-2.1-2-4.1-4.6-4.1z" /></>),
};

function Glyph({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" {...STROKE} aria-hidden="true">
      {GLYPHS[id] ?? GLYPHS.all}
    </svg>
  );
}

interface CategoryRailProps {
  active?: string;
  onSelect: (id?: string) => void;
}

export function CategoryRail({ active, onSelect }: CategoryRailProps) {
  const roots = getChildren(null);

  const Tile = ({ id, label, color, on }: { id: string; label: string; color: string; on: boolean }) => (
    <button className={`cat-tile ${on ? "on" : ""}`} onClick={() => onSelect(id === "all" ? undefined : id)} type="button">
      <span className="cat-ic" style={{ background: color, boxShadow: on ? `0 0 0 2px var(--bg), 0 0 0 4px ${color}` : undefined }}>
        <Glyph id={id} />
      </span>
      <span className="cat-lbl">{label}</span>
    </button>
  );

  return (
    <div className="cat-rail" role="tablist" aria-label="Kategoriler">
      <Tile id="all" label="Tümü" color="var(--brand)" on={!active} />
      {roots.map((c) => (
        <Tile key={c.id} id={c.id} label={c.name} color={categoryVisual(c.id).color} on={active === c.id} />
      ))}
    </div>
  );
}
