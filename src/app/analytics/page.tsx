"use client";

import { formatNumber } from "@/lib/types";
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
import TiltCard from "@/components/motion/TiltCard";
import { LetterReveal } from "@/components/motion/Reveal";
import { categoryComparison, periodRange, statsInRange } from "@/lib/insights";
import { formatMoney } from "@/lib/types";
import { useApp } from "@/components/AppProvider";

export default function AnalyticsPage() {
  const { tr, lang } = useApp();
  const { data, live } = useRealtimeData(0);
  const [period, setPeriod] = useState<number | undefined>(undefined);
  if (!data) return <div className="py-20 text-center text-slate-500">{tr("loading")}</div>;
  const stats = getStats(data, period);
  const barData = Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({
    name: name.length > 8 ? name.slice(0, 7) + "…" : name, full: name, value, fill: CATEGORY_COLORS[name] || "#64748b",
  }));
  const pieData = Object.entries(stats.byCategory).map(([name, value]) => ({ name, value, color: CATEGORY_COLORS[name] || "#64748b" }));

  return (
    <PageShell className="page-accent-blue">
      <FadeItem>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--page-accent)" }}>
              MoneyPulse
            </p>
            <div className="flex items-center gap-3">
            <h1 className="mt-1 text-3xl font-bold">
              <LetterReveal text={tr("analyticsHeroTitle")} />
            </h1>
            {live && (
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-400 ring-1 ring-emerald-500/25">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live
              </span>
            )}
          </div>
            <p className="mt-1 text-sm text-slate-400">{tr("analyticsChartsHint")}</p>
          </div>
          <div className="flex gap-1.5">
            {[{ l: tr("rangeAll"), v: undefined }, { l: tr("range30d"), v: 30 }, { l: tr("range7d"), v: 7 }].map((p) => (
              <button
                key={String(p.v)}
                onClick={() => setPeriod(p.v as number | undefined)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium ring-1"
                style={
                  period === p.v
                    ? { background: "rgba(var(--page-accent-rgb), 0.18)", color: "#fff", boxShadow: "inset 0 0 0 1px rgba(var(--page-accent-rgb), 0.35)" }
                    : { color: "#64748b", boxShadow: "inset 0 0 0 1px transparent" }
                }
              >
                {p.l}
              </button>
            ))}
          </div>
        </div>
      </FadeItem>
      <FadeItem><AIInsightBar data={data} /></FadeItem>

      <FadeItem>
        <TiltCard className="mp-card rounded-2xl p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{tr("monthComparison")}</h2>
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
                  <p className="text-[10px] text-slate-500">{tr("thisMonth")}</p>
                  <p className="text-lg font-bold">{formatMoney(a.expense, cur)}</p>
                </div>
                <div className="rounded-xl bg-white/[0.04] p-3">
                  <p className="text-[10px] text-slate-500">{tr("lastMonth")}</p>
                  <p className="text-lg font-bold">{formatMoney(b.expense, cur)}</p>
                </div>
                <div className="rounded-xl bg-white/[0.04] p-3 col-span-2 sm:col-span-1">
                  <p className="text-[10px] text-slate-500">{tr("expenseDelta")}</p>
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
        </TiltCard>
      </FadeItem>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TiltCard><StatCard title={tr("income")} value={`+${formatNumber(stats.income, lang === "en" ? "en" : "ru")}`} icon="↑" color="green" /></TiltCard>
        <TiltCard><StatCard title={tr("expenses")} value={`−${formatNumber(stats.expense, lang === "en" ? "en" : "ru")}`} icon="↓" color="red" /></TiltCard>
        <TiltCard><StatCard title={tr("balance")} value={`${formatNumber(stats.balance, lang === "en" ? "en" : "ru")}`} icon="◈" color={stats.balance >= 0 ? "cyan" : "red"} /></TiltCard>
        <TiltCard><StatCard title={tr("savings")} value={`${stats.savingsRate}%`} icon="◎" color={stats.savingsRate >= 20 ? "green" : "amber"} /></TiltCard>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <FadeItem>
          <TiltCard className="mp-card rounded-2xl p-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{tr("byCategoryTitle")}</h2>
          <div className="h-56">
            {barData.length === 0 ? <p className="py-16 text-center text-slate-600">{tr("noData")}</p> : (
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
          </TiltCard>
        </FadeItem>
        <FadeItem>
          <TiltCard className="mp-card rounded-2xl p-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{tr("sharesTitle")}</h2>
          <div className="h-56">
            {pieData.length === 0 ? <p className="py-16 text-center text-slate-600">{tr("noData")}</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart key={pieData.map(p=>p.value).join("-")}>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} isAnimationActive animationDuration={1400} animationBegin={150}>
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => `${Number(v).toLocaleString("ru-RU")} ₽`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          </TiltCard>
        </FadeItem>
      </div>
      <FadeItem>
        <TiltCard className="mp-card rounded-2xl p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{tr("days14Title")}</h2>
        <div className="h-48">
          <LiveAreaChart data={stats.dailySeries} />
        </div>
        </TiltCard>
      </FadeItem>
    </PageShell>
  );
}
