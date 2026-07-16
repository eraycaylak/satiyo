"use client";
import { useRef, useState } from "react";
import type { ListingImage } from "@satiyo/shared";

export function Gallery({ images, title }: { images: ListingImage[]; title: string }) {
  const [active, setActive] = useState(0);
  const railRef = useRef<HTMLDivElement>(null);

  if (images.length === 0) {
    return (
      <div className="card" style={{ aspectRatio: "4 / 3", display: "grid", placeItems: "center", fontSize: 64, opacity: 0.35 }}>
        🖼️
      </div>
    );
  }

  function onScroll() {
    const el = railRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== active) setActive(i);
  }

  function go(i: number) {
    const el = railRef.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
    setActive(i);
  }

  return (
    <div className="stack" style={{ gap: "var(--space-3)" }}>
      {/* Kaydırılabilir ana görsel şeridi (mobilde parmakla, masaüstünde tıkla) */}
      <div className="gal-rail" ref={railRef} onScroll={onScroll}>
        {images.map((img, i) => (
          <div className="gal-slide" key={img.id}>
            <img src={img.url} alt={i === 0 ? title : ""} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <>
          <div className="gal-dots" aria-hidden>
            {images.map((img, i) => (
              <span key={img.id} className={i === active ? "on" : ""} />
            ))}
          </div>
          <div className="row" style={{ gap: 8, overflowX: "auto" }}>
            {images.map((img, i) => (
              <button
                key={img.id}
                onClick={() => go(i)}
                aria-label={`Fotoğraf ${i + 1}`}
                style={{
                  width: 64, height: 64, borderRadius: "var(--radius-sm)", overflow: "hidden", flexShrink: 0,
                  border: `2px solid ${i === active ? "var(--brand)" : "transparent"}`, padding: 0, background: "var(--surface-2)",
                }}
              >
                <img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
