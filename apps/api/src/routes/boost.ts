import { Hono } from "hono";
import { getBoostPackage, BOOST_PACKAGES } from "@satiyo/shared";
import type { Env, Variables } from "../env.js";
import { badRequest, fail, forbidden, notFound } from "../lib/http.js";
import { newId, now } from "../lib/id.js";
import { spendCredit, getBalance } from "../lib/credit.js";
import { requireAuth } from "../middleware/auth.js";

// Mount: /listings
export const boostRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

boostRoutes.get("/boost/packages", (c) => c.json(BOOST_PACKAGES));

boostRoutes.post("/:id/boost", requireAuth, async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");
  const { packageId } = (await c.req.json().catch(() => ({}))) as { packageId?: string };
  const pkg = packageId ? getBoostPackage(packageId) : undefined;
  if (!pkg) badRequest("Geçersiz boost paketi");

  const listing = await c.env.DB.prepare(`SELECT seller_id, status, boosted_until FROM listings WHERE id = ?`).bind(id).first();
  if (!listing) notFound("İlan bulunamadı");
  if (listing!.seller_id !== user.id) forbidden("Bu ilan sizin değil");
  if (listing!.status !== "active") badRequest("Sadece aktif ilan öne çıkarılabilir");

  // Krediyle öde (kredi tek para birimi; IAP/iyzico ile yüklenir). Yetersizse 402 + bakiye.
  const ts = now();
  const spendKey = `boost:${id}:${ts}`;
  const paid = await spendCredit(c.env.DB, user.id, pkg!.price, spendKey, { type: "boost", id });
  if (!paid) {
    const balance = await getBalance(c.env.DB, user.id);
    fail(402, "insufficient_credit", `Yetersiz kredi. Gereken: ${pkg!.price / 100} ₺, bakiye: ${balance / 100} ₺`);
  }

  // Mevcut boost'un üstüne ekle (kalan süreye)
  const base = Math.max(ts, (listing!.boosted_until as number) ?? 0);
  const boostedUntil = base + pkg!.days * 86_400_000;

  await c.env.DB.batch([
    c.env.DB.prepare(`INSERT INTO boosts (id, listing_id, package, amount, starts_at, ends_at, payment_id) VALUES (?,?,?,?,?,?,?)`)
      .bind(newId("bst"), id, pkg!.id, pkg!.price, ts, boostedUntil, null),
    c.env.DB.prepare(`UPDATE listings SET boosted_until = ?, updated_at = ? WHERE id = ?`).bind(boostedUntil, ts, id),
  ]);

  const balance = await getBalance(c.env.DB, user.id);
  return c.json({ ok: true as const, boostedUntil, urgentBadge: pkg!.urgentBadge, balance });
});
