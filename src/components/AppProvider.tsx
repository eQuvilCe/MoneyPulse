"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { Lang, t, TKey } from "@/lib/i18n";

export type Plan = "free" | "pro" | "demo";

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
  plan?: Plan;
}

type Theme = "dark" | "light";

interface AppCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  tr: (key: TKey) => string;
  user: User | null;
  login: (email: string, password: string, remember?: boolean) => Promise<{ ok: boolean; error?: string }>;
  register: (name: string, email: string, password: string, remember?: boolean) => Promise<{ ok: boolean; error?: string }>;
  enterDemo: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (u: Partial<Pick<User, "name" | "email">>) => void;
  ready: boolean;
  theme: Theme;
  setTheme: (t: Theme) => void;
  showAuth: boolean;
  setShowAuth: (v: boolean) => void;
}

const Ctx = createContext<AppCtx | null>(null);
const LANG_KEY = "mp-lang";
const THEME_KEY = "mp-theme";

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ru");
  const [theme, setThemeState] = useState<Theme>("dark");
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(LANG_KEY) as Lang | null;
    if (saved === "ru" || saved === "en") setLangState(saved);
    const th = localStorage.getItem(THEME_KEY) as Theme | null;
    if (th === "light" || th === "dark") {
      setThemeState(th);
      document.documentElement.classList.toggle("light", th === "light");
    }
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((d) => setUser(d.user))
      .catch(() => setUser(null))
      .finally(() => setReady(true));
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem(LANG_KEY, l);
  }, []);

  const setTheme = useCallback((th: Theme) => {
    setThemeState(th);
    localStorage.setItem(THEME_KEY, th);
    document.documentElement.classList.toggle("light", th === "light");
  }, []);

  const tr = useCallback((key: TKey) => t(lang, key), [lang]);

  const login = useCallback(async (email: string, password: string, remember = true) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, remember }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error || "Login failed" };
    setUser(data.user);
    setShowAuth(false);
    return { ok: true };
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, remember = true) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, remember }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error || "Register failed" };
    setUser(data.user);
    setShowAuth(false);
    return { ok: true };
  }, []);

  const enterDemo = useCallback(async () => {
    const res = await fetch("/api/auth/demo", { method: "POST", credentials: "include" });
    const data = await res.json();
    if (res.ok) {
      setUser(data.user);
      setShowAuth(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
  }, []);

  const updateProfile = useCallback((u: Partial<Pick<User, "name" | "email">>) => {
    setUser((prev) => (prev ? { ...prev, ...u } : prev));
  }, []);

  return (
    <Ctx.Provider
      value={{
        lang, setLang, tr, user, login, register, enterDemo, logout, updateProfile,
        ready, theme, setTheme, showAuth, setShowAuth,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp outside provider");
  return ctx;
}
