/** Dolandırıcılık / spam kalıbı tespiti — mesajlarda uyarı tetikler. */

const IBAN_RE = /\bTR\d{2}[\s]?(\d{4}[\s]?){5}\d{2}\b/i;
const URL_RE = /\b(?:https?:\/\/|www\.)\S+/i;
const SCAM_PHRASES = [
  "kapora",
  "önce para",
  "once para",
  "kargoyla gönder",
  "kargoyla gonder",
  "kargo ile gönder",
  "western union",
  "papara",
  "havale yap",
];

export interface SafetyFlag {
  flagged: boolean;
  reasons: string[];
}

export function inspectMessage(body: string | null | undefined): SafetyFlag {
  const reasons: string[] = [];
  if (!body) return { flagged: false, reasons };
  const lower = body.toLocaleLowerCase("tr-TR");
  if (IBAN_RE.test(body)) reasons.push("iban");
  if (URL_RE.test(body)) reasons.push("link");
  for (const p of SCAM_PHRASES) if (lower.includes(p)) reasons.push("scam_phrase");
  return { flagged: reasons.length > 0, reasons: [...new Set(reasons)] };
}

const BANNED_LISTING_TERMS = [
  "silah",
  "tabanca",
  "uyuşturucu",
  "uyusturucu",
  "sahte para",
  "organ",
  "reçeteli ilaç",
  "receteli ilac",
];

/** İlan içeriğinde yasaklı ürün kalıbı var mı? (otomatik moderasyon ön-tarama) */
export function inspectListing(title: string, description: string): SafetyFlag {
  const text = `${title} ${description}`.toLocaleLowerCase("tr-TR");
  const reasons = BANNED_LISTING_TERMS.filter((t) => text.includes(t));
  return { flagged: reasons.length > 0, reasons };
}
