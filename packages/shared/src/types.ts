/** Satıyo domain tipleri — DB satırlarının ve API yanıtlarının ortak biçimi. */

export type PriceType = "fixed" | "negotiable" | "trade" | "free";
export type ListingStatus =
  | "active"
  | "sold"
  | "reserved"
  | "removed"
  | "draft";
export type Condition = "new" | "used";
export type MessageType = "text" | "image" | "location" | "offer";
export type ReportTarget = "listing" | "user" | "message";

export interface User {
  id: string;
  phone: string;
  email: string | null;
  name: string;
  avatarUrl: string | null;
  city: string | null;
  district: string | null;
  createdAt: number;
  phoneVerified: boolean;
  emailVerified: boolean;
  identityVerified: boolean;
  trustScore: number;
  responseTimeAvg: number | null;
  isStore: boolean;
  storeName: string | null;
  isAdmin: boolean;
  storeStatus?: "none" | "pending" | "approved" | "rejected";
  storeVerifiedAt?: number | null;
}

/** İstemciye dönen güvenli kullanıcı (telefon/email maskeli olabilir). */
export interface PublicSeller {
  id: string;
  name: string;
  avatarUrl: string | null;
  city: string | null;
  district: string | null;
  createdAt: number;
  trustScore: number;
  responseTimeAvg: number | null;
  isStore: boolean;
  storeName: string | null;
  phoneVerified: boolean;
  identityVerified: boolean;
  ratingAvg?: number;
  ratingCount?: number;
  followerCount?: number;
  isFollowing?: boolean;
  salesCount?: number;
  lastSeen?: number | null;
}

export interface ListingImage {
  id: string;
  listingId: string;
  url: string;
  position: number;
  blurhash: string | null;
}

export interface Listing {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  categoryId: string;
  price: number;
  priceType: PriceType;
  condition: Condition;
  city: string | null;
  district: string | null;
  lat: number | null;
  lng: number | null;
  status: ListingStatus;
  viewCount: number;
  createdAt: number;
  updatedAt: number;
  boostedUntil: number | null;
  images: ListingImage[];
  attributes: Record<string, string>;
  seller?: PublicSeller;
  favorited?: boolean;
  quantity?: number;
  soldTo?: string | null;
  soldAt?: number | null;
  soldChannel?: "satiyo" | "disarida" | null;
  riskScore?: number | null;
  riskFlag?: boolean;
  riskCategory?: string | null;
  riskReasons?: string[];
}

export interface Conversation {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  lastMessageAt: number;
  createdAt: number;
  listing?: Pick<Listing, "id" | "title" | "price"> & { coverUrl: string | null };
  otherUser?: PublicSeller;
  unreadCount?: number;
  lastMessage?: Message | null;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  body: string | null;
  offerAmount: number | null;
  offerStatus: "pending" | "accepted" | "rejected" | null;
  readAt: number | null;
  createdAt: number;
}

export interface Review {
  id: string;
  listingId: string;
  reviewerId: string;
  reviewedId: string;
  rating: number;
  comment: string | null;
  createdAt: number;
  reviewer?: Pick<PublicSeller, "id" | "name" | "avatarUrl">;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface AuthSession {
  token: string;
  user: User;
  expiresAt: number;
}

export interface ApiError {
  error: string;
  message: string;
  details?: unknown;
}

/** İlan durumu → Türkçe etiket (mobil/web/admin ortak — tek kaynak). */
export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  active: "Yayında",
  reserved: "Rezerve",
  sold: "Satıldı",
  removed: "Kaldırıldı",
  draft: "Taslak",
};

/** Mağaza başvurusu (C4 dükkan doğrulama). */
export interface StoreApplication {
  id: string;
  storeName: string;
  legalType: "individual" | "company";
  taxNo: string | null;
  docIds: string[];
  status: "pending" | "approved" | "rejected";
  reviewNote: string | null;
  createdAt: number;
  reviewedAt: number | null;
}

/** Zorunlu güncelleme / uygulama yapılandırması (C2). */
export interface AppConfig {
  minVersion: { ios: string; android: string };
  latestVersion: { ios: string; android: string };
  storeUrl: { ios: string; android: string };
  message: string | null;
}
