import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Satıyo — Komşundan al, komşuna sat",
    short_name: "Satıyo",
    description: "Reklamsız, yerel odaklı ikinci-el ilan ve alışveriş platformu.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#f0434c",
    lang: "tr-TR",
    categories: ["shopping", "lifestyle", "business"],
    icons: [
      { src: "/icon.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
