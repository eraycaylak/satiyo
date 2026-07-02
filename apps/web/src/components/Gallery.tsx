"use client";
import { useState } from "react";
import type { ListingImage } from "@satiyo/shared";

export function Gallery({ images, title }: { images: ListingImage[]; title: string }) {
  const [active, setActive] = useState(0);
  if (images.length === 0) {
    return (
      <div className="card" style={{ aspectRatio: "4 / 3", display: "grid", placeItems: "center", fontSize: 64, opacity: 0.35 }}>
        🖼️
      </div>
    );
  }
  return (
    <div className="stack" style={{ gap: "var(--space-3)" }}>
      <div className="card" style={{ aspectRatio: "4 / 3", overflow: "hidden", background: "var(--surface-2)" }}>
        <img src={images[active]!.url} alt={title} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      </div>
      {images.length > 1 && (
        <div className="row" style={{ gap: 8, overflowX: "auto" }}>
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setActive(i)}
              style={{
                width: 64, height: 64, borderRadius: "var(--radius-sm)", overflow: "hidden", flexShrink: 0,
                border: `2px solid ${i === active ? "var(--brand)" : "transparent"}`, padding: 0, background: "var(--surface-2)",
              }}
            >
              <img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
