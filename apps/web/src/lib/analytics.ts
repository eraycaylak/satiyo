// GA4 + Google Ads + Meta Pixel — env ile açılır; ID yoksa tümü no-op (güvenli).
type GtagFn = (...args: unknown[]) => void;
type FbqFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    gtag?: GtagFn;
    fbq?: FbqFn;
    dataLayer?: unknown[];
  }
}

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
export const GADS_ID = process.env.NEXT_PUBLIC_GADS_ID; // AW-XXXXXXXXX
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
export const analyticsEnabled = Boolean(GA_ID || META_PIXEL_ID);

export function trackPageView(url: string): void {
  if (typeof window === "undefined") return;
  if (GA_ID && window.gtag) window.gtag("event", "page_view", { page_path: url });
  if (META_PIXEL_ID && window.fbq) window.fbq("track", "PageView");
}

/** Genel GA4 event (dönüşümler için de kullanılır). */
export function trackEvent(name: string, params: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return;
  if (GA_ID && window.gtag) window.gtag("event", name, params);
}

/** Google Ads dönüşümü (send_to = "AW-XXXX/label"). */
export function trackAdsConversion(sendTo: string, params: Record<string, unknown> = {}): void {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", "conversion", { send_to: sendTo, ...params });
}

/** Meta Pixel standart event. */
export function trackMeta(event: string, params: Record<string, unknown> = {}): void {
  if (typeof window === "undefined" || !META_PIXEL_ID || !window.fbq) return;
  window.fbq("track", event, params);
}

// Uygulama-özel anlamlı dönüşüm olayları (tek yerden yönetilir)
export const events = {
  viewItem: (id: string, price: number, category?: string) =>
    trackEvent("view_item", { item_id: id, value: price / 100, currency: "TRY", item_category: category }),
  contactSeller: (id: string) => {
    trackEvent("contact_seller", { item_id: id });
    trackMeta("Contact");
  },
  beginListing: () => trackEvent("begin_listing"),
  publishListing: (category?: string) => {
    trackEvent("publish_listing", { item_category: category });
    trackMeta("SubmitApplication");
  },
  signUp: () => {
    trackEvent("sign_up", { method: "phone" });
    trackMeta("CompleteRegistration");
  },
  search: (term: string) => trackEvent("search", { search_term: term }),
  addFavorite: (id: string) => trackEvent("add_to_wishlist", { item_id: id }),
  purchaseBoost: (value: number) => {
    trackEvent("purchase", { value: value / 100, currency: "TRY" });
    trackMeta("Purchase", { value: value / 100, currency: "TRY" });
  },
};
