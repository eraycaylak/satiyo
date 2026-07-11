/**
 * AI moderasyon — Gemini ile ilan risk analizi (dolandırıcılık/sahtekârlık/yasak/şüpheli).
 * Kural-tabanlı inspectListing'in ÜZERİNE soft risk skoru ekler; bloklamaz, admin'e işaret eder.
 * İlan oluşturmada waitUntil ile arka planda çalışır (yanıtı geciktirmez).
 */
import type { Env } from "../env.js";
import { getGeminiKey } from "./settings.js";

const MODEL = "gemini-flash-latest";

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    riskScore: { type: "number" },
    flagged: { type: "boolean" },
    category: { type: "string", enum: ["temiz", "sahtekarlik", "yasak_urun", "spam", "supheli_fiyat", "iletisim_disari"] },
    reasons: { type: "array", items: { type: "string" } },
  },
  required: ["riskScore", "flagged", "category", "reasons"],
};

export async function moderateListingAI(
  env: Env,
  db: D1Database,
  listing: { id: string; title: string; description: string; price: number; categoryName?: string },
): Promise<void> {
  const key = await getGeminiKey(env, db);
  if (!key) return; // anahtar yoksa yalnız kural-tabanlı katman geçerli

  const prompt = `Sen bir Türkiye ikinci-el pazaryeri güvenlik moderatörüsün. Aşağıdaki ilanı DOLANDIRICILIK, SAHTEKÂRLIK, yasak/tehlikeli ürün, spam, şüpheli fiyat (piyasanın çok altı = tuzak), ve alıcıyı platform dışına çekme (WhatsApp/IBAN/kapora) açısından değerlendir.
- riskScore: 0 (temiz) - 100 (çok riskli) tam sayı.
- flagged: riskScore >= 60 ise true.
- category: en uygun tek kategori.
- reasons: kısa Türkçe gerekçeler (en fazla 4).
İlan:
Başlık: ${listing.title}
Açıklama: ${listing.description || "(yok)"}
Fiyat: ${Math.round(listing.price / 100)} TL
Kategori: ${listing.categoryName ?? "-"}`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", responseSchema: RESPONSE_SCHEMA, temperature: 0.2 },
      }),
    });
    if (!res.ok) return;
    const j = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = j.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return;
    const out = JSON.parse(text) as { riskScore?: number; flagged?: boolean; category?: string; reasons?: string[] };
    const score = Math.max(0, Math.min(100, Math.round(Number(out.riskScore ?? 0))));
    const flag = out.flagged || score >= 60 ? 1 : 0;
    await db
      .prepare(`UPDATE listings SET risk_score=?, risk_flag=?, risk_category=?, risk_reasons=? WHERE id=?`)
      .bind(score, flag, out.category ?? "temiz", JSON.stringify((out.reasons ?? []).slice(0, 4)), listing.id)
      .run();
  } catch {
    // moderasyon başarısızsa sessizce geç — ilan yayında kalır, admin manuel bakabilir
  }
}
