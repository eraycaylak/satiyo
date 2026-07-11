"use client";
import type { ReactNode } from "react";

// Inline SVG ikon seti (Feather tarzı, stroke=currentColor). Harici lib yok.
const P: Record<string, ReactNode> = {
  home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" /></>,
  users: <><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M16 5.2a3.2 3.2 0 0 1 0 6M17.5 20a5.5 5.5 0 0 0-2.2-4.4" /></>,
  tag: <><path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9Z" /><circle cx="7.5" cy="7.5" r="1.3" /></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  cart: <><path d="M4 4h2l2.2 11.4a1.5 1.5 0 0 0 1.5 1.2h7.7a1.5 1.5 0 0 0 1.5-1.2L21.5 8H6.5" /><circle cx="10" cy="20" r="1.3" /><circle cx="18" cy="20" r="1.3" /></>,
  star: <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8Z" />,
  barchart: <><path d="M4 20V10M9.3 20V4M14.6 20v-8M20 20V7" /></>,
  chat: <path d="M4 5h16v11H9l-4 3.5V16H4Z" />,
  alert: <><path d="M12 4l9 15.5H3Z" /><path d="M12 10v4M12 17h.01" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" /></>,
  sliders: <><path d="M4 8h10M18 8h2M4 16h2M10 16h10" /><circle cx="16" cy="8" r="2" /><circle cx="8" cy="16" r="2" /></>,
  layers: <><path d="M12 3 3 8l9 5 9-5Z" /><path d="M3 13l9 5 9-5M3 16.5l9 5 9-5" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.2-3.2" /></>,
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" /></>,
  heart: <path d="M12 20s-7-4.4-7-9.5A3.8 3.8 0 0 1 12 7a3.8 3.8 0 0 1 7 3.5C19 15.6 12 20 12 20Z" />,
  bell: <><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
  chevron: <path d="M6 9l6 6 6-6" />,
  calendar: <><rect x="3.5" y="5" width="17" height="16" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></>,
  file: <><path d="M6 3h8l4 4v14H6Z" /><path d="M14 3v4h4" /></>,
  eye: <><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" /><circle cx="12" cy="12" r="2.6" /></>,
  bag: <><path d="M6 8h12l-1 12H7Z" /><path d="M9 8a3 3 0 0 1 6 0" /></>,
  dollar: <><path d="M12 2v20" /><path d="M16.5 6.5A3.5 3.5 0 0 0 13 5h-2a3 3 0 0 0 0 6h2a3 3 0 0 1 0 6H9a3.5 3.5 0 0 1-3.5-1.5" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  userplus: <><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M18 8v6M15 11h6" /></>,
  folderplus: <><path d="M3 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /><path d="M12 11v5M9.5 13.5h5" /></>,
  edit: <><path d="M4 20h4L18.5 9.5a2 2 0 0 0-3-3L5 17Z" /><path d="M13.5 6.5l3 3" /></>,
  message: <path d="M4 5h16v11H9l-4 3.5V16H4Z" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M4 6.5 12 12l8-5.5" /></>,
  refresh: <><path d="M20 12a8 8 0 1 1-2.3-5.6" /><path d="M20 4v4h-4" /></>,
  dots: <><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></>,
  building: <><rect x="5" y="3" width="14" height="18" rx="1.5" /><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h6v6" /></>,
  apple: <path d="M16 13.5c0 2.5 2 3.5 2 3.5s-1.3 3-3 3c-1 0-1.5-.6-2.7-.6s-1.8.6-2.8.6c-1.8 0-3.7-3-3.7-6 0-3 2-4.5 3.8-4.5 1.1 0 1.9.7 2.6.7.6 0 1.6-.8 2.9-.7 1.4.1 2.3.7 2.9 1.6-2.5 1.5-2 4.9-.3 5.6Z" fill="currentColor" stroke="none" />,
  play: <path d="M6 4l13 8-13 8Z" fill="currentColor" stroke="none" />,
};

export function Icon({ name, size = 20, fill = false }: { name: string; size?: number; fill?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? "currentColor" : "none"}
      stroke="currentColor" strokeWidth={fill ? 0 : 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P[name] ?? P.grid}
    </svg>
  );
}
