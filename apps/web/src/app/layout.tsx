import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import { Providers } from "@/lib/providers";
import { Header } from "@/components/Header";

const SITE_URL = "https://satiyo.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Satıyo — Komşundan al, komşuna sat",
    template: "%s · Satıyo",
  },
  description:
    "Reklamsız, yerel odaklı ikinci-el ilan ve alışveriş platformu. Komşundan al, komşuna sat.",
  applicationName: "Satıyo",
  keywords: [
    "ikinci el", "satılık", "ilan", "pazaryeri", "yerel", "reklamsız",
    "Satıyo", "sahibinden alternatifi", "letgo alternatifi", "komşundan al",
  ],
  authors: [{ name: "Satıyo" }],
  creator: "Satıyo",
  publisher: "Satıyo",
  manifest: "/manifest.webmanifest",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: SITE_URL,
    siteName: "Satıyo",
    title: "Satıyo — Komşundan al, komşuna sat",
    description:
      "Reklamsız, yerel odaklı ikinci-el ilan ve alışveriş platformu.",
    images: [{ url: "/logo.png", width: 1200, height: 630, alt: "Satıyo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Satıyo — Komşundan al, komşuna sat",
    description: "Reklamsız, yerel odaklı ikinci-el ilan ve alışveriş platformu.",
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f0434c" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1117" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

// Tema FOUC önleme — paint öncesi data-theme uygula
const themeScript = `(function(){try{var t=localStorage.getItem('satiyo_theme')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>
          <Suspense fallback={<div style={{ height: "var(--header-h)" }} />}>
            <Header />
          </Suspense>
          <main className="container" style={{ paddingTop: "var(--space-5)", paddingBottom: "var(--space-8)", minHeight: "70vh" }}>
            {children}
          </main>
          <footer style={{ borderTop: "1px solid var(--border)", padding: "var(--space-5) 0", marginTop: "var(--space-8)" }}>
            <div className="container spread muted" style={{ fontSize: 13, flexWrap: "wrap", gap: 12 }}>
              <span>© Satıyo — Reklamsız ikinci-el pazaryeri</span>
              <nav className="footer-links">
                <a href="/gizlilik">Gizlilik</a>
                <a href="/kosullar">Kullanım Koşulları</a>
                <a href="/kvkk">KVKK</a>
              </nav>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
