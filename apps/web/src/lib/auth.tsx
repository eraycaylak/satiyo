"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@satiyo/shared";
import { api, tokenStore } from "./client";

interface AuthState {
  user: User | null;
  loading: boolean;
  setSession: (token: string, user: User) => void;
  refresh: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    if (!tokenStore.get()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      setUser(await api.me());
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    const onLogout = () => setUser(null);
    window.addEventListener("satiyo:logout", onLogout);
    return () => window.removeEventListener("satiyo:logout", onLogout);
  }, []);

  function setSession(token: string, u: User) {
    tokenStore.set(token);
    setUser(u);
  }
  function logout() {
    tokenStore.clear();
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
  if (!ctx) throw new Error("useAuth AuthProvider içinde kullanılmalı");
  return ctx;
}
