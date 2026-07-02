import type { MetadataRoute } from "next";

const SITE_URL = "https://satiyo.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Özel/işlevsel sayfaları dizinleme dışı tut
        disallow: ["/admin", "/mesajlar", "/bildirimler", "/favoriler", "/profil", "/ilan-ver", "/giris"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
