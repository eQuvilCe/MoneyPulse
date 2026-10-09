"use client";

import Link from "next/link";
import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, ScanLine, MessageSquareText, Target, Users, Sparkles, Send, TrendingDown, TrendingUp } from "lucide-react";
import { CATEGORY_ICONS, FinanceData, dateKey, formatMoney, formatMoneySmart } from "@/lib/types";
import { useApp } from "@/components/AppProvider";
import { useHideAmounts, HIDDEN_AMOUNT } from "@/hooks/useHideAmounts";

/** Cursor light for a tile — one handler, CSS variables, no React state. */
function glow(e: React.PointerEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--gx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--gy", `${e.clientY - r.top}px`);
}

/** The dashboard's "main menu": big shortcuts that react to the pointer. */
export function QuickActions() {
  const { lang } = useApp();
  const ru = lang !== "en";
  const reduced = useReducedMotion();
  const items = [
    { href: "/expenses", icon: ArrowDownRight, label: ru ? "Расход" : "Expense", rgb: "251,113,133" },
    { href: "/income", icon: ArrowUpRight, label: ru ? "Доход" : "Income", rgb: "52,211,153" },
    { href: "/scan", icon: ScanLine, label: ru ? "Сканер" : "Scan", rgb: "34,211,238" },
    { href: "/banks", icon: MessageSquareText, label: ru ? "SMS банка" : "Bank SMS", rgb: "56,189,248" },
    { href: "/goals", icon: Target, label: ru ? "Цели" : "Goals", rgb: "167,139,250" },
    { href: "/family", icon: Users, label: ru ? "Семья" : "Family", rgb: "52,211,153" },
    { href: "/ai", icon: Sparkles, label: "AI Pulse", rgb: "251,191,36" },
    { href: "/settings", icon: Send, label: "Telegram", rgb: "56,189,248" },
  ];
  return (
    <nav aria-label={ru ? "Быстрые действия" : "Quick actions"} className="grid grid-cols-4 gap-2 sm:gap-3 lg:grid-cols-8">
      {items.map((it, i) => (
        <motion.div
          key={it.href}
          initial={reduced ? false : { opacity: 0, y: 14, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 24, delay: 0.04 * i }}
          whileHover={reduced ? undefined : { y: -4 }}
          whileTap={{ scale: 0.95 }}
        >
          <Link
            href={it.href}
            onPointerMove={glow}
            className="mp-tile group relative flex min-w-0 flex-col items-center gap-2 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0e17]/75 px-1 py-3.5 text-center backdrop-blur-xl transition-colors hover:border-white/20 sm:py-4"
            style={{ "--tile": it.rgb } as React.CSSProperties}
          >
            <span
              className="relative flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110"
              style={{ background: `rgba(${it.rgb},0.14)`, color: `rgb(${it.rgb})`, boxShadow: `inset 0 0 0 1px rgba(${it.rgb},0.25)` }}
            >
              <it.icon size={18} />
            </span>
            <span className="relative w-full truncate px-1 text-[11px] font-medium text-slate-300 transition-colors group-hover:text-white">{it.label}</span>
          </Link>
        </motion.div>
      ))}
    </nav>
  );
}

function sum(data: FinanceData, type: "income" | "expense", from: string, to?: string) {
  return data.transactions.reduce((s, t) => (t.type === type && t.date >= from && (!to || t.date <= to) ? s + t.amount : s), 0);
}

/** Month pace: how much of the month has passed vs how much of the money is gone. */
export function MonthPace({ data }: { data: FinanceData }) {
  const { lang } = useApp();
  const ru = lang !== "en";
  const l = ru ? "ru" : "en";
  const { hidden } = useHideAmounts();
  const cur = data.settings.currency;

  const m = useMemo(() => {
    const now = new Date();
    const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const day = now.getDate();
    const monthStart = dateKey(new Date(now.getFullYear(), now.getMonth(), 1));
    const spent = sum(data, "expense", monthStart);
    const income = sum(data, "income", monthStart);
    // With budgets set, compare like with like: only spending in the budgeted categories
    // counts against the budget total. Without budgets, all spending is measured against income.
    const monthly = data.budgets.filter((b) => b.period !== "week");
    const budget = monthly.reduce((s, b) => s + b.limit, 0);
    const budgeted = new Set(monthly.map((b) => b.category));
    const spentBudgeted = data.transactions.reduce(
      (s, t) => (t.type === "expense" && t.date >= monthStart && budgeted.has(t.category) ? s + t.amount : s),
      0
    );
    const base = budget > 0 ? budget : income;
    const counted = budget > 0 ? spentBudgeted : spent;
    const d = (n: number) => {
      const x = new Date();
      x.setDate(x.getDate() - n);
      return dateKey(x);
    };
    const thisWeek = sum(data, "expense", d(6));
    const lastWeek = sum(data, "expense", d(13), d(7));
    return {
      day,
      days,
      spent,
      counted,
      base,
      byBudget: budget > 0,
      timePct: Math.round((day / days) * 100),
      moneyPct: base > 0 ? Math.round((counted / base) * 100) : 0,
      projected: Math.round((spent / day) * days),
      weekDelta: lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null,
    };
  }, [data]);

  const ahead = m.base > 0 && m.moneyPct > m.timePct + 5;
  const verdict =
    m.base <= 0
      ? ru ? "Добавьте доход или бюджет — покажу, в каком вы темпе" : "Add income or a budget to see your pace"
      : m.moneyPct > 100
        ? m.byBudget
          ? ru ? "Бюджеты месяца уже превышены" : "This month's budgets are already exceeded"
          : ru ? "Расходы уже больше дохода за месяц" : "Spending already exceeds this month's income"
        : ahead
          ? ru ? "Тратите быстрее, чем идёт месяц" : "Spending faster than the month is passing"
          : ru ? "Идёте в графике" : "You're on pace";
  const tone = m.base <= 0 ? "text-slate-400" : m.moneyPct > 100 ? "text-rose-300" : ahead ? "text-amber-300" : "text-emerald-300";
  const bar = m.moneyPct > 100 ? "bg-rose-400" : ahead ? "bg-amber-400" : "bg-emerald-400";
  const show = (n: number) => (hidden ? HIDDEN_AMOUNT : formatMoneySmart(n, cur, l, 1e9));

  return (
    <div className="h-full rounded-3xl border border-white/[0.08] bg-[#0a0e17]/75 p-5 shadow-[0_20px_60px_-24px_rgba(0,0,0,0.65)] backdrop-blur-xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-sm font-semibold text-white">{ru ? "Темп месяца" : "Month pace"}</h2>
          <p className={`mt-1 text-sm font-medium ${tone}`}>{verdict}</p>
        </div>
        {m.weekDelta !== null && (
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              m.weekDelta > 0 ? "bg-rose-500/15 text-rose-300" : "bg-emerald-500/15 text-emerald-300"
            }`}
            title={ru ? "Расходы за 7 дней к предыдущим 7 дням" : "Spending in the last 7 days vs the 7 before"}
          >
            {m.weekDelta > 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {m.weekDelta > 0 ? "+" : ""}
            {m.weekDelta}% {ru ? "за неделю" : "this week"}
          </span>
        )}
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <div className="mb-1.5 flex justify-between gap-3 text-xs text-slate-400">
            <span>{ru ? `День ${m.day} из ${m.days}` : `Day ${m.day} of ${m.days}`}</span>
            <span className="tabular-nums">{m.timePct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div className="h-full rounded-full bg-slate-400" initial={{ width: 0 }} animate={{ width: `${m.timePct}%` }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
          </div>
        </div>
        <div>
          <div className="mb-1.5 flex justify-between gap-3 text-xs text-slate-400">
            <span className="min-w-0 truncate">
              {m.byBudget ? (ru ? "По бюджетам" : "Budgeted") : ru ? "Потрачено" : "Spent"} {show(m.counted)}
              {m.base > 0 && ` ${ru ? "из" : "of"} ${show(m.base)}${m.byBudget ? "" : ru ? " дохода" : " income"}`}
            </span>
            {m.base > 0 && <span className="shrink-0 tabular-nums">{m.moneyPct}%</span>}
          </div>
          <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              className={`h-full rounded-full ${bar}`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, m.moneyPct)}%` }}
              transition={{ duration: 1.1, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            />
            {/* where the money bar "should" be today */}
            {m.base > 0 && <span className="absolute inset-y-0 w-0.5 bg-white/70" style={{ left: `${m.timePct}%` }} />}
          </div>
        </div>
      </div>

      {m.spent > 0 && (
        <p className="mt-4 text-xs text-slate-500">
          {ru ? "Все расходы при таком темпе к концу месяца: " : "All spending at this pace by month-end: "}
          <span className="font-medium tabular-nums text-slate-300">{show(m.projected)}</span>
        </p>
      )}
    </div>
  );
}

/** A slow ticker of the latest transactions — the page is visibly "alive" even when idle. */
export function ActivityTicker({ data }: { data: FinanceData }) {
  const { lang } = useApp();
  const ru = lang !== "en";
  const { hidden } = useHideAmounts();
  const cur = data.settings.currency;
  const items = useMemo(() => [...data.transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12), [data.transactions]);
  if (items.length < 4) return null;

  const today = dateKey();
  const when = (date: string) =>
    date === today ? (ru ? "сегодня" : "today") : new Date(date + "T00:00:00").toLocaleDateString(ru ? "ru-RU" : "en-US", { day: "numeric", month: "short" });

  return (
    <div className="mp-ticker-mask" aria-label={ru ? "Последние операции" : "Latest transactions"}>
      <div className="mp-ticker" style={{ animationDuration: `${items.length * 5}s` }}>
        {[0, 1].map((k) => (
          <ul key={k} className="flex shrink-0 gap-2 pr-2" aria-hidden={k === 1}>
            {items.map((t) => (
              <li key={t.id} className="flex shrink-0 items-center gap-2 rounded-full border border-white/[0.08] bg-[#0a0e17]/70 py-1.5 pl-2 pr-3 text-xs">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.06]">{CATEGORY_ICONS[t.category] || "📦"}</span>
                <span className="max-w-[140px] truncate text-slate-300">{t.description || t.category}</span>
                <span className={`font-semibold tabular-nums ${t.type === "income" ? "text-emerald-400" : "text-rose-400"}`}>
                  {hidden ? HIDDEN_AMOUNT : `${t.type === "income" ? "+" : "−"}${formatMoney(t.amount, cur)}`}
                </span>
                <span className="text-slate-600">{when(t.date)}</span>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
