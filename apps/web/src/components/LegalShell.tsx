import Link from "next/link";

export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <article style={{ maxWidth: 760, margin: "0 auto", lineHeight: 1.7 }}>
      <nav className="footer-links muted" style={{ fontSize: 13, marginBottom: 12 }}>
        <Link href="/gizlilik">Gizlilik</Link>
        <Link href="/kosullar">Kullanım Koşulları</Link>
        <Link href="/kvkk">KVKK Aydınlatma</Link>
      </nav>
      <h1 style={{ fontSize: 30, marginBottom: 4 }}>{title}</h1>
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>Son güncelleme: {updated}</p>
      <div className="legal-body">{children}</div>
      <p className="muted" style={{ fontSize: 13, marginTop: 32, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
        Sorularınız için: <a href="mailto:destek@satiyo.app">destek@satiyo.app</a>
      </p>
    </article>
  );
}
