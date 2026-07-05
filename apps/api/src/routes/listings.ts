import { Hono } from "hono";
import {
  buildFtsQuery,
  createListingSchema,
  CATEGORIES,
  DEFAULT_SYNONYMS,
  foldTr,
  getCategory,
  searchQuerySchema,
  updateListingSchema,
} from "@satiyo/shared";
import type { Env, Variables } from "../env.js";
import { badRequest, forbidden, notFound } from "../lib/http.js";
import { newId, now } from "../lib/id.js";
import { hydrateListings, rowToListing } from "../lib/db.js";
import { areBlocked } from "../lib/blocks.js";
import { inspectListing } from "../lib/safety.js";
import { listingMatchesQuery, type SavedQuery } from "../lib/match.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";

/** Yeni ilan, kaydedilen aramalara uyuyorsa bildirim üretir (best-effort). */
async function notifySavedSearches(
  db: D1Database,
  listingId: string,
  sellerId: string,
  l: { title: string; description: string; categoryId: string; price: number; city: string | null; condition: string; attributesText: string },
): Promise<void> {
  const savers = await db.prepare(`SELECT id, user_id, query_json FROM saved_searches WHERE notify = 1 LIMIT 500`).all();
  const stmts: D1PreparedStatement[] = [];
  const ts = now();
  for (const row of savers.results as Record<string, unknown>[]) {
    if (row.user_id === sellerId) continue;
    let q: SavedQuery;
    try { q = JSON.parse(row.query_json as string); } catch { continue; }
    if (!listingMatchesQuery(q, l)) continue;
    stmts.push(
      db.prepare(
        `INSERT INTO notifications (id, user_id, type, title, body, data, created_at) VALUES (?,?, 'saved_search', ?, ?, ?, ?)`,
      ).bind(newId("ntf"), row.user_id as string, "Aradığın ürün yayında!", l.title, JSON.stringify({ listingId }), ts),
    );
  }
  if (stmts.length) await db.batch(stmts);
}

export const listingRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

/** Bir kategori ve tüm alt kategorilerinin id'lerini döner. */
function categoryWithDescendants(id: string): string[] {
  const out = [id];
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const c of CATEGORIES) if (c.parentId === cur) { out.push(c.id); stack.push(c.id); }
  }
  return out;
}

/** Arama gövdesi: kategori adı + öznitelik değerleri (folded). */
function buildSearchBody(categoryId: string, attributes: Record<string, string>, description: string): string {
  const cat = getCategory(categoryId);
  const parts = [cat?.name ?? "", ...Object.values(attributes), description];
  return foldTr(parts.join(" "));
}

// ============ GET /listings — arama + filtre + sayfalama ============
listingRoutes.get("/", optionalAuth, async (c) => {
  const parsed = searchQuerySchema.safeParse(c.req.query());
  if (!parsed.success) badRequest("Geçersiz arama", parsed.error.flatten());
  const f = parsed.data!;
  const ts = now();

  const where: string[] = ["l.status = 'active'"];
  const binds: unknown[] = [];
  let from = "FROM listings l";
  const hasQuery = !!f.q && f.q.trim().length > 0;

  if (hasQuery) {
    // Koddaki varsayılan synonym'lerle admin'in eklediklerini birleştir
    const dict: Record<string, string[]> = { ...DEFAULT_SYNONYMS };
    try {
      const synRows = await c.env.DB.prepare(`SELECT term, aliases FROM synonyms`).all();
      for (const r of synRows.results as Record<string, unknown>[]) {
        dict[r.term as string] = (r.aliases as string).split(",").filter(Boolean);
      }
    } catch { /* synonyms tablosu yoksa varsayılanlarla devam */ }
    const ftsQuery = buildFtsQuery(f.q!, dict);
    if (ftsQuery) {
      from += " JOIN listings_fts ft ON ft.listing_id = l.id";
      where.push("listings_fts MATCH ?");
      binds.push(ftsQuery);
    }
  }

  if (f.categoryId) {
    const ids = categoryWithDescendants(f.categoryId);
    where.push(`l.category_id IN (${ids.map(() => "?").join(",")})`);
    binds.push(...ids);
  }
  if (f.minPrice != null) { where.push("l.price >= ?"); binds.push(f.minPrice); }
  if (f.maxPrice != null) { where.push("l.price <= ?"); binds.push(f.maxPrice); }
  if (f.city) { where.push("l.city = ?"); binds.push(f.city); }
  if (f.district) { where.push("l.district = ?"); binds.push(f.district); }
  if (f.condition) { where.push("l.condition = ?"); binds.push(f.condition); }
  if (f.withImageOnly) where.push("EXISTS (SELECT 1 FROM listing_images li WHERE li.listing_id = l.id)");
  if (f.sellerType) {
    from += " JOIN users su ON su.id = l.seller_id";
    where.push("su.is_store = ?");
    binds.push(f.sellerType === "store" ? 1 : 0);
  }

  // Engellenen/engelleyen kullanıcıların ilanları feed'den anında gizlenir (App Store Guideline 1.2)
  const viewer = c.get("user");
  if (viewer) {
    where.push("l.seller_id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ? UNION SELECT blocker_id FROM blocks WHERE blocked_id = ?)");
    binds.push(viewer.id, viewer.id);
  }

  const whereSql = where.join(" AND ");

  // Sıralama — boost her zaman öne (relevance/newest'te)
  const boostKey = "(CASE WHEN l.boosted_until IS NOT NULL AND l.boosted_until > ? THEN 0 ELSE 1 END)";
  let orderBy: string;
  const orderBinds: unknown[] = [];
  switch (f.sort) {
    case "price_asc": orderBy = "l.price ASC, l.created_at DESC"; break;
    case "price_desc": orderBy = "l.price DESC, l.created_at DESC"; break;
    case "newest": orderBy = `${boostKey}, l.created_at DESC`; orderBinds.push(ts); break;
    case "nearest":
      if (f.lat != null && f.lng != null) {
        orderBy = "((l.lat - ?) * (l.lat - ?) + (l.lng - ?) * (l.lng - ?)) ASC, l.created_at DESC";
        orderBinds.push(f.lat, f.lat, f.lng, f.lng);
      } else { orderBy = "l.created_at DESC"; }
      break;
    case "relevance":
    default:
      if (hasQuery) { orderBy = `${boostKey}, bm25(listings_fts, 10.0, 2.0) ASC`; orderBinds.push(ts); }
      else { orderBy = `${boostKey}, l.created_at DESC`; orderBinds.push(ts); }
  }

  const offset = (f.page - 1) * f.pageSize;

  const countRow = await c.env.DB.prepare(`SELECT COUNT(*) AS n ${from} WHERE ${whereSql}`)
    .bind(...binds)
    .first();
  const total = (countRow?.n as number) ?? 0;

  const rows = await c.env.DB.prepare(
    `SELECT l.* ${from} WHERE ${whereSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
  )
    .bind(...binds, ...orderBinds, f.pageSize, offset)
    .all();

  let listings = (rows.results as Record<string, unknown>[]).map(rowToListing);
  const user = c.get("user");
  listings = await hydrateListings(c.env.DB, listings, {
    withSeller: true,
    favoriteUserId: user?.id ?? null,
  });

  return c.json({
    items: listings,
    page: f.page,
    pageSize: f.pageSize,
    total,
    hasMore: offset + listings.length < total,
  });
});

// ============ GET /listings/:id — detay ============
listingRoutes.get("/:id", optionalAuth, async (c) => {
  const id = c.req.param("id");
  const row = await c.env.DB.prepare(`SELECT * FROM listings WHERE id = ?`).bind(id).first();
  if (!row || row.status === "removed") notFound("İlan bulunamadı");

  // Görüntülenme sayacı (sahibi hariç)
  const user = c.get("user");
  // Engellenen kullanıcının ilanı görüntülenemez (App Store Guideline 1.2)
  if (user && user.id !== row!.seller_id && (await areBlocked(c.env.DB, user.id, row!.seller_id as string))) {
    notFound("İlan bulunamadı");
  }
  if (!user || user.id !== row!.seller_id) {
    await c.env.DB.prepare(`UPDATE listings SET view_count = view_count + 1 WHERE id = ?`).bind(id).run();
  }

  const [listing] = await hydrateListings(c.env.DB, [rowToListing(row as Record<string, unknown>)], {
    withSeller: true,
    favoriteUserId: user?.id ?? null,
  });
  return c.json(listing);
});

// ============ POST /listings — oluştur ============
listingRoutes.post("/", requireAuth, async (c) => {
  const parsed = createListingSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) badRequest("İlan geçersiz", parsed.error.flatten());
  const input = parsed.data!;
  const user = c.get("user");

  if (!getCategory(input.categoryId)) badRequest("Geçersiz kategori");

  const flag = inspectListing(input.title, input.description);
  if (flag.flagged) badRequest("İçerik yasaklı ürün kalıbı içeriyor", { reasons: flag.reasons });

  const id = newId("lst");
  const ts = now();
  const searchBody = buildSearchBody(input.categoryId, input.attributes, input.description);

  const statements: D1PreparedStatement[] = [
    c.env.DB.prepare(
      `INSERT INTO listings (id, seller_id, title, description, category_id, price, price_type, condition, city, district, lat, lng, status, view_count, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?)`,
    ).bind(
      id, user.id, input.title, input.description, input.categoryId, input.price,
      input.priceType, input.condition, input.city ?? null, input.district ?? null,
      input.lat ?? null, input.lng ?? null, input.status, ts, ts,
    ),
    c.env.DB.prepare(`INSERT INTO listings_fts (listing_id, title, body) VALUES (?, ?, ?)`)
      .bind(id, foldTr(input.title), searchBody),
  ];

  for (const [key, value] of Object.entries(input.attributes)) {
    statements.push(
      c.env.DB.prepare(`INSERT INTO listing_attributes (listing_id, key, value) VALUES (?, ?, ?)`).bind(id, key, value),
    );
  }
  // Görselleri bu ilana bağla (sahiplik: yükleyen kullanıcı zaten kendisi)
  input.imageIds.forEach((imgId, i) => {
    statements.push(
      c.env.DB.prepare(`UPDATE listing_images SET listing_id = ?, position = ? WHERE id = ?`).bind(id, i, imgId),
    );
  });

  await c.env.DB.batch(statements);

  // Yayınlanan ilan için kaydedilen arama bildirimleri (taslak değilse)
  if (input.status === "active") {
    await notifySavedSearches(c.env.DB, id, user.id, {
      title: input.title, description: input.description, categoryId: input.categoryId,
      price: input.price, city: input.city ?? null, condition: input.condition,
      attributesText: Object.values(input.attributes).join(" "),
    });
  }

  const row = await c.env.DB.prepare(`SELECT * FROM listings WHERE id = ?`).bind(id).first();
  const [listing] = await hydrateListings(c.env.DB, [rowToListing(row as Record<string, unknown>)], { withSeller: true });
  return c.json(listing, 201);
});

// ============ PATCH /listings/:id — güncelle ============
listingRoutes.patch("/:id", requireAuth, async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");
  const row = await c.env.DB.prepare(`SELECT * FROM listings WHERE id = ?`).bind(id).first();
  if (!row) notFound("İlan bulunamadı");
  if (row!.seller_id !== user.id) forbidden("Bu ilan sizin değil");

  const parsed = updateListingSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) badRequest("Güncelleme geçersiz", parsed.error.flatten());
  const input = parsed.data!;

  const fields: string[] = [];
  const binds: unknown[] = [];
  const map: Record<string, unknown> = {
    title: input.title, description: input.description, category_id: input.categoryId,
    price: input.price, price_type: input.priceType, condition: input.condition,
    city: input.city, district: input.district, status: input.status,
  };
  for (const [col, val] of Object.entries(map)) {
    if (val !== undefined) { fields.push(`${col} = ?`); binds.push(val); }
  }
  fields.push("updated_at = ?"); binds.push(now());

  await c.env.DB.prepare(`UPDATE listings SET ${fields.join(", ")} WHERE id = ?`).bind(...binds, id).run();

  // FTS ve öznitelikleri tazele (başlık/açıklama/kategori/attr değiştiyse)
  const merged = {
    title: (input.title ?? row!.title) as string,
    categoryId: (input.categoryId ?? row!.category_id) as string,
    description: (input.description ?? row!.description) as string,
  };
  if (input.attributes) {
    await c.env.DB.prepare(`DELETE FROM listing_attributes WHERE listing_id = ?`).bind(id).run();
    const stmts = Object.entries(input.attributes).map(([k, v]) =>
      c.env.DB.prepare(`INSERT INTO listing_attributes (listing_id, key, value) VALUES (?, ?, ?)`).bind(id, k, v),
    );
    if (stmts.length) await c.env.DB.batch(stmts);
  }
  const attrsRows = await c.env.DB.prepare(`SELECT key, value FROM listing_attributes WHERE listing_id = ?`).bind(id).all();
  const attrs: Record<string, string> = {};
  for (const r of attrsRows.results as Record<string, unknown>[]) attrs[r.key as string] = r.value as string;
  await c.env.DB.batch([
    c.env.DB.prepare(`DELETE FROM listings_fts WHERE listing_id = ?`).bind(id),
    c.env.DB.prepare(`INSERT INTO listings_fts (listing_id, title, body) VALUES (?, ?, ?)`)
      .bind(id, foldTr(merged.title), buildSearchBody(merged.categoryId, attrs, merged.description)),
  ]);

  const updated = await c.env.DB.prepare(`SELECT * FROM listings WHERE id = ?`).bind(id).first();
  const [listing] = await hydrateListings(c.env.DB, [rowToListing(updated as Record<string, unknown>)], { withSeller: true });
  return c.json(listing);
});

// ============ DELETE /listings/:id ============
listingRoutes.delete("/:id", requireAuth, async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");
  const row = await c.env.DB.prepare(`SELECT seller_id FROM listings WHERE id = ?`).bind(id).first();
  if (!row) notFound("İlan bulunamadı");
  if (row!.seller_id !== user.id) forbidden("Bu ilan sizin değil");

  await c.env.DB.batch([
    c.env.DB.prepare(`UPDATE listings SET status = 'removed', updated_at = ? WHERE id = ?`).bind(now(), id),
    c.env.DB.prepare(`DELETE FROM listings_fts WHERE listing_id = ?`).bind(id),
  ]);
  return c.json({ ok: true as const });
});
