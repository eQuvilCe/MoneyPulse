"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";

const LiveAreaChart = dynamic(() => import("@/components/LiveAreaChart"), {
  ssr: false,
  loading: () => <div className="h-52 animate-pulse rounded-2xl bg-white/[0.03]" />,
});
const LivePieChart = dynamic(() => import("@/components/LivePieChart"), {
  ssr: false,
  loading: () => <div className="h-52 animate-pulse rounded-2xl bg-white/[0.03]" />,
});

import { getStats, getBudgetStatus } from "@/lib/storage";
import { useRealtimeData } from "@/hooks/useRealtimeData";
import { CATEGORY_ICONS, CATEGORY_COLORS, formatMoney, formatMoneySmart, compactNumber, dateKey, formatShortDate } from "@/lib/types";
import { useHideAmounts, HIDDEN_AMOUNT } from "@/hooks/useHideAmounts";
import StatCard from "@/components/StatCard";
import AIInsightBar from "@/components/AIInsightBar";
import TransactionList from "@/components/TransactionList";
import { PageShell, FadeItem } from "@/components/motion/PageShell";
import DailyQuickAdd from "@/components/DailyQuickAdd";
import DayStrip from "@/components/DayStrip";
import WeeklySummary from "@/components/WeeklySummary";
import PulseHero from "@/components/PulseHero";
import StreakBadge from "@/components/StreakBadge";
import ShareCard from "@/components/ShareCard";
import { getHealthScore, getHealthBreakdown } from "@/lib/ai";
import SmartAlerts from "@/components/SmartAlerts";
import MoneyFlow from "@/components/MoneyFlow";
import { QuickActions, MonthPace, ActivityTicker } from "@/components/DashboardLive";
import { useApp } from "@/components/AppProvider";

/** Days of history drawn in the stat card sparklines. */
const SPARK_DAYS = 14;
/** Savings rate at or above which the card is shown as healthy. */
const GOOD_SAVINGS_RATE = 20;

export default function Dashboard() {
  const { data, refresh, live } = useRealtimeData();
  const { tr, lang } = useApp();
  const { hidden } = useHideAmounts();
  const [selectedDay, setSelectedDay] = useState(() => dateKey());
  const [txFilter, setTxFilter] = useState<"all" | "income" | "expense">("all");

  const dayTx = useMemo(() => {
    if (!data) return [];
    return data.transactions.filter((t) => t.date === selectedDay);
  }, [data, selectedDay]);

  const filteredDayTx = useMemo(() => {
    if (txFilter === "all") return dayTx;
    return dayTx.filter((t) => t.type === txFilter);
  }, [dayTx, txFilter]);

  if (!data) {
    return (
      <div className="flex h-72 flex-col items-center justify-center gap-3">
        <motion.div
          className="h-10 w-10 rounded-full border-2 border-cyan-500/20 border-t-cyan-400"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
        />
        <p className="text-sm text-slate-500">{tr("loading")}</p>
      </div>
    );
  }

  const stats = getStats(data);
  const budgets = getBudgetStatus(data);
  const pieData = Object.entries(stats.byCategory).map(([name, value]) => ({
    name,
    value,
    color: CATEGORY_COLORS[name] || "#64748b",
  }));

  const today = dateKey();
  const todayIncome = data.transactions
    .filter((t) => t.type === "income" && t.date === today)
    .reduce((s, t) => s + t.amount, 0);
  const todayExpense = data.transactions
    .filter((t) => t.type === "expense" && t.date === today)
    .reduce((s, t) => s + t.amount, 0);

  const dayIncome = dayTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const dayExpense = dayTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  const cur = data.settings.currency;
  /** Exact while it fits the row, abbreviated from 10 million up. */
  const short = (n: number) =>
    Math.abs(n) >= 1e7 ? compactNumber(n, lang) : n.toLocaleString(lang === "en" ? "en-US" : "ru-RU");
  const health = getHealthScore(data);

  const spark = (type: "income" | "expense") => {
    const arr = Array.from({ length: SPARK_DAYS }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (SPARK_DAYS - 1 - i));
      const k = dateKey(d);
      return data.transactions
        .filter((t) => t.type === type && t.date === k)
        .reduce((a, t) => a + t.amount, 0);
    });
    return arr.some((v) => v > 0) ? arr : undefined;
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 6) return tr("goodNight");
    if (h < 12) return tr("goodMorning");
    if (h < 18) return tr("goodAfternoon");
    return tr("goodEvening");
  };

  return (
    <PageShell className="relative page-accent-cyan">
      {/* Header */}
      <FadeItem>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-400/70">
              {greeting()}
              {data.settings.name ? ` · ${data.settings.name.split(" ")[0]}` : ""}
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              <span className="mp-gradient-text">{tr("healthTitle")}</span>
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {tr("dashboardHeroSubtitle")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {live && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                Live
              </span>
            )}
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                health >= 70
                  ? "bg-emerald-500/15 text-emerald-300"
                  : health >= 40
                    ? "bg-amber-500/15 text-amber-300"
                    : "bg-rose-500/15 text-rose-300"
              }`}
            >
              Pulse {health}
            </span>
          </div>
        </div>
      </FadeItem>

      {/* Hero + Quick add */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <FadeItem className="min-w-0 lg:col-span-8 [&>*]:h-full">
          <PulseHero
            balance={stats.balance}
            income={stats.income}
            expense={stats.expense}
            savingsRate={stats.savingsRate}
            health={health}
            currency={cur}
            parts={getHealthBreakdown(data).parts}
          />
        </FadeItem>
        <FadeItem className="min-w-0 lg:col-span-4 [&>*]:h-full">
          <DailyQuickAdd
            onAdded={refresh}
            todayIncome={todayIncome}
            todayExpense={todayExpense}
            currency={cur}
            settings={data.settings}
            recent={data.transactions}
          />
        </FadeItem>
      </div>

      {/* Main menu: shortcuts */}
      <FadeItem>
        <QuickActions />
      </FadeItem>

      {/* Alerts + AI */}
      <FadeItem>
        <SmartAlerts data={data} />
      </FadeItem>
      <FadeItem>
        <AIInsightBar data={data} />
      </FadeItem>

      <FadeItem>
        <ActivityTicker data={data} />
      </FadeItem>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          title={tr("income")}
          value={hidden ? HIDDEN_AMOUNT : `+${formatMoneySmart(stats.income, cur, lang)}`}
          fullValue={hidden ? undefined : `+${formatMoney(stats.income, cur)}`}
          icon="↑"
          color="green"
          spark={spark("income")}
        />
        <StatCard
          title={tr("expenses")}
          value={hidden ? HIDDEN_AMOUNT : `−${formatMoneySmart(stats.expense, cur, lang)}`}
          fullValue={hidden ? undefined : `−${formatMoney(stats.expense, cur)}`}
          icon="↓"
          color="red"
          delay={0.06}
          spark={spark("expense")}
        />
        <StatCard
          title={tr("savings")}
          value={`${stats.savingsRate}%`}
          icon="◎"
          color={stats.savingsRate >= GOOD_SAVINGS_RATE ? "cyan" : "amber"}
          delay={0.12}
          subtitle={`${tr("goal")} ${data.settings.savingsTargetPercent}%`}
        />
      </div>

      <FadeItem>
        <MonthPace data={data} />
      </FadeItem>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-12">
        <FadeItem className="rounded-3xl border border-white/[0.08] bg-[#0a0e17]/75 p-5 shadow-[0_20px_60px_-24px_rgba(0,0,0,0.65)] backdrop-blur-xl lg:col-span-7">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-white">
              {tr("dynamics")}
            </h2>
            <Link href="/analytics" className="text-xs text-cyan-400/80 hover:text-cyan-300">
              {tr("analytics")} →
            </Link>
          </div>
          <div className="h-52">
            <LiveAreaChart data={stats.dailySeries} />
          </div>
        </FadeItem>
        <FadeItem className="rounded-3xl border border-white/[0.08] bg-[#0a0e17]/75 p-5 shadow-[0_20px_60px_-24px_rgba(0,0,0,0.65)] backdrop-blur-xl lg:col-span-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-white">
              {tr("expenseStructure")}
            </h2>
            <Link href="/expenses" className="text-xs text-cyan-400/80 hover:text-cyan-300">
              {tr("allLink")}
            </Link>
          </div>
          {pieData.length === 0 ? (
            <div className="flex h-52 flex-col items-center justify-center gap-2 text-center">
              <p className="text-sm text-slate-500">{tr("noData")}</p>
              <Link href="/expenses" className="text-xs text-cyan-400 hover:underline">
                {tr("addExpenseAction")}
              </Link>
            </div>
          ) : (
            <div className="h-52">
              <LivePieChart data={pieData} />
            </div>
          )}
        </FadeItem>
      </div>

      {/* Money flow — live map of income → spending → savings */}
      <FadeItem>
        <div className="rounded-3xl border border-white/[0.08] bg-[#0a0e17]/75 p-5 shadow-[0_20px_60px_-24px_rgba(0,0,0,0.65)] backdrop-blur-xl">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-white">{tr("moneyFlowTitle")}</h2>
          </div>
          <p className="mb-4 text-xs text-slate-500">{tr("moneyFlowSubtitle")}</p>
          <MoneyFlow data={data} />
        </div>
      </FadeItem>

      {/* Day strip + transactions */}
      <FadeItem>
        <div className="rounded-3xl border border-white/[0.08] bg-[#0a0e17]/75 p-5 shadow-[0_20px_60px_-24px_rgba(0,0,0,0.65)] backdrop-blur-xl">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-sm font-semibold text-white">
                {tr("dayWord")} · {formatShortDate(selectedDay, lang)}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                <span className="text-emerald-400">+{formatMoney(dayIncome, cur)}</span>
                {" · "}
                <span className="text-rose-400">−{formatMoney(dayExpense, cur)}</span>
              </p>
            </div>
            <div className="flex gap-1 rounded-full border border-white/10 bg-white/[0.03] p-0.5">
              {(
                [
                  { id: "all" as const, label: tr("all") },
                  { id: "income" as const, label: tr("incomeLabel") },
                  { id: "expense" as const, label: tr("expense") },
                ]
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setTxFilter(f.id)}
                  aria-pressed={txFilter === f.id}
                  className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
                    txFilter === f.id ? "bg-cyan-400/20 text-cyan-300" : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <DayStrip data={data} selected={selectedDay} onSelect={setSelectedDay} />
          {filteredDayTx.length > 0 ? (
            <div className="mt-4">
              <TransactionList
                transactions={filteredDayTx}
                onChange={refresh}
                limit={8}
                currency={cur}
              />
            </div>
          ) : (
            <p className="mt-6 text-center text-sm text-slate-600">
              {tr("noTxToday")}
            </p>
          )}
        </div>
      </FadeItem>

      {/* Budgets + Goals */}
      <div className="grid gap-4 lg:grid-cols-2">
        <FadeItem className="rounded-3xl border border-white/[0.08] bg-[#0a0e17]/75 p-5 shadow-[0_20px_60px_-24px_rgba(0,0,0,0.65)] backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-white">
              {tr("budgets")}
            </h2>
            <Link href="/budgets" className="text-xs text-cyan-400/80 hover:text-cyan-300">
              {tr("allBudgetsLink")}
            </Link>
          </div>
          {budgets.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-slate-600">{tr("noBudgets")}</p>
              <Link href="/budgets" className="mt-2 inline-block text-xs text-cyan-400 hover:underline">
                {tr("createBudget")}
              </Link>
            </div>
          ) : (
            <div className="space-y-3.5">
              {budgets.slice(0, 4).map((b) => (
                <div key={b.id}>
                  <div className="mb-1.5 flex justify-between gap-3 text-xs">
                    <span className="min-w-0 truncate text-slate-300">
                      {CATEGORY_ICONS[b.category] || "•"} {b.category}
                    </span>
                    <span className={`shrink-0 tabular-nums ${b.over ? "text-rose-400" : "text-slate-500"}`}>
                      {short(b.spent)} / {short(b.limit)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, b.percent)}%` }}
                      transition={{ duration: 0.9, ease: "easeOut" }}
                      className={`h-full rounded-full ${
                        b.over ? "bg-rose-500" : b.percent >= 80 ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </FadeItem>

        <FadeItem className="rounded-3xl border border-white/[0.08] bg-[#0a0e17]/75 p-5 shadow-[0_20px_60px_-24px_rgba(0,0,0,0.65)] backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-white">
              {tr("goals")}
            </h2>
            <Link href="/goals" className="text-xs text-cyan-400/80 hover:text-cyan-300">
              {tr("allGoalsLink")}
            </Link>
          </div>
          {data.goals.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-slate-600">{tr("noGoals")}</p>
              <Link href="/goals" className="mt-2 inline-block text-xs text-cyan-400 hover:underline">
                {tr("addGoal")}
              </Link>
            </div>
          ) : (
            <div className="space-y-3.5">
              {data.goals.slice(0, 4).map((g) => {
                const progress = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));
                return (
                  <div key={g.id}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                      <span className="min-w-0 truncate text-slate-300">
                        {g.emoji} {g.title}
                      </span>
                      <span className="tabular-nums text-violet-400">{progress}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 1 }}
                        className="h-full rounded-full"
                        style={{ background: g.color || "#a78bfa" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </FadeItem>
      </div>

      {/* Bottom widgets */}
      <div className="grid gap-4 sm:grid-cols-3">
        <FadeItem>
          <StreakBadge data={data} />
        </FadeItem>
        <FadeItem>
          <WeeklySummary data={data} />
        </FadeItem>
        <FadeItem>
          <ShareCard data={data} />
        </FadeItem>
      </div>

      {/* AI CTA */}
      <FadeItem>
        <Link
          href="/ai"
          className="group flex items-center justify-between rounded-3xl border border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 via-emerald-500/5 to-violet-500/10 p-5 transition hover:border-cyan-400/35"
        >
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/15 text-xl ring-1 ring-cyan-400/25">
              ✦
            </span>
            <div>
              <h3 className="font-display font-semibold text-cyan-200">AI Pulse</h3>
              <p className="text-sm text-slate-400">
                {tr("monthBreakdownHint")}
              </p>
            </div>
          </div>
          <span className="text-xl text-cyan-400 transition group-hover:translate-x-1">→</span>
        </Link>
      </FadeItem>
    </PageShell>
  );
}
