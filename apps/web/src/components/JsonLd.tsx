// Schema.org JSON-LD — SEO/rich results/reklam için yapılandırılmış veri.
// type="application/ld+json" çalıştırılabilir JS değildir; CSP script-src'yi tetiklemez.
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
