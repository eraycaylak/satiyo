/** Tipli, platform-bağımsız API istemcisi (web + mobil). */
import type {
  AppConfig,
  AuthSession,
  Conversation,
  Listing,
  Message,
  Paginated,
  PublicSeller,
  Review,
  StoreApplication,
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
  /** Hesabı ve tüm ilişkili veriyi kalıcı olarak sil (App Store 5.1.1(v)). */
  deleteAccount() {
    return this.request<{ ok: true }>("/me", { method: "DELETE" });
  }

  // --- Engelleme (App Store 1.2 — UGC güvenliği) ---
  blockUser(userId: string) {
    return this.request<{ ok: true }>("/me/blocks", { method: "POST", body: JSON.stringify({ userId }) });
  }
  unblockUser(userId: string) {
    return this.request<{ ok: true }>(`/me/blocks/${userId}`, { method: "DELETE" });
  }
  blockedUsers() {
    return this.request<{ id: string; name: string; createdAt: number }[]>("/me/blocks");
  }

  // --- Listings ---
  search(filters: SearchFilters) {
    // attrs bir nesne; query string'ine JSON olarak kodlanır (backend parse eder).
    const { attrs, ...rest } = filters;
    const query: Record<string, unknown> = { ...rest };
    if (attrs && Object.keys(attrs).length > 0) query.attrs = JSON.stringify(attrs);
    return this.request<Paginated<Listing>>("/listings", { query });
  }
  getListing(id: string) {
    return this.request<Listing>(`/listings/${id}`);
  }
  createListing(input: unknown) {
    return this.request<Listing>("/listings", { method: "POST", body: JSON.stringify(input) });
  }
  // AI ilan sihirbazı: foto → başlık/kategori/fiyat/açıklama önerisi (Gemini Vision)
  suggestListing(input: { imageUrl?: string; imageBase64?: string; mimeType?: string }) {
    return this.request<{ title: string; categoryId: string | null; price: number; description: string; condition: "new" | "used" }>(
      "/ai/suggest-listing",
      { method: "POST", body: JSON.stringify(input) },
    );
  }
  updateListing(id: string, input: unknown) {
    return this.request<Listing>(`/listings/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  }
  deleteListing(id: string) {
    return this.request<{ ok: true }>(`/listings/${id}`, { method: "DELETE" });
  }
  /** İlanı satıldı işaretle (A3): kime (buyerId, opsiyonel) + nereden (channel). */
  markSold(id: string, input: { buyerId?: string; channel?: "satiyo" | "disarida" } = {}) {
    return this.request<Listing>(`/listings/${id}/sold`, { method: "POST", body: JSON.stringify(input) });
  }
  /** Bu ilanda konuşan alıcı adayları (satıcı; "kime sattım" seçimi için). */
  listingBuyers(id: string) {
    return this.request<PublicSeller[]>(`/listings/${id}/buyers`);
  }
  myListings(status?: string) {
    return this.request<Paginated<Listing>>("/me/listings", status ? { query: { status } } : undefined);
  }
  recommendations() {
    return this.request<{ items: Listing[]; basedOn: string[] }>("/me/recommendations");
  }
  sellerListings(sellerId: string) {
    return this.request<Paginated<Listing>>(`/sellers/${sellerId}/listings`);
  }
  followSeller(sellerId: string) {
    return this.request<{ ok: true }>(`/sellers/${sellerId}/follow`, { method: "POST" });
  }
  unfollowSeller(sellerId: string) {
    return this.request<{ ok: true }>(`/sellers/${sellerId}/follow`, { method: "DELETE" });
  }
  following() {
    return this.request<PublicSeller[]>("/me/following");
  }
  // Reklam kredisi cüzdanı (bakiye kuruş + hareketler)
  wallet() {
    return this.request<{
      balance: number;
      history: { type: string; amount: number; refType: string | null; refId: string | null; createdAt: number }[];
    }>("/me/wallet");
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
  /** Konuşmayı bul-veya-oluştur. body verilirse YALNIZ yeni konuşmada açılış mesajı yazılır (A2). */
  startConversation(listingId: string, body?: string) {
    return this.request<Conversation & { created: boolean }>("/conversations", {
      method: "POST",
      body: JSON.stringify(body ? { listingId, body } : { listingId }),
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

  // --- Push token (cihaz bildirimi) ---
  registerPushToken(token: string, platform: string) {
    return this.request<{ ok: true }>("/me/push-token", {
      method: "POST",
      body: JSON.stringify({ token, platform }),
    });
  }
  removePushToken(token: string) {
    return this.request<{ ok: true }>("/me/push-token", {
      method: "DELETE",
      body: JSON.stringify({ token }),
    });
  }

  // --- App config (zorunlu güncelleme; public) ---
  config() {
    return this.request<AppConfig>("/config");
  }

  // --- Store verification (C4) ---
  applyStore(input: {
    storeName: string; legalType: "individual" | "company";
    tcNo?: string; taxNo?: string; docImageIds: string[];
  }) {
    return this.request<{ id: string; status: "pending" }>("/me/store/apply", {
      method: "POST", body: JSON.stringify(input),
    });
  }
  storeApplication() {
    return this.request<StoreApplication | null>("/me/store/application");
  }

  // --- Admin ---
  adminStats() {
    return this.request<AdminStats>("/admin/stats");
  }
  adminOverview() {
    return this.request<{
      listingsDaily: { day: string; count: number }[];
      categoryBreakdown: { categoryId: string; name: string; icon: string; count: number }[];
      recentActivity: { type: string; title: string; subtitle: string; at: number }[];
    }>("/admin/overview");
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
  adminUsers(q?: string) {
    return this.request<AdminUser[]>("/admin/users", q ? { query: { q } } : undefined);
  }
  adminListings(status?: string, q?: string) {
    return this.request<{ items: Listing[] }>("/admin/listings", { query: { ...(status ? { status } : {}), ...(q ? { q } : {}) } });
  }
  adminWallets() {
    return this.request<{
      top: { userId: string; name: string; phone: string; balance: number }[];
      recent: { userId: string; name: string; type: string; amount: number; createdAt: number }[];
    }>("/admin/wallets");
  }
  adminUser(id: string) {
    return this.request<{
      id: string; phone: string; name: string; city: string | null; district: string | null;
      createdAt: number; phoneVerified: boolean; isStore: boolean; storeName: string | null;
      isAdmin: boolean; banned: boolean; trustScore: number;
      wallet: { balance: number; history: { type: string; amount: number; createdAt: number }[] };
      listings: { total: number; active: number; sold: number };
      stats: { favorites: number; conversations: number; reviews: number; ratingAvg: number | null; reports: number; followers: number; following: number };
    }>(`/admin/users/${id}`);
  }
  adminGrantCredit(id: string, amountKurus: number, reason?: string) {
    return this.request<{ ok: true; balance: number }>(`/admin/users/${id}/credit`, { method: "POST", body: JSON.stringify({ amountKurus, reason }) });
  }
  adminAiStatus() {
    return this.request<{
      monthCalls: number; monthUsers: number; estimatedCostUsd: number; dailyLimitPerUser: number;
      keySource: "panel" | "secret" | "none"; keyMasked: string | null; health: string; note: string;
    }>("/admin/ai-status");
  }
  adminSetGeminiKey(key: string) {
    return this.request<{ ok: true; keyMasked: string }>("/admin/settings/gemini-key", { method: "POST", body: JSON.stringify({ key }) });
  }
  // C5 — admin ilan düzenleme (sahiplik atlanır)
  adminUpdateListing(id: string, input: unknown) {
    return this.request<Listing>(`/admin/listings/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  }
  // AI Moderasyon
  adminModerationQueue() {
    return this.request<{ items: Listing[] }>("/admin/moderation-queue");
  }
  adminClearRisk(id: string) {
    return this.request<{ ok: true }>(`/admin/listings/${id}/clear-risk`, { method: "POST" });
  }
  adminModerateListing(id: string) {
    return this.request<{ ok: true; riskScore: number | null; riskFlag: boolean; riskCategory: string | null }>(`/admin/listings/${id}/moderate`, { method: "POST" });
  }
  // Öne Çıkanlar (boost'lu ilanlar)
  adminFeatured() {
    return this.request<{ items: Listing[] }>("/admin/featured");
  }
  // Mesajlar (moderasyon / trust & safety)
  adminConversations(q?: string, risky?: boolean) {
    return this.request<{ items: Array<{
      id: string; listingId: string; listingTitle: string;
      buyerId: string; buyerName: string; buyerPhone: string;
      sellerId: string; sellerName: string; sellerPhone: string;
      lastMessageAt: number; createdAt: number; messageCount: number; flaggedCount: number;
    }> }>("/admin/conversations", { query: { ...(q ? { q } : {}), ...(risky ? { risky: "1" } : {}) } });
  }
  adminConversationMessages(id: string) {
    return this.request<{ messages: Array<{
      id: string; senderId: string; senderName: string; type: string;
      body: string | null; offerAmount: number | null; offerStatus: string | null; flagged: boolean; createdAt: number;
    }> }>(`/admin/conversations/${id}/messages`);
  }
  // C2 — zorunlu güncelleme config yönetimi
  adminConfig() {
    return this.request<Record<string, string>>("/admin/config");
  }
  adminSetConfig(key: string, value: string) {
    return this.request<{ ok: true }>("/admin/config", { method: "POST", body: JSON.stringify({ key, value }) });
  }
  // C4 — mağaza başvuru onay kuyruğu
  adminStoreApplications(status = "pending") {
    return this.request<Array<StoreApplication & {
      userId: string; userName: string; userPhone: string; docUrls: string[]; tcVerified: boolean; taxVerified: boolean;
    }>>("/admin/store-applications", { query: { status } });
  }
  adminApproveStore(id: string) {
    return this.request<{ ok: true }>(`/admin/store-applications/${id}/approve`, { method: "POST" });
  }
  adminRejectStore(id: string, note?: string) {
    return this.request<{ ok: true }>(`/admin/store-applications/${id}/reject`, { method: "POST", body: JSON.stringify({ note }) });
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

export interface AdminStats {
  users: {
    total: number; verified: number; stores: number; banned: number;
    admins: number; active24h: number; active7d: number; new24h: number; new7d: number;
  };
  listings: {
    total: number; active: number; sold: number; reserved: number;
    removed: number; boosted: number; new24h: number; new7d: number;
  };
  engagement: {
    conversations: number; messages: number; favorites: number;
    reviews: number; reportsOpen: number; reportsTotal: number;
  };
  activity: {
    events24h: number; events7d: number;
    topEvents: { name: string; c24: number; c7: number }[];
  };
  revenue: { totalKurus: number; payments: number };
  engagementExtra?: { follows: number };
  wallet?: { grantedKurus: number; spentKurus: number; outstandingKurus: number; wallets: number };
  ai?: { suggestionsTotal: number; suggestionsToday: number };
}

export interface AdminUser {
  id: string;
  phone: string;
  name: string | null;
  city: string | null;
  createdAt: number;
  phoneVerified: boolean;
  isStore: boolean;
  isAdmin: boolean;
  banned: boolean;
  listingCount: number;
  lastSeen: number | null;
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
  data: { listingId?: string; conversationId?: string } | null;
  readAt: number | null;
  createdAt: number;
}
