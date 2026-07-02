import { Hono } from "hono";
import { offerActionSchema, sendMessageSchema, startConversationSchema } from "@satiyo/shared";
import type { Env, Variables } from "../env.js";
import { badRequest, conflict, forbidden, notFound } from "../lib/http.js";
import { newId, now } from "../lib/id.js";
import { rowToMessage } from "../lib/db.js";
import { areBlocked } from "../lib/blocks.js";
import { inspectMessage } from "../lib/safety.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { verifyJwt } from "../lib/crypto.js";

export const conversationRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

async function loadConversation(env: Env, id: string) {
  return env.DB.prepare(`SELECT * FROM conversations WHERE id = ?`).bind(id).first();
}

function assertMember(conv: Record<string, unknown>, userId: string) {
  if (conv.buyer_id !== userId && conv.seller_id !== userId) forbidden("Bu konuşma sizin değil");
}

/** Bağlı soketleri olan Durable Object'e yeni mesajı yayınla. */
async function broadcast(env: Env, conversationId: string, message: unknown) {
  const stub = env.CHAT.get(env.CHAT.idFromName(conversationId));
  await stub.fetch("https://do/broadcast", {
    method: "POST",
    body: JSON.stringify(message),
    headers: { "content-type": "application/json" },
  });
}

// ============ GET /conversations ============
conversationRoutes.get("/", requireAuth, async (c) => {
  const user = c.get("user");
  const rows = await c.env.DB.prepare(
    `SELECT cv.*,
            l.title AS listing_title, l.price AS listing_price,
            (SELECT url FROM listing_images WHERE listing_id = l.id ORDER BY position LIMIT 1) AS cover_url,
            CASE WHEN cv.buyer_id = ?1 THEN cv.seller_id ELSE cv.buyer_id END AS other_id
     FROM conversations cv JOIN listings l ON l.id = cv.listing_id
     WHERE cv.buyer_id = ?1 OR cv.seller_id = ?1
     ORDER BY cv.last_message_at DESC`,
  ).bind(user.id).all();

  const convs = rows.results as Record<string, unknown>[];
  const result = await Promise.all(
    convs.map(async (cv) => {
      const otherId = cv.other_id as string;
      const [other, last, unread] = await Promise.all([
        c.env.DB.prepare(`SELECT id, name, avatar_url, city, district, created_at, trust_score, response_time_avg, is_store, store_name, phone_verified, identity_verified FROM users WHERE id = ?`).bind(otherId).first(),
        c.env.DB.prepare(`SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1`).bind(cv.id).first(),
        c.env.DB.prepare(`SELECT COUNT(*) AS n FROM messages WHERE conversation_id = ? AND sender_id != ? AND read_at IS NULL`).bind(cv.id, user.id).first(),
      ]);
      return {
        id: cv.id, listingId: cv.listing_id, buyerId: cv.buyer_id, sellerId: cv.seller_id,
        lastMessageAt: cv.last_message_at, createdAt: cv.created_at,
        listing: { id: cv.listing_id, title: cv.listing_title, price: cv.listing_price, coverUrl: (cv.cover_url as string) ?? null },
        otherUser: other ? {
          id: other.id, name: other.name, avatarUrl: other.avatar_url ?? null, city: other.city ?? null,
          district: other.district ?? null, createdAt: other.created_at, trustScore: other.trust_score ?? 0,
          responseTimeAvg: other.response_time_avg ?? null, isStore: !!other.is_store, storeName: other.store_name ?? null,
          phoneVerified: !!other.phone_verified, identityVerified: !!other.identity_verified,
        } : undefined,
        lastMessage: last ? rowToMessage(last as Record<string, unknown>) : null,
        unreadCount: (unread?.n as number) ?? 0,
      };
    }),
  );
  return c.json(result);
});

// ============ POST /conversations ============
conversationRoutes.post("/", requireAuth, async (c) => {
  const parsed = startConversationSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) badRequest("Geçersiz", parsed.error.flatten());
  const { listingId, body } = parsed.data!;
  const user = c.get("user");

  const listing = await c.env.DB.prepare(`SELECT * FROM listings WHERE id = ?`).bind(listingId).first();
  if (!listing || listing.status === "removed") notFound("İlan bulunamadı");
  if (listing!.seller_id === user.id) badRequest("Kendi ilanınıza mesaj atamazsınız");
  if (await areBlocked(c.env.DB, user.id, listing!.seller_id as string)) forbidden("Bu kullanıcıyla mesajlaşamazsınız");

  let conv = await c.env.DB.prepare(`SELECT * FROM conversations WHERE listing_id = ? AND buyer_id = ?`)
    .bind(listingId, user.id).first();

  const ts = now();
  if (!conv) {
    const id = newId("cnv");
    await c.env.DB.prepare(
      `INSERT INTO conversations (id, listing_id, buyer_id, seller_id, last_message_at, created_at) VALUES (?,?,?,?,?,?)`,
    ).bind(id, listingId, user.id, listing!.seller_id, ts, ts).run();
    conv = await c.env.DB.prepare(`SELECT * FROM conversations WHERE id = ?`).bind(id).first();
  }

  const flag = inspectMessage(body);
  const msgId = newId("msg");
  await c.env.DB.batch([
    c.env.DB.prepare(`INSERT INTO messages (id, conversation_id, sender_id, type, body, created_at) VALUES (?,?,?, 'text', ?, ?)`)
      .bind(msgId, conv!.id, user.id, body, ts),
    c.env.DB.prepare(`UPDATE conversations SET last_message_at = ? WHERE id = ?`).bind(ts, conv!.id),
  ]);
  const msg = await c.env.DB.prepare(`SELECT * FROM messages WHERE id = ?`).bind(msgId).first();
  await broadcast(c.env, conv!.id as string, { kind: "message", message: rowToMessage(msg as Record<string, unknown>) });

  return c.json({
    id: conv!.id, listingId: conv!.listing_id, buyerId: conv!.buyer_id, sellerId: conv!.seller_id,
    lastMessageAt: ts, createdAt: conv!.created_at,
    ...(flag.flagged ? { safetyWarning: flag.reasons } : {}),
  }, 201);
});

// ============ GET /conversations/:id/messages ============
conversationRoutes.get("/:id/messages", requireAuth, async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");
  const conv = await loadConversation(c.env, id);
  if (!conv) notFound("Konuşma bulunamadı");
  assertMember(conv as Record<string, unknown>, user.id);

  const rows = await c.env.DB.prepare(`SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT 200`).bind(id).all();
  // Karşı tarafın mesajlarını okundu işaretle
  await c.env.DB.prepare(`UPDATE messages SET read_at = ? WHERE conversation_id = ? AND sender_id != ? AND read_at IS NULL`)
    .bind(now(), id, user.id).run();
  return c.json((rows.results as Record<string, unknown>[]).map(rowToMessage));
});

// ============ POST /conversations/:id/messages ============
conversationRoutes.post("/:id/messages", requireAuth, async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");
  const conv = await loadConversation(c.env, id);
  if (!conv) notFound("Konuşma bulunamadı");
  assertMember(conv as Record<string, unknown>, user.id);
  const otherId = (conv!.buyer_id === user.id ? conv!.seller_id : conv!.buyer_id) as string;
  if (await areBlocked(c.env.DB, user.id, otherId)) forbidden("Bu kullanıcıyla mesajlaşamazsınız");

  const parsed = sendMessageSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) badRequest("Mesaj geçersiz", parsed.error.flatten());
  const input = parsed.data!;
  if (input.type === "offer" && !input.offerAmount) badRequest("Teklif tutarı gerekli");
  if (input.type === "text" && !input.body) badRequest("Boş mesaj");

  const flag = inspectMessage(input.body);
  const ts = now();
  const msgId = newId("msg");
  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO messages (id, conversation_id, sender_id, type, body, offer_amount, offer_status, created_at)
       VALUES (?,?,?,?,?,?,?,?)`,
    ).bind(msgId, id, user.id, input.type, input.body ?? null, input.offerAmount ?? null,
      input.type === "offer" ? "pending" : null, ts),
    c.env.DB.prepare(`UPDATE conversations SET last_message_at = ? WHERE id = ?`).bind(ts, id),
  ]);
  const msg = await c.env.DB.prepare(`SELECT * FROM messages WHERE id = ?`).bind(msgId).first();
  const message = rowToMessage(msg as Record<string, unknown>);
  await broadcast(c.env, id, { kind: "message", message });

  return c.json({ ...message, ...(flag.flagged ? { safetyWarning: flag.reasons } : {}) }, 201);
});

// ============ POST /conversations/:id/messages/:msgId/offer ============
conversationRoutes.post("/:id/messages/:msgId/offer", requireAuth, async (c) => {
  const { id, msgId } = c.req.param();
  const user = c.get("user");
  const conv = await loadConversation(c.env, id);
  if (!conv) notFound("Konuşma bulunamadı");
  assertMember(conv as Record<string, unknown>, user.id);

  const parsed = offerActionSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) badRequest("Geçersiz işlem", parsed.error.flatten());
  const { action, counterAmount } = parsed.data!;

  const offer = await c.env.DB.prepare(`SELECT * FROM messages WHERE id = ? AND conversation_id = ? AND type = 'offer'`)
    .bind(msgId, id).first();
  if (!offer) notFound("Teklif bulunamadı");
  if (offer!.sender_id === user.id) forbidden("Kendi teklifinize işlem yapamazsınız");
  if (offer!.offer_status !== "pending") conflict("Teklif zaten yanıtlanmış");

  const ts = now();
  if (action === "counter") {
    if (!counterAmount) badRequest("Karşı teklif tutarı gerekli");
    await c.env.DB.prepare(`UPDATE messages SET offer_status = 'rejected' WHERE id = ?`).bind(msgId).run();
    const newMsgId = newId("msg");
    await c.env.DB.batch([
      c.env.DB.prepare(`INSERT INTO messages (id, conversation_id, sender_id, type, offer_amount, offer_status, created_at) VALUES (?,?,?, 'offer', ?, 'pending', ?)`)
        .bind(newMsgId, id, user.id, counterAmount, ts),
      c.env.DB.prepare(`UPDATE conversations SET last_message_at = ? WHERE id = ?`).bind(ts, id),
    ]);
    const m = await c.env.DB.prepare(`SELECT * FROM messages WHERE id = ?`).bind(newMsgId).first();
    const message = rowToMessage(m as Record<string, unknown>);
    await broadcast(c.env, id, { kind: "message", message });
    return c.json(message);
  }

  const status = action === "accept" ? "accepted" : "rejected";
  await c.env.DB.prepare(`UPDATE messages SET offer_status = ? WHERE id = ?`).bind(status, msgId).run();
  if (status === "accepted") {
    await c.env.DB.prepare(`UPDATE listings SET status = 'reserved', updated_at = ? WHERE id = ?`).bind(ts, conv!.listing_id).run();
  }
  const m = await c.env.DB.prepare(`SELECT * FROM messages WHERE id = ?`).bind(msgId).first();
  const message = rowToMessage(m as Record<string, unknown>);
  await broadcast(c.env, id, { kind: "offer_update", message });
  return c.json(message);
});

// ============ GET /conversations/:id/socket — WebSocket (Durable Object) ============
conversationRoutes.get("/:id/socket", optionalAuth, async (c) => {
  const id = c.req.param("id");
  // Soket el sıkışmasında header gönderilemediği için jeton query'den de kabul edilir
  let userId = c.get("user")?.id;
  if (!userId) {
    const token = c.req.query("token");
    const payload = token ? await verifyJwt(token, c.env.JWT_SECRET) : null;
    if (payload) userId = payload.sub;
  }
  if (!userId) return c.json({ error: "unauthorized", message: "Giriş gerekli" }, 401);

  const conv = await loadConversation(c.env, id);
  if (!conv) return c.json({ error: "not_found", message: "Konuşma bulunamadı" }, 404);
  if (conv.buyer_id !== userId && conv.seller_id !== userId) {
    return c.json({ error: "forbidden", message: "Bu konuşma sizin değil" }, 403);
  }

  const stub = c.env.CHAT.get(c.env.CHAT.idFromName(id));
  return stub.fetch(c.req.raw);
});
