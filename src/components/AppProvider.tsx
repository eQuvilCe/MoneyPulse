"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from "react";
import { Lang, t, TKey } from "@/lib/i18n";
import { onSessionExpired, emitSessionExpired } from "@/lib/events";

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
  tr: (key: TKey, vars?: Record<string, string | number>) => string;
  user: User | null;
  login: (email: string, password: string, remember?: boolean) => Promise<{ ok: boolean; error?: string }>;
  register: (name: string, email: string, password: string, remember?: boolean) => Promise<{ ok: boolean; error?: string }>;
  enterDemo: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (u: Partial<Pick<User, "name" | "email">>) => Promise<{ ok: boolean; error?: string }>;
  ready: boolean;
  theme: Theme;
  setTheme: (t: Theme) => void;
  showAuth: boolean;
  setShowAuth: (v: boolean) => void;
}

const Ctx = createContext<AppCtx | null>(null);
const LANG_KEY = "mp-lang";
const THEME_KEY = "mp-theme";

function readInitialLang(): Lang {
  if (typeof window === "undefined") return "ru";
  const saved = localStorage.getItem(LANG_KEY);
  if (saved === "ru" || saved === "en") return saved;
  const cookieMatch = document.cookie.match(/(?:^|;\s*)mp-lang=(ru|en)/);
  return cookieMatch ? (cookieMatch[1] as Lang) : "ru";
}

function readInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const saved = localStorage.getItem(THEME_KEY);
  return saved === "light" || saved === "dark" ? saved : "dark";
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readInitialLang);
  const [theme, setThemeState] = useState<Theme>(readInitialTheme);
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const hadUserRef = useRef(false);
  const lastFetchRef = useRef(0);

  const fetchMe = useCallback(async () => {
    const now = Date.now();
    if (now - lastFetchRef.current < 1500) return; // collapse near-simultaneous triggers (mount/focus/visibility)
    lastFetchRef.current = now;
    try {
      const r = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
      const d = r.ok ? await r.json() : { user: null };
      // Flip the ref first so concurrent calls (mount + focus + interval firing close together) only emit once.
      const wasLoggedIn = hadUserRef.current;
      hadUserRef.current = !!d.user;
      if (!d.user && wasLoggedIn) {
        // session cookie expired/was revoked while the SPA stayed open
        emitSessionExpired();
      }
      setUser(d.user);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    // lang/theme are already correct from the lazy useState initializers above (no flash) —
    // this just syncs the <html> class + lang cookie for the value we booted with.
    document.documentElement.classList.toggle("light", theme === "light");
    document.cookie = `${LANG_KEY}=${lang}; path=/; max-age=31536000; samesite=lax`;
    fetchMe().finally(() => setReady(true));

    const onFocus = () => fetchMe();
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchMe();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    const interval = setInterval(fetchMe, 15 * 60 * 1000);
    const offExpired = onSessionExpired(() => {
      hadUserRef.current = false;
      setUser(null);
    });
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(interval);
      offExpired();
    };
    // Mount-once: syncs the <html> class/cookie for whatever lang/theme the lazy
    // initializers booted with; setLang/setTheme handle all subsequent changes themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchMe]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem(LANG_KEY, l);
    document.cookie = `${LANG_KEY}=${l}; path=/; max-age=31536000; samesite=lax`;
  }, []);

  const setTheme = useCallback((th: Theme) => {
    setThemeState(th);
    localStorage.setItem(THEME_KEY, th);
    document.documentElement.classList.toggle("light", th === "light");
  }, []);

  const tr = useCallback((key: TKey, vars?: Record<string, string | number>) => t(lang, key, vars), [lang]);

  const login = useCallback(async (email: string, password: string, remember = true) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, remember }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error || "Login failed" };
    hadUserRef.current = true;
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
    hadUserRef.current = true;
    setUser(data.user);
    setShowAuth(false);
    return { ok: true };
  }, []);

  const enterDemo = useCallback(async () => {
    const res = await fetch("/api/auth/demo", { method: "POST", credentials: "include" });
    const data = await res.json();
    if (res.ok) {
      hadUserRef.current = true;
      setUser(data.user);
      setShowAuth(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    hadUserRef.current = false;
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (u: Partial<Pick<User, "name" | "email">>) => {
    const res = await fetch("/api/auth/profile", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(u),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error || "Update failed" };
    setUser(data.user);
    return { ok: true };
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
