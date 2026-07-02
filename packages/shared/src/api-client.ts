/** Tipli, platform-bağımsız API istemcisi (web + mobil). */
import type {
  AuthSession,
  Conversation,
  Listing,
  Message,
  Paginated,
  PublicSeller,
  Review,
  User,
} from "./types";
import type { SearchFilters } from "./search";

export interface ClientOptions {
  baseUrl: string;
  getToken?: () => string | null | Promise<string | null>;
  onUnauthorized?: () => void;
}

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export class SatiyoClient {
  constructor(private opts: ClientOptions) {}

  private async request<T>(
    path: string,
    init: RequestInit & { query?: Record<string, unknown> } = {},
  ): Promise<T> {
    const { query, ...rest } = init;
    const url = new URL(path, this.opts.baseUrl);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }

    const headers = new Headers(rest.headers);
    headers.set("accept", "application/json");
    if (rest.body && !(rest.body instanceof FormData)) {
      headers.set("content-type", "application/json");
    }
    const token = await this.opts.getToken?.();
    if (token) headers.set("authorization", `Bearer ${token}`);

    const res = await fetch(url, { ...rest, headers });
    if (res.status === 401) this.opts.onUnauthorized?.();

    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      throw new ApiClientError(
        res.status,
        data?.error ?? "error",
        data?.message ?? res.statusText,
        data?.details,
      );
    }
    return data as T;
  }

  // --- Auth ---
  requestOtp(phone: string) {
    return this.request<{ ok: true; devCode?: string }>("/auth/otp/request", {
      method: "POST",
      body: JSON.stringify({ phone }),
    });
  }
  verifyOtp(phone: string, code: string) {
    return this.request<AuthSession>("/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({ phone, code }),
    });
  }
  /** GEÇİCİ — numarasız dev giriş (prod'da kaldırılacak). */
  devLogin() {
    return this.request<AuthSession>("/auth/dev-login", { method: "POST" });
  }
  me() {
    return this.request<User>("/me");
  }
  updateProfile(input: Partial<Pick<User, "name" | "email" | "city" | "district" | "avatarUrl">>) {
    return this.request<User>("/me", { method: "PATCH", body: JSON.stringify(input) });
  }
  activateStore(storeName: string) {
    return this.request<User>("/me/store/activate", { method: "POST", body: JSON.stringify({ storeName }) });
  }

  // --- Listings ---
  search(filters: SearchFilters) {
    return this.request<Paginated<Listing>>("/listings", { query: filters as Record<string, unknown> });
  }
  getListing(id: string) {
    return this.request<Listing>(`/listings/${id}`);
  }
  createListing(input: unknown) {
    return this.request<Listing>("/listings", { method: "POST", body: JSON.stringify(input) });
  }
  updateListing(id: string, input: unknown) {
    return this.request<Listing>(`/listings/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  }
  deleteListing(id: string) {
    return this.request<{ ok: true }>(`/listings/${id}`, { method: "DELETE" });
  }
  myListings() {
    return this.request<Paginated<Listing>>("/me/listings");
  }
  recommendations() {
    return this.request<{ items: Listing[]; basedOn: string[] }>("/me/recommendations");
  }
  sellerListings(sellerId: string) {
    return this.request<Paginated<Listing>>(`/sellers/${sellerId}/listings`);
  }
  getSeller(sellerId: string) {
    return this.request<PublicSeller>(`/sellers/${sellerId}`);
  }

  // --- Uploads ---
  requestUpload(contentType: string) {
    return this.request<{ imageId: string; uploadUrl: string; publicUrl: string }>(
      "/uploads",
      { method: "POST", body: JSON.stringify({ contentType }) },
    );
  }

  // --- Boost ---
  boostListing(listingId: string, packageId: string) {
    return this.request<{ ok: true; boostedUntil: number; urgentBadge: boolean }>(
      `/listings/${listingId}/boost`,
      { method: "POST", body: JSON.stringify({ packageId }) },
    );
  }

  // --- Favorites ---
  favorites() {
    return this.request<Paginated<Listing>>("/me/favorites");
  }
  addFavorite(listingId: string) {
    return this.request<{ ok: true }>(`/listings/${listingId}/favorite`, { method: "POST" });
  }
  removeFavorite(listingId: string) {
    return this.request<{ ok: true }>(`/listings/${listingId}/favorite`, { method: "DELETE" });
  }

  // --- Conversations / Messages ---
  conversations() {
    return this.request<Conversation[]>("/conversations");
  }
  startConversation(listingId: string, body: string) {
    return this.request<Conversation>("/conversations", {
      method: "POST",
      body: JSON.stringify({ listingId, body }),
    });
  }
  messages(conversationId: string) {
    return this.request<Message[]>(`/conversations/${conversationId}/messages`);
  }
  sendMessage(conversationId: string, input: unknown) {
    return this.request<Message>(`/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }
  actOnOffer(conversationId: string, messageId: string, input: unknown) {
    return this.request<Message>(
      `/conversations/${conversationId}/messages/${messageId}/offer`,
      { method: "POST", body: JSON.stringify(input) },
    );
  }
  /** Gerçek-zamanlı sohbet WebSocket URL'i (Durable Object). */
  chatSocketUrl(conversationId: string, token: string): string {
    const u = new URL(`/conversations/${conversationId}/socket`, this.opts.baseUrl);
    u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
    u.searchParams.set("token", token);
    return u.toString();
  }

  // --- Reviews ---
  sellerReviews(sellerId: string) {
    return this.request<Review[]>(`/sellers/${sellerId}/reviews`);
  }
  createReview(input: unknown) {
    return this.request<Review>("/reviews", { method: "POST", body: JSON.stringify(input) });
  }

  // --- Reports ---
  report(input: unknown) {
    return this.request<{ ok: true }>("/reports", { method: "POST", body: JSON.stringify(input) });
  }

  // --- Saved searches ---
  saveSearch(query: SearchFilters, notify = true) {
    return this.request<{ id: string; query: SearchFilters; notify: boolean }>("/me/saved-searches", {
      method: "POST", body: JSON.stringify({ query, notify }),
    });
  }
  savedSearches() {
    return this.request<{ id: string; query: SearchFilters; notify: boolean; createdAt: number }[]>("/me/saved-searches");
  }
  deleteSavedSearch(id: string) {
    return this.request<{ ok: true }>(`/me/saved-searches/${id}`, { method: "DELETE" });
  }

  // --- Notifications ---
  notifications() {
    return this.request<AppNotification[]>("/me/notifications");
  }
  markNotificationsRead() {
    return this.request<{ ok: true }>("/me/notifications/read", { method: "POST" });
  }

  // --- Admin ---
  adminStats() {
    return this.request<{ users: number; activeListings: number; openReports: number; revenue: number }>("/admin/stats");
  }
  adminReports(status = "open") {
    return this.request<AdminReport[]>("/admin/reports", { query: { status } });
  }
  adminResolveReport(id: string) {
    return this.request<{ ok: true }>(`/admin/reports/${id}/resolve`, { method: "POST" });
  }
  adminRemoveListing(id: string) {
    return this.request<{ ok: true }>(`/admin/listings/${id}/remove`, { method: "POST" });
  }
  adminBanUser(id: string) {
    return this.request<{ ok: true }>(`/admin/users/${id}/ban`, { method: "POST" });
  }
  adminUnbanUser(id: string) {
    return this.request<{ ok: true }>(`/admin/users/${id}/unban`, { method: "POST" });
  }
  adminSynonyms() {
    return this.request<{ id: string; term: string; aliases: string[] }[]>("/admin/synonyms");
  }
  adminAddSynonym(term: string, aliases: string[]) {
    return this.request<{ ok: true }>("/admin/synonyms", { method: "POST", body: JSON.stringify({ term, aliases }) });
  }
  adminDeleteSynonym(id: string) {
    return this.request<{ ok: true }>(`/admin/synonyms/${id}`, { method: "DELETE" });
  }

  // --- Categories ---
  categories() {
    return this.request<unknown[]>("/categories");
  }
}

export interface AdminReport {
  id: string;
  targetType: "listing" | "user" | "message";
  targetId: string;
  reason: string;
  status: string;
  reporterName: string;
  createdAt: number;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: { listingId?: string } | null;
  readAt: number | null;
  createdAt: number;
}
