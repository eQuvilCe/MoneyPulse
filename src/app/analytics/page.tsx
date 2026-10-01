"use client";

import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell,
} from "recharts";
import { getStats } from "@/lib/storage";
import { useRealtimeData } from "@/hooks/useRealtimeData";
import LiveAreaChart from "@/components/LiveAreaChart";
import { FinanceData, CATEGORY_COLORS } from "@/lib/types";
import AIInsightBar from "@/components/AIInsightBar";
import StatCard from "@/components/StatCard";
import { PageShell, FadeItem } from "@/components/motion/PageShell";
import { categoryComparison, periodRange, statsInRange } from "@/lib/insights";
import { formatMoney } from "@/lib/types";

export default function AnalyticsPage() {
  const { data, live } = useRealtimeData(0);
  const [period, setPeriod] = useState<number | undefined>(undefined);
  if (!data) return <div className="py-20 text-center text-slate-500">Загрузка...</div>;
  const stats = getStats(data, period);
  const barData = Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({
    name: name.length > 8 ? name.slice(0, 7) + "…" : name, full: name, value, fill: CATEGORY_COLORS[name] || "#64748b",
  }));
  const pieData = Object.entries(stats.byCategory).map(([name, value]) => ({ name, value, color: CATEGORY_COLORS[name] || "#64748b" }));

  return (
    <PageShell>
      <FadeItem>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-emerald-400/80">MoneyPulse</p>
            <div className="flex items-center gap-3">
            <h1 className="mt-1 text-3xl font-bold">Аналитика</h1>
            {live && (
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-400 ring-1 ring-emerald-500/25">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live
              </span>
            )}
          </div>
            <p className="mt-1 text-sm text-slate-400">Графики · AI интерпретирует цифры</p>
          </div>
          <div className="flex gap-1.5">
            {[{ l: "Всё", v: undefined }, { l: "30д", v: 30 }, { l: "7д", v: 7 }].map((p) => (
              <button key={String(p.v)} onClick={() => setPeriod(p.v as number | undefined)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${period === p.v ? "bg-white/10 text-white ring-1 ring-white/15" : "text-slate-500"}`}>
                {p.l}
              </button>
            ))}
          </div>
        </div>
      </FadeItem>
      <FadeItem><AIInsightBar data={data} /></FadeItem>

      <FadeItem className="mp-card rounded-2xl p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Сравнение месяцев</h2>
        {(() => {
          const cur = data.settings.currency || "₽";
          const thisR = periodRange("this");
          const lastR = periodRange("last");
          const a = statsInRange(data, thisR.start, thisR.end);
          const b = statsInRange(data, lastR.start, lastR.end);
          const delta = b.expense > 0 ? Math.round(((a.expense - b.expense) / b.expense) * 100) : 0;
          const cmp = categoryComparison(data);
          return (
            <>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-white/[0.04] p-3">
                  <p className="text-[10px] text-slate-500">Этот месяц</p>
                  <p className="text-lg font-bold">{formatMoney(a.expense, cur)}</p>
                </div>
                <div className="rounded-xl bg-white/[0.04] p-3">
                  <p className="text-[10px] text-slate-500">Прошлый</p>
                  <p className="text-lg font-bold">{formatMoney(b.expense, cur)}</p>
                </div>
                <div className="rounded-xl bg-white/[0.04] p-3 col-span-2 sm:col-span-1">
                  <p className="text-[10px] text-slate-500">Δ расходов</p>
                  <p className={`text-lg font-bold ${delta > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                    {delta > 0 ? "+" : ""}{delta}%
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {cmp.slice(0, 6).map((c) => (
                  <div key={c.cat} className="flex items-center justify-between text-sm">
                    <span className="text-slate-300">{c.cat}</span>
                    <span className="tabular-nums text-slate-500">{formatMoney(c.cur, cur)}</span>
                    <span className={`w-14 text-right font-semibold ${
                      c.dir === "up" ? "text-rose-400" : c.dir === "down" ? "text-emerald-400" : "text-slate-500"
                    }`}>
                      {c.dir === "up" ? "↑" : c.dir === "down" ? "↓" : "→"} {c.pct}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          );
        })()}
      </FadeItem>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Доходы" value={`+${stats.income.toLocaleString("ru-RU")}`} icon="↑" color="green" />
        <StatCard title="Расходы" value={`−${stats.expense.toLocaleString("ru-RU")}`} icon="↓" color="red" />
        <StatCard title="Баланс" value={`${stats.balance.toLocaleString("ru-RU")}`} icon="◈" color={stats.balance >= 0 ? "cyan" : "red"} />
        <StatCard title="Сбережения" value={`${stats.savingsRate}%`} icon="◎" color={stats.savingsRate >= 20 ? "green" : "amber"} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <FadeItem className="mp-card rounded-2xl p-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">По категориям</h2>
          <div className="h-56">
            {barData.length === 0 ? <p className="py-16 text-center text-slate-600">Нет данных</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} key={barData.map(b=>b.value).join("-")} layout="vertical" margin={{ left: 8 }}>
                  <XAxis type="number" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} width={64} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => `${Number(v).toLocaleString("ru-RU")} ₽`} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} isAnimationActive animationDuration={1400}>{barData.map((e, i) => <Cell key={i} fill={e.fill} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </FadeItem>
        <FadeItem className="mp-card rounded-2xl p-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Доли</h2>
          <div className="h-56">
            {pieData.length === 0 ? <p className="py-16 text-center text-slate-600">Нет данных</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart key={pieData.map(p=>p.value).join("-")}>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} isAnimationActive animationDuration={1400}>
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => `${Number(v).toLocaleString("ru-RU")} ₽`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </FadeItem>
      </div>
      <FadeItem className="mp-card rounded-2xl p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">14 дней</h2>
        <div className="h-48">
          <LiveAreaChart data={stats.dailySeries} />
        </div>
      </FadeItem>
    </PageShell>
  );
}
