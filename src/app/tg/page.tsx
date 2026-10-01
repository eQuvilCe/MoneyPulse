"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadDataAsync, getStats } from "@/lib/storage";
import { FinanceData, formatMoney } from "@/lib/types";

type TelegramWebApp = {
  ready: () => void;
  expand: () => void;
  setHeaderColor: (c: string) => void;
  setBackgroundColor: (c: string) => void;
  initData?: string;
  initDataUnsafe?: { user?: { first_name?: string; username?: string } };
  MainButton?: {
    setText: (t: string) => void;
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  HapticFeedback?: { impactOccurred: (style: "light" | "medium" | "heavy") => void };
};

function getTg(): TelegramWebApp | undefined {
  return (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp;
}

type LinkState = "checking" | "linked" | "unlinked" | "no-telegram" | "error";

export default function TelegramWebAppPage() {
  const router = useRouter();
  const [state, setState] = useState<LinkState>("checking");
  const [firstName, setFirstName] = useState("");
  const [data, setData] = useState<FinanceData | null>(null);
  const tgRef = useRef<TelegramWebApp | undefined>(undefined);

  useEffect(() => {
    if (!(window as unknown as { Telegram?: unknown }).Telegram) {
      const s = document.createElement("script");
      s.src = "https://telegram.org/js/telegram-web-app.js";
      s.async = true;
      document.head.appendChild(s);
      s.onload = () => void initTg();
    } else {
      void initTg();
    }

    async function initTg() {
      const tg = getTg();
      if (!tg) {
        setState((prev) => (prev === "checking" ? "no-telegram" : prev));
        return;
      }
      tgRef.current = tg;
      tg.ready();
      tg.expand();
      try {
        tg.setHeaderColor("#05080f");
        tg.setBackgroundColor("#05080f");
      } catch {
        /* ignore */
      }
      setFirstName(tg.initDataUnsafe?.user?.first_name || tg.initDataUnsafe?.user?.username || "");

      if (!tg.initData) {
        setState("no-telegram");
        return;
      }
      try {
        const res = await fetch("/api/telegram/verify", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData: tg.initData }),
        });
        const json = await res.json();
        if (res.ok && json.linked) {
          setState("linked");
          const d = await loadDataAsync();
          setData(d);
        } else {
          setState("unlinked");
        }
      } catch {
        setState("error");
      }
    }
  }, []);

  useEffect(() => {
    const tg = tgRef.current;
    if (!tg?.MainButton || state !== "linked") return;
    const onClick = () => {
      tg.HapticFeedback?.impactOccurred("light");
      router.push("/expenses");
    };
    tg.MainButton.setText("Добавить операцию");
    tg.MainButton.show();
    tg.MainButton.onClick(onClick);
    return () => tg.MainButton?.offClick(onClick);
  }, [state, router]);

  const haptic = () => tgRef.current?.HapticFeedback?.impactOccurred("light");

  const stats = data ? getStats(data, 30) : null;
  const currency = data?.settings.currency || "сум";

  return (
    <div className="mx-auto min-h-screen max-w-md bg-[#05080f] px-4 py-10 text-white">
      <p className="text-xs uppercase tracking-widest text-emerald-400/80">MoneyPulse × Telegram</p>
      <h1 className="mt-2 text-2xl font-bold">
        {firstName ? `Привет, ${firstName}` : "Telegram WebApp"}
      </h1>

      {state === "checking" && <p className="mt-2 text-sm text-slate-400">Проверяю аккаунт…</p>}

      {state === "linked" && stats && (
        <div className="mt-6 space-y-3">
          <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
            <p className="text-xs uppercase tracking-wider text-slate-500">Баланс</p>
            <p className="mt-1 text-3xl font-bold">{formatMoney(stats.balance, currency)}</p>
            <p className="mt-2 text-xs text-slate-500">
              Доход {formatMoney(stats.income, currency)} · Расход {formatMoney(stats.expense, currency)}
            </p>
          </div>
          <p className="text-xs text-emerald-400/80">✓ Аккаунт привязан — SMS и /expense в боте сразу сохраняются.</p>
        </div>
      )}

      {state === "unlinked" && (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-slate-400">
            Этот Telegram ещё не привязан к аккаунту MoneyPulse. Войди на сайте, потом открой это окно снова — привяжется автоматически.
          </p>
          <Link
            href="/"
            onClick={haptic}
            className="block rounded-2xl bg-emerald-500 py-3.5 text-center text-sm font-bold text-white"
          >
            Войти / Зарегистрироваться
          </Link>
        </div>
      )}

      {(state === "no-telegram" || state === "error") && (
        <p className="mt-2 text-sm text-slate-400">
          {state === "error"
            ? "Не удалось проверить аккаунт. Попробуй ещё раз."
            : "Открой через кнопку WebApp у бота — или зайди на полный сайт."}
        </p>
      )}

      <div className="mt-8 space-y-3">
        <Link
          href="/expenses"
          onClick={haptic}
          className="block rounded-2xl bg-emerald-500 py-3.5 text-center text-sm font-bold text-white"
        >
          Добавить расход
        </Link>
        <Link
          href="/scan"
          onClick={haptic}
          className="block rounded-2xl bg-white/5 py-3.5 text-center text-sm font-semibold ring-1 ring-white/10"
        >
          Сканер чека
        </Link>
        <Link
          href="/"
          onClick={haptic}
          className="block rounded-2xl bg-white/5 py-3.5 text-center text-sm font-semibold ring-1 ring-white/10"
        >
          Dashboard
        </Link>
      </div>
      <p className="mt-8 text-xs text-slate-600">BotFather → Menu Button → https://YOUR_DOMAIN/tg</p>
    </div>
  );
}
