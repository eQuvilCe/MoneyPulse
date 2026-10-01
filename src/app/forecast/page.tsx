"use client";

import { useMemo } from "react";
import { useRealtimeData } from "@/hooks/useRealtimeData";
import { PageShell, FadeItem } from "@/components/motion/PageShell";
import { getStats } from "@/lib/storage";
import { formatMoney } from "@/lib/types";
import { generateAIAnalysis, getHealthScore, answerAIChat } from "@/lib/ai";
import AIInsightBar from "@/components/AIInsightBar";
import StatCard from "@/components/StatCard";
import { motion } from "framer-motion";

export default function ForecastPage() {
  const { data } = useRealtimeData(0);

  // All hooks MUST run before any conditional return
  const stats = useMemo(() => (data ? getStats(data) : null), [data]);
  const stats30 = useMemo(() => (data ? getStats(data, 30) : null), [data]);

  const dayOfMonth = new Date().getDate();
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const left = Math.max(0, daysInMonth - dayOfMonth);

  const dailyBurn =
    stats30 && dayOfMonth > 0 ? stats30.expense / Math.max(1, dayOfMonth) : 0;
  const projectedExpense = stats30
    ? Math.round(stats30.expense + dailyBurn * left)
    : 0;
  const projectedBalance = stats30 ? stats30.income - projectedExpense : 0;

  const health = data ? getHealthScore(data) : 0;
  const tips = useMemo(
    () => (data ? generateAIAnalysis(data).slice(0, 3) : []),
    [data]
  );
  const narrative = useMemo(
    () => (data ? answerAIChat("прогноз", data) : ""),
    [data]
  );

  const cuts = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat, amt]) => ({
        cat,
        amt,
        save: Math.round(amt * 0.15),
      }));
  }, [stats]);

  if (!data || !stats || !stats30) {
    return <div className="py-20 text-center text-slate-500">Загрузка...</div>;
  }

  return (
    <PageShell>
      <FadeItem>
        <p className="text-xs font-medium uppercase tracking-widest text-emerald-400/80">MoneyPulse</p>
        <h1 className="mt-1 text-3xl font-bold">AI-прогноз месяца</h1>
        <p className="mt-1 text-sm text-slate-400">Темп трат → остаток к концу месяца → куда срезать</p>
      </FadeItem>

      <FadeItem>
        <AIInsightBar data={data} />
      </FadeItem>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          title="Прогноз расходов"
          value={`~${formatMoney(projectedExpense, data.settings.currency)}`}
          icon="↓"
          color="red"
        />
        <StatCard
          title="Прогноз баланса"
          value={formatMoney(projectedBalance, data.settings.currency)}
          icon="◈"
          color={projectedBalance >= 0 ? "green" : "red"}
        />
        <StatCard
          title="Пульс"
          value={`${health}/100`}
          icon="◎"
          color={health >= 60 ? "cyan" : "amber"}
        />
      </div>

      <FadeItem className="mp-card rounded-2xl p-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Как считается</h2>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-300">{narrative}</p>
        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
          <div className="rounded-xl bg-white/[0.04] p-3">
            <p className="text-[10px] text-slate-500">Дней прошло</p>
            <p className="font-bold">
              {dayOfMonth} / {daysInMonth}
            </p>
          </div>
          <div className="rounded-xl bg-white/[0.04] p-3">
            <p className="text-[10px] text-slate-500">Темп ₽/день</p>
            <p className="font-bold">~{formatMoney(Math.round(dailyBurn), data.settings.currency)}</p>
          </div>
          <div className="rounded-xl bg-white/[0.04] p-3">
            <p className="text-[10px] text-slate-500">Осталось дней</p>
            <p className="font-bold">{left}</p>
          </div>
        </div>
      </FadeItem>

      <FadeItem className="mp-card rounded-2xl p-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Если срезать 15% с топа
        </h2>
        <div className="mt-4 space-y-3">
          {cuts.map((c) => (
            <div key={c.cat} className="flex items-center justify-between text-sm">
              <span className="text-slate-300">{c.cat}</span>
              <span className="text-slate-500">{formatMoney(c.amt, data.settings.currency)}</span>
              <span className="font-semibold text-emerald-400">+{formatMoney(c.save, data.settings.currency)}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Суммарно можно вернуть ~
          {formatMoney(cuts.reduce((s, c) => s + c.save, 0), data.settings.currency)} до конца месяца
        </p>
      </FadeItem>

      <FadeItem className="space-y-2">
        {tips.map((a) => (
          <motion.div
            key={a.id}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-sm font-semibold">
              {a.icon} {a.title}
            </p>
            <p className="mt-1 text-sm text-slate-400">{a.message}</p>
          </motion.div>
        ))}
      </FadeItem>
    </PageShell>
  );
}
