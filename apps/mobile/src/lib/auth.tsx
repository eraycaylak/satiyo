import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@satiyo/shared";
import { ApiClientError } from "@satiyo/shared";
import { api, tokenStore } from "./client";

interface AuthState {
  user: User | null;
  loading: boolean;
  setSession: (token: string, user: User) => Promise<void>;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh(retry = true): Promise<void> {
    const token = await tokenStore.load();
    if (!token) { setUser(null); setLoading(false); return; }
    try {
      setUser(await api.me());
      setLoading(false);
    } catch (e) {
      // SADECE gerçek 401'de çıkış yap. Ağ/5xx gibi geçici hatalarda oturumu düşürme.
      if (e instanceof ApiClientError && e.status === 401) {
        setUser(null);
        await tokenStore.clear();
        setLoading(false);
      } else if (retry) {
        // Geçici hata: kısa bekle, 1 kez daha dene (soğuk başlangıç dayanıklılığı).
        await new Promise((r) => setTimeout(r, 1500));
        await refresh(false);
      } else {
        // Hâlâ ulaşılamıyor: mevcut oturumu KORU, token'ı silme.
        setLoading(false);
      }
    }
  }

  useEffect(() => { void refresh(); }, []);

  async function setSession(token: string, u: User) {
    await tokenStore.set(token);
    setUser(u);
  }
  async function logout() {
    await tokenStore.clear();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, setSession, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth AuthProvider içinde");
  return ctx;
}
