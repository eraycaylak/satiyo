// Semver karşılaştırma — zorunlu güncelleme kapısı (C2) için saf yardımcı.

/** "1.2.3" → [1,2,3]. Eksik/bozuk parçalar 0. */
function parse(v: string): [number, number, number] {
  const parts = String(v ?? "").trim().split(".");
  const num = (s: string | undefined) => {
    const n = parseInt((s ?? "").replace(/[^0-9].*$/, ""), 10);
    return Number.isFinite(n) ? n : 0;
  };
  return [num(parts[0]), num(parts[1]), num(parts[2])];
}

/**
 * a<b → -1, a==b → 0, a>b → 1.
 * Sadece major.minor.patch; ön-sürüm etiketleri yok sayılır.
 */
export function compareSemver(a: string, b: string): -1 | 0 | 1 {
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < 3; i++) {
    if (pa[i]! < pb[i]!) return -1;
    if (pa[i]! > pb[i]!) return 1;
  }
  return 0;
}

/** current, min'in altındaysa true (güncelleme zorunlu). */
export function isUpdateRequired(current: string, min: string | null | undefined): boolean {
  if (!min) return false;
  return compareSemver(current, min) < 0;
}
