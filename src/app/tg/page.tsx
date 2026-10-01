"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function TelegramWebAppPage() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState("");

  useEffect(() => {
    if (!(window as unknown as { Telegram?: unknown }).Telegram) {
      const s = document.createElement("script");
      s.src = "https://telegram.org/js/telegram-web-app.js";
      s.async = true;
      document.head.appendChild(s);
      s.onload = () => initTg();
    } else {
      initTg();
    }

    function initTg() {
      const tg = (window as unknown as {
        Telegram?: {
          WebApp?: {
            ready: () => void;
            expand: () => void;
            setHeaderColor: (c: string) => void;
            setBackgroundColor: (c: string) => void;
            initDataUnsafe?: { user?: { first_name?: string; username?: string } };
          };
        };
      }).Telegram?.WebApp;
      if (!tg) return;
      tg.ready();
      tg.expand();
      try {
        tg.setHeaderColor("#05080f");
        tg.setBackgroundColor("#05080f");
      } catch {
        /* ignore */
      }
      const u = tg.initDataUnsafe?.user;
      setUser(u?.first_name || u?.username || "");
      setReady(true);
    }
  }, []);

  return (
    <div className="mx-auto min-h-screen max-w-md bg-[#05080f] px-4 py-10 text-white">
      <p className="text-xs uppercase tracking-widest text-emerald-400/80">MoneyPulse x Telegram</p>
      <h1 className="mt-2 text-2xl font-bold">{user ? `Привет, ${user}` : "Telegram WebApp"}</h1>
      <p className="mt-2 text-sm text-slate-400">
        {ready
          ? "Открыто внутри Telegram. Быстрый учёт расходов."
          : "Открой через кнопку WebApp у бота — или зайди на полный сайт."}
      </p>
      <div className="mt-8 space-y-3">
        <Link
          href="/expenses"
          className="block rounded-2xl bg-emerald-500 py-3.5 text-center text-sm font-bold text-white"
        >
          Добавить расход
        </Link>
        <Link
          href="/scan"
          className="block rounded-2xl bg-white/5 py-3.5 text-center text-sm font-semibold ring-1 ring-white/10"
        >
          Сканер чека
        </Link>
        <Link
          href="/"
          className="block rounded-2xl bg-white/5 py-3.5 text-center text-sm font-semibold ring-1 ring-white/10"
        >
          Dashboard
        </Link>
      </div>
      <p className="mt-8 text-xs text-slate-600">
        BotFather → Menu Button → https://YOUR_DOMAIN/tg
      </p>
    </div>
  );
}
