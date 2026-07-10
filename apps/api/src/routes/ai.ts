import { Hono } from "hono";
import { CATEGORIES } from "@satiyo/shared";
import type { Env, Variables } from "../env.js";
import { badRequest, fail } from "../lib/http.js";
import { requireAuth } from "../middleware/auth.js";

export const aiRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

const MODEL = "gemini-flash-latest";

// Yaprak kategoriler (alt kategorisi olmayan) — bir ilan bunlardan birine düşer.
function leafCategories(): { id: string; name: string }[] {
  const parentIds = new Set(CATEGORIES.map((c) => c.parentId).filter(Boolean) as string[]);
  return CATEGORIES.filter((c) => !parentIds.has(c.id)).map((c) => ({ id: c.id, name: c.name }));
}

async function urlToInline(url: string): Promise<{ mimeType: string; data: string }> {
  const r = await fetch(url, { headers: { "User-Agent": "SatiyoBot/1.0 (+https://satiyo.app)", Accept: "image/*" } });
  if (!r.ok) throw new Error("foto indirilemedi");
  const mimeType = r.headers.get("content-type") || "image/jpeg";
  const bytes = new Uint8Array(await r.arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return { mimeType, data: btoa(bin) };
}

// POST /ai/suggest-listing — foto → başlık/kategori/fiyat/açıklama önerisi (Gemini Vision)
aiRoutes.post("/suggest-listing", requireAuth, async (c) => {
  if (!c.env.GEMINI_API_KEY) fail(500, "ai_disabled", "AI şu an kullanılamıyor");
  const body = (await c.req.json().catch(() => ({}))) as { imageUrl?: string; imageBase64?: string; mimeType?: string };

  let inline: { mimeType: string; data: string } | null = null;
  if (body.imageBase64) {
    inline = { mimeType: body.mimeType || "image/jpeg", data: body.imageBase64 };
  } else if (body.imageUrl) {
    try { inline = await urlToInline(body.imageUrl); } catch { badRequest("Fotoğraf okunamadı"); }
  }
  if (!inline) badRequest("imageUrl veya imageBase64 gerekli");

  // Günlük kota (maliyet + kötüye kullanım koruması)
  const user = c.get("user");
  const DAILY_LIMIT = 30;
  const day = new Date().toISOString().slice(0, 10);
  const usage = await c.env.DB.prepare(`SELECT count FROM ai_usage WHERE user_id = ? AND day = ?`).bind(user.id, day).first();
  if (usage && Number(usage.count) >= DAILY_LIMIT) {
    fail(429, "ai_quota", `Günlük AI ilan oluşturma hakkın doldu (${DAILY_LIMIT}/gün). Yarın tekrar deneyebilirsin.`);
  }
  // Gemini'ye gitmeden önce say (başarısız denemeler de sayılır → retry-spam engeli)
  await c.env.DB.prepare(
    `INSERT INTO ai_usage (user_id, day, count) VALUES (?, ?, 1) ON CONFLICT(user_id, day) DO UPDATE SET count = count + 1`,
  ).bind(user.id, day).run();

  const cats = leafCategories();
  const prompt = `Bu ikinci-el ürün fotoğrafını incele ve Türkiye ikinci-el pazaryeri için ilan önerisi üret.
- title: kısa, net Türkçe başlık (marka/model görünüyorsa yaz), en fazla 60 karakter.
- categoryId: SADECE şu listeden en uygun id (birebir): ${JSON.stringify(cats)}
- priceTRY: Türkiye ikinci-el piyasasına göre makul TL fiyat tahmini (tam sayı, sadece TL).
- description: 1-2 cümlelik Türkçe açıklama.
- condition: "new" veya "used".`;

  const responseSchema = {
    type: "object",
    properties: {
      title: { type: "string" },
      categoryId: { type: "string" },
      priceTRY: { type: "number" },
      description: { type: "string" },
      condition: { type: "string", enum: ["new", "used"] },
    },
    required: ["title", "categoryId", "priceTRY", "description", "condition"],
  };

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-goog-api-key": c.env.GEMINI_API_KEY! },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }, { inlineData: inline! }] }],
      generationConfig: { responseMimeType: "application/json", responseSchema, temperature: 0.4 },
    }),
  });
  if (!res.ok) fail(500, "ai_upstream", "AI servisi yanıt vermedi");
  const j = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = j.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) fail(500, "ai_empty", "AI boş yanıt döndü");

  let out: { title?: string; categoryId?: string; priceTRY?: number; description?: string; condition?: string };
  try { out = JSON.parse(text!); } catch { return fail(500, "ai_parse", "AI yanıtı çözümlenemedi"); }

  const validCategory = cats.some((x) => x.id === out.categoryId) ? out.categoryId! : null;
  return c.json({
    title: (out.title ?? "").slice(0, 60),
    categoryId: validCategory,
    price: Math.max(0, Math.round((out.priceTRY ?? 0) * 100)), // kuruş
    description: out.description ?? "",
    condition: out.condition === "new" ? "new" : "used",
  });
});
