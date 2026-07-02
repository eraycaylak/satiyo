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
