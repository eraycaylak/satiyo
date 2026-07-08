import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { SatiyoClient } from "@satiyo/shared";

// Geliştirmede Metro host IP'sini kullan (gerçek cihaz localhost'a ulaşamaz).
function resolveApiBase(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE;
  if (fromEnv) return fromEnv;
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) return `http://${hostUri.split(":")[0]}:8787`;
  return "http://localhost:8787";
}

export const API_BASE = resolveApiBase();

const TOKEN_KEY = "satiyo_token";
let cachedToken: string | null = null;

export const tokenStore = {
  async load(): Promise<string | null> {
    cachedToken = await AsyncStorage.getItem(TOKEN_KEY);
    return cachedToken;
  },
  get(): string | null {
    return cachedToken;
  },
  async set(token: string) {
    cachedToken = token;
    await AsyncStorage.setItem(TOKEN_KEY, token);
  },
  async clear() {
    cachedToken = null;
    await AsyncStorage.removeItem(TOKEN_KEY);
  },
};

export const api = new SatiyoClient({
  baseUrl: API_BASE,
  getToken: () => cachedToken,
  // Gerçek 401'de token'ı temizle (geçersiz/süresi dolmuş oturum). Ağ/5xx'te dokunma.
  onUnauthorized: () => { void tokenStore.clear(); },
});
