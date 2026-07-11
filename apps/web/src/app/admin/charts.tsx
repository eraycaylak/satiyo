"use client";
// El-yapımı SVG grafikler — referans dashboard için (harici lib yok).

/** Alan (line+area) grafiği — İlan Performansı. */
export function AreaChart({ data, labels, color = "#f0434c", yMax }: {
  data: number[]; labels: string[]; color?: string; yMax?: number;
}) {
  const W = 720, H = 240, padL = 34, padR = 12, padT = 14, padB = 26;
  const n = Math.max(data.length, 2);
  const max = yMax ?? Math.max(5, Math.ceil(Math.max(...data, 1) / 10) * 10);
  const iw = W - padL - padR, ih = H - padT - padB;
  const x = (i: number) => padL + (iw * i) / (n - 1);
  const y = (v: number) => padT + ih - (ih * v) / max;
  const pts = data.map((v, i) => [x(i), y(v)] as const);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
  const area = `${line} L${x(n - 1)},${padT + ih} L${padL},${padT + ih} Z`;
  const ticks = 5;
  return (
    <div className="ad-chartwrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="ad-svg" preserveAspectRatio="xMidYMid meet" role="img" aria-label="İlan performansı grafiği">
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {Array.from({ length: ticks + 1 }).map((_, i) => {
          const gy = padT + (ih * i) / ticks;
          const val = Math.round(max - (max * i) / ticks);
          return (
            <g key={i}>
              <line x1={padL} y1={gy} x2={W - padR} y2={gy} stroke="var(--border)" strokeWidth="1" strokeDasharray="3 4" />
              <text x={padL - 8} y={gy + 4} textAnchor="end" className="ad-axis">{val}</text>
            </g>
          );
        })}
        <path d={area} fill="url(#areaFill)" />
        <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r="3.5" fill="#fff" stroke={color} strokeWidth="2.5" />
        ))}
        {labels.map((l, i) => (
          <text key={i} x={x(i)} y={H - 6} textAnchor="middle" className="ad-axis">{l}</text>
        ))}
      </svg>
    </div>
  );
}

export interface DonutSeg { value: number; color: string; label: string }

/** Donut grafiği — merkez metin overlay ile. */
export function Donut({ segments, center, centerSub, size = 190, thickness = 24 }: {
  segments: DonutSeg[]; center: string; centerSub?: string; size?: number; thickness?: number;
}) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  let offset = 0;
  return (
    <div className="ad-donut" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={thickness} />
          {segments.map((s, i) => {
            const len = (s.value / total) * c;
            const el = (
              <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color}
                strokeWidth={thickness} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} />
            );
            offset += len;
            return el;
          })}
        </g>
      </svg>
      <div className="ad-donut-center">
        <strong>{center}</strong>
        {centerSub && <span>{centerSub}</span>}
      </div>
    </div>
  );
}

/** Donut legend satırları. */
export function DonutLegend({ items }: { items: { label: string; value: number; color: string; pct?: number }[] }) {
  return (
    <div className="ad-legend">
      {items.map((it) => (
        <div key={it.label} className="ad-legend-row">
          <span className="dot" style={{ background: it.color }} />
          <span className="lbl">{it.label}</span>
          <span className="val">{it.value}</span>
          {it.pct != null && <span className="pct">(%{it.pct})</span>}
        </div>
      ))}
    </div>
  );
}

/** Yatay bar listesi — Popüler Kategoriler. */
export function HBars({ items }: { items: { label: string; value: number; icon?: string }[] }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="ad-hbars">
      {items.map((it) => (
        <div key={it.label} className="ad-hbar">
          {it.icon && <span className="ic">{it.icon}</span>}
          <span className="lbl">{it.label}</span>
          <span className="track"><span className="fill" style={{ width: `${(it.value / max) * 100}%` }} /></span>
          <span className="val">{it.value}</span>
        </div>
      ))}
    </div>
  );
}
