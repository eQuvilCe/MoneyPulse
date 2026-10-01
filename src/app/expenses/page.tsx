"use client";

import { useEffect, useState, useMemo } from "react";
import { loadDataAsync, getStats } from "@/lib/storage";
import { FinanceData, CATEGORY_ICONS, formatMoney } from "@/lib/types";
import TransactionForm from "@/components/TransactionForm";
import TransactionList from "@/components/TransactionList";
import StatCard from "@/components/StatCard";
import AIInsightBar from "@/components/AIInsightBar";
import { PageShell, FadeItem, Skeleton } from "@/components/motion/PageShell";
import TiltCard from "@/components/motion/TiltCard";
import { LetterReveal } from "@/components/motion/Reveal";
import { useApp } from "@/components/AppProvider";

export default function ExpensesPage() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const { tr, lang } = useApp();
  const refresh = () => loadDataAsync().then(setData);
  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    let list = data.transactions.filter((t) => t.type === "expense");
    if (filter !== "all") list = list.filter((t) => t.category === filter);
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter(
        (t) =>
          t.description.toLowerCase().includes(s) ||
          t.category.toLowerCase().includes(s) ||
          String(t.amount).includes(s)
      );
    }
    return list;
  }, [data, filter, q]);

  if (!data) {
    return (
      <PageShell className="page-accent-amber">
        <FadeItem>
          <Skeleton className="h-16 w-full" />
        </FadeItem>
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <FadeItem>
          <Skeleton className="h-64 w-full" />
        </FadeItem>
      </PageShell>
    );
  }
  const stats = getStats(data);
  const expenseTx = data.transactions.filter((t) => t.type === "expense");
  const topCats = Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]);
  const cur = data.settings.currency || "₽";

  return (
    <PageShell className="page-accent-amber">
      <FadeItem>
        <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--page-accent)" }}>
          MoneyPulse
        </p>
        <h1 className="mt-1 text-3xl font-bold">
          <LetterReveal text={tr("expenses")} />
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {lang === "ru" ? "Поиск · фильтры · AI на страже" : "Search · filters · AI on watch"}
        </p>
      </FadeItem>
      <FadeItem>
        <AIInsightBar data={data} />
      </FadeItem>
      <div className="grid gap-3 sm:grid-cols-3">
        <TiltCard>
          <StatCard title={tr("total")} value={`−${formatMoney(stats.expense, cur)}`} icon="↓" color="red" />
        </TiltCard>
        <TiltCard>
          <StatCard
            title={lang === "ru" ? "Операций" : "Ops"}
            value={`${expenseTx.length}`}
            icon="◈"
            color="amber"
          />
        </TiltCard>
        <TiltCard>
          <StatCard
            title={lang === "ru" ? "Категорий" : "Categories"}
            value={`${Object.keys(stats.byCategory).length}`}
            icon="▣"
            color="purple"
          />
        </TiltCard>
      </div>
      <FadeItem>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={lang === "ru" ? "Поиск: кофе, такси, сумма..." : "Search: coffee, taxi, amount..."}
          className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--page-accent)]/50"
        />
      </FadeItem>
      <FadeItem>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className="rounded-full px-3 py-1 text-xs transition"
            style={
              filter === "all"
                ? { background: "rgba(var(--page-accent-rgb),0.18)", color: "var(--page-accent)", boxShadow: "inset 0 0 0 1px rgba(var(--page-accent-rgb),0.3)" }
                : { color: "#64748b" }
            }
          >
            {lang === "ru" ? "Все" : "All"}
          </button>
          {topCats.map(([cat, amount]) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilter(cat)}
              className="rounded-full px-3 py-1 text-xs transition"
              style={
                filter === cat
                  ? { background: "rgba(var(--page-accent-rgb),0.18)", color: "var(--page-accent)", boxShadow: "inset 0 0 0 1px rgba(var(--page-accent-rgb),0.3)" }
                  : { color: "#64748b" }
              }
            >
              {CATEGORY_ICONS[cat]} {cat}{" "}
              <span className="opacity-50">{formatMoney(amount, cur)}</span>
            </button>
          ))}
        </div>
      </FadeItem>
      <FadeItem>
        <TransactionForm type="expense" onAdded={refresh} currency={cur} settings={data.settings} />
      </FadeItem>
      <FadeItem>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          {lang === "ru" ? "История" : "History"}{" "}
          {filtered.length !== expenseTx.length ? `(${filtered.length})` : ""}
        </h2>
        <TransactionList transactions={filtered} type="expense" onChange={refresh} currency={cur} />
      </FadeItem>
    </PageShell>
  );
}
