import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import { Providers } from "@/lib/providers";
import { Chrome } from "@/components/Chrome";
import { Analytics } from "@/components/Analytics";
import { JsonLd } from "@/components/JsonLd";

const SITE_URL = "https://satiyo.app";

const ORGANIZATION_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Satıyo",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  description: "Reklamsız, yerel odaklı ikinci-el ilan ve alışveriş platformu.",
};
const WEBSITE_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Satıyo",
  url: SITE_URL,
  inLanguage: "tr-TR",
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/?q={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Satıyo — Evinde para var",
    template: "%s · Satıyo",
  },
  description:
    "Reklamsız, yerel odaklı ikinci-el ilan ve alışveriş platformu. Evinde para var.",
  applicationName: "Satıyo",
  keywords: [
    "ikinci el", "satılık", "ilan", "pazaryeri", "yerel", "reklamsız",
    "Satıyo", "sahibinden alternatifi", "letgo alternatifi", "evinde para var",
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
    title: "Satıyo — Evinde para var",
    description:
      "Reklamsız, yerel odaklı ikinci-el ilan ve alışveriş platformu.",
    images: [{ url: "/logo.png", width: 1200, height: 630, alt: "Satıyo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Satıyo — Evinde para var",
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
  verification: process.env.NEXT_PUBLIC_GSC_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GSC_VERIFICATION }
    : undefined,
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
        <JsonLd data={ORGANIZATION_LD} />
        <JsonLd data={WEBSITE_LD} />
        <Suspense fallback={null}>
          <Analytics />
        </Suspense>
        <Providers>
          <Chrome>{children}</Chrome>
        </Providers>
      </body>
    </html>
  );
}
