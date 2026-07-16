"use client";
import { Suspense, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { RefCapture } from "@/components/RefCapture";

/**
 * Site kabuğu. /admin komuta merkezi kendi tam-ekran düzenini kullanır;
 * global header/footer/container onda gizlenir.
 */
export function Chrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isFullBleed = pathname?.startsWith("/admin") ?? false;

  if (isFullBleed) return <>{children}</>;

  return (
    <>
      <RefCapture />
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
      <MobileNav />
    </>
  );
}
