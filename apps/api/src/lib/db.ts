/** D1 satır eşleme yardımcıları — snake_case DB → camelCase domain tipi. */
import type {
  Conversation,
  Listing,
  ListingImage,
  Message,
  PublicSeller,
  Review,
  User,
} from "@satiyo/shared";

export function rowToUser(r: Record<string, unknown>): User {
  return {
    id: r.id as string,
    phone: r.phone as string,
    email: (r.email as string) ?? null,
    name: r.name as string,
    avatarUrl: (r.avatar_url as string) ?? null,
    city: (r.city as string) ?? null,
    district: (r.district as string) ?? null,
    createdAt: r.created_at as number,
    phoneVerified: !!r.phone_verified,
    emailVerified: !!r.email_verified,
    identityVerified: !!r.identity_verified,
    trustScore: (r.trust_score as number) ?? 0,
    responseTimeAvg: (r.response_time_avg as number) ?? null,
    isStore: !!r.is_store,
    storeName: (r.store_name as string) ?? null,
    isAdmin: !!r.is_admin,
  };
}

export function rowToSeller(r: Record<string, unknown>): PublicSeller {
  return {
    id: r.id as string,
    name: r.name as string,
    avatarUrl: (r.avatar_url as string) ?? null,
    city: (r.city as string) ?? null,
    district: (r.district as string) ?? null,
    createdAt: r.created_at as number,
    trustScore: (r.trust_score as number) ?? 0,
    responseTimeAvg: (r.response_time_avg as number) ?? null,
    isStore: !!r.is_store,
    storeName: (r.store_name as string) ?? null,
    phoneVerified: !!r.phone_verified,
    identityVerified: !!r.identity_verified,
    ratingAvg: r.rating_avg != null ? Number(r.rating_avg) : undefined,
    ratingCount: r.rating_count != null ? Number(r.rating_count) : undefined,
    lastSeen: r.last_seen != null ? Number(r.last_seen) : null,
  };
}

export function rowToImage(r: Record<string, unknown>): ListingImage {
  return {
    id: r.id as string,
    listingId: r.listing_id as string,
    url: r.url as string,
    position: r.position as number,
    blurhash: (r.blurhash as string) ?? null,
  };
}

export function rowToListing(r: Record<string, unknown>): Listing {
  return {
    id: r.id as string,
    sellerId: r.seller_id as string,
    title: r.title as string,
    description: (r.description as string) ?? "",
    categoryId: r.category_id as string,
    price: r.price as number,
    priceType: r.price_type as Listing["priceType"],
    condition: r.condition as Listing["condition"],
    city: (r.city as string) ?? null,
    district: (r.district as string) ?? null,
    lat: (r.lat as number) ?? null,
    lng: (r.lng as number) ?? null,
    status: r.status as Listing["status"],
    viewCount: (r.view_count as number) ?? 0,
    createdAt: r.created_at as number,
    updatedAt: r.updated_at as number,
    boostedUntil: (r.boosted_until as number) ?? null,
    quantity: (r.quantity as number) ?? 1,
    soldTo: (r.sold_to as string) ?? null,
    soldAt: (r.sold_at as number) ?? null,
    soldChannel: (r.sold_channel as Listing["soldChannel"]) ?? null,
    images: [],
    attributes: {},
  };
}

export function rowToMessage(r: Record<string, unknown>): Message {
  return {
    id: r.id as string,
    conversationId: r.conversation_id as string,
    senderId: r.sender_id as string,
    type: r.type as Message["type"],
    body: (r.body as string) ?? null,
    offerAmount: (r.offer_amount as number) ?? null,
    offerStatus: (r.offer_status as Message["offerStatus"]) ?? null,
    readAt: (r.read_at as number) ?? null,
    createdAt: r.created_at as number,
  };
}

export function rowToReview(r: Record<string, unknown>): Review {
  return {
    id: r.id as string,
    listingId: r.listing_id as string,
    reviewerId: r.reviewer_id as string,
    reviewedId: r.reviewed_id as string,
    rating: r.rating as number,
    comment: (r.comment as string) ?? null,
    createdAt: r.created_at as number,
  };
}

export type ConversationRow = Record<string, unknown>;
export function rowToConversation(r: ConversationRow): Conversation {
  return {
    id: r.id as string,
    listingId: r.listing_id as string,
    buyerId: r.buyer_id as string,
    sellerId: r.seller_id as string,
    lastMessageAt: r.last_message_at as number,
    createdAt: r.created_at as number,
  };
}

/**
 * Bir ilan kümesini görseller + öznitelikler + (opsiyonel) satıcı ve favori
 * bilgisiyle zenginleştirir. N+1 yerine toplu sorgu.
 */
export async function hydrateListings(
  db: D1Database,
  listings: Listing[],
  opts: { withSeller?: boolean; favoriteUserId?: string | null } = {},
): Promise<Listing[]> {
  if (listings.length === 0) return listings;
  const ids = listings.map((l) => l.id);
  const placeholders = ids.map(() => "?").join(",");

  const [imgs, attrs] = await Promise.all([
    db.prepare(`SELECT * FROM listing_images WHERE listing_id IN (${placeholders}) ORDER BY position`).bind(...ids).all(),
    db.prepare(`SELECT listing_id, key, value FROM listing_attributes WHERE listing_id IN (${placeholders})`).bind(...ids).all(),
  ]);

  const byId = new Map(listings.map((l) => [l.id, l]));
  for (const row of imgs.results as Record<string, unknown>[]) {
    byId.get(row.listing_id as string)?.images.push(rowToImage(row));
  }
  for (const row of attrs.results as Record<string, unknown>[]) {
    const l = byId.get(row.listing_id as string);
    if (l) l.attributes[row.key as string] = row.value as string;
  }

  if (opts.favoriteUserId) {
    const favs = await db
      .prepare(`SELECT listing_id FROM favorites WHERE user_id = ? AND listing_id IN (${placeholders})`)
      .bind(opts.favoriteUserId, ...ids)
      .all();
    const favSet = new Set((favs.results as Record<string, unknown>[]).map((r) => r.listing_id as string));
    for (const l of listings) l.favorited = favSet.has(l.id);
  }

  if (opts.withSeller) {
    const sellerIds = [...new Set(listings.map((l) => l.sellerId))];
    const sp = sellerIds.map(() => "?").join(",");
    const sellers = await db
      .prepare(
        `SELECT u.*, AVG(r.rating) AS rating_avg, COUNT(r.id) AS rating_count
         FROM users u LEFT JOIN reviews r ON r.reviewed_id = u.id
         WHERE u.id IN (${sp}) GROUP BY u.id`,
      )
      .bind(...sellerIds)
      .all();
    const sellerMap = new Map(
      (sellers.results as Record<string, unknown>[]).map((row) => [row.id as string, rowToSeller(row)]),
    );
    for (const l of listings) l.seller = sellerMap.get(l.sellerId);
  }

  return listings;
}
