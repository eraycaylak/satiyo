import { SatiyoClient } from "@satiyo/shared";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8787";

const TOKEN_KEY = "satiyo_token";

export const tokenStore = {
  get(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(TOKEN_KEY);
  },
  set(token: string) {
    window.localStorage.setItem(TOKEN_KEY, token);
  },
  clear() {
    window.localStorage.removeItem(TOKEN_KEY);
  },
};

export const api = new SatiyoClient({
  baseUrl: API_BASE,
  getToken: () => tokenStore.get(),
  onUnauthorized: () => {
    tokenStore.clear();
    if (typeof window !== "undefined") window.dispatchEvent(new Event("satiyo:logout"));
  },
});
