"use client";

import { useEffect, useMemo, useState } from "react";
import { useRealtimeData } from "@/hooks/useRealtimeData";
import { PageShell, FadeItem } from "@/components/motion/PageShell";
import TiltCard from "@/components/motion/TiltCard";
import { LetterReveal } from "@/components/motion/Reveal";
import { formatMoney, dateKey } from "@/lib/types";
import TransactionList from "@/components/TransactionList";
import { motion } from "framer-motion";
import { useApp } from "@/components/AppProvider";
import { TKey } from "@/lib/i18n";

/** "2025-03-01" → local midnight of that day (new Date("2025-03-01") would be UTC midnight). */
function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const WEEKDAY_KEYS: TKey[] = ["dayMon", "dayTue", "dayWed", "dayThu", "dayFri", "daySat", "daySun"];

export default function CalendarPage() {
  const { tr, lang } = useApp();
  const { data, refresh } = useRealtimeData();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selected, setSelected] = useState(() => dateKey());

  // ← / → flip months when focus isn't in a text field
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return;
      const step = e.key === "ArrowLeft" ? -1 : 1;
      setCursor((c) => new Date(c.getFullYear(), c.getMonth() + step, 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const cur = data?.settings.currency || "₽";

  const byDay = useMemo(() => {
    const map: Record<string, { income: number; expense: number; count: number }> = {};
    if (!data) return map;
    for (const t of data.transactions) {
      if (!map[t.date]) map[t.date] = { income: 0, expense: 0, count: 0 };
      if (t.type === "income") map[t.date].income += t.amount;
      else map[t.date].expense += t.amount;
      map[t.date].count += 1;
    }
    return map;
  }, [data]);

  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    let start = first.getDay(); // 0 Sun
    start = start === 0 ? 6 : start - 1; // Mon-based
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const list: ({ day: number; key: string } | null)[] = [];
    for (let i = 0; i < start; i++) list.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      list.push({ day: d, key });
    }
    return list;
  }, [year, month]);

  // shade relative to the busiest day of the visible month, not of all time
  const maxExp = useMemo(() => {
    let m = 1;
    for (const c of cells) {
      const v = c && byDay[c.key];
      if (v && v.expense > m) m = v.expense;
    }
    return m;
  }, [byDay, cells]);

  const todayKey = dateKey();
  const dayInfo = byDay[selected] || { income: 0, expense: 0, count: 0 };
  const dayTx = data?.transactions.filter((t) => t.date === selected) || [];
  const locale = lang === "en" ? "en-US" : "ru-RU";
  const monthLabel = cursor.toLocaleDateString(locale, { month: "long", year: "numeric" });

  if (!data) return <div className="py-20 text-center text-slate-500">{tr("loading")}</div>;

  return (
    <PageShell className="page-accent-teal">
      <FadeItem>
        <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--page-accent)" }}>
          MoneyPulse
        </p>
        <h1 className="mt-1 text-3xl font-bold">
          <LetterReveal text={tr("calendarHeroTitle")} />
        </h1>
        <p className="mt-1 text-sm text-slate-400">{tr("calendarHeroSubtitle")}</p>
      </FadeItem>

      <FadeItem>
        <TiltCard className="mp-card rounded-2xl p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between rounded-xl mp-heat-drift px-3 py-2">
          <button
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            aria-label={tr("prevMonth")}
            title={tr("prevMonth")}
            className="rounded-lg px-3 py-1.5 text-sm ring-1 ring-white/10 hover:bg-white/5"
          >
            ←
          </button>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold capitalize" aria-live="polite">{monthLabel}</h2>
            {(year !== new Date().getFullYear() || month !== new Date().getMonth() || selected !== todayKey) && (
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
                  setSelected(todayKey);
                }}
                className="rounded-md px-2 py-0.5 text-[11px] ring-1 ring-white/10 transition hover:bg-white/5"
                style={{ color: "var(--page-accent)" }}
              >
                {tr("backToToday")}
              </button>
            )}
          </div>
          <button
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            aria-label={tr("nextMonth")}
            title={tr("nextMonth")}
            className="rounded-lg px-3 py-1.5 text-sm ring-1 ring-white/10 hover:bg-white/5"
          >
            →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-slate-500">
          {WEEKDAY_KEYS.map((w) => (
            <div key={w} className="py-1 font-medium">
              {tr(w)}
            </div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((c, i) => {
            if (!c) return <div key={`e-${i}`} />;
            const info = byDay[c.key];
            const intensity = info ? info.expense / maxExp : 0;
            const isSel = selected === c.key;
            const isToday = c.key === todayKey;
            return (
              <motion.button
                key={c.key}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelected(c.key)}
                aria-pressed={isSel}
                aria-current={isToday ? "date" : undefined}
                aria-label={
                  info
                    ? `${c.day}: +${formatMoney(info.income, cur)} / −${formatMoney(info.expense, cur)}`
                    : String(c.day)
                }
                title={info ? `+${formatMoney(info.income, cur)} · −${formatMoney(info.expense, cur)}` : undefined}
                className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-xs ring-1 ${
                  isSel ? "" : "ring-white/5 hover:ring-white/15"
                }`}
                style={{
                  background:
                    intensity > 0
                      ? `rgba(251, 113, 133, ${0.08 + intensity * 0.35})`
                      : info?.income
                      ? "rgba(var(--page-accent-2-rgb), 0.14)"
                      : "transparent",
                  boxShadow: isSel ? "0 0 0 2px var(--page-accent)" : undefined,
                }}
              >
                <span className={`font-semibold ${isToday ? "" : "text-slate-200"}`} style={isToday ? { color: "var(--page-accent)" } : undefined}>
                  {c.day}
                </span>
                {info && info.count > 0 && (
                  <span className="mt-0.5 h-1 w-1 rounded-full bg-white/50" />
                )}
              </motion.button>
            );
          })}
        </div>
        </TiltCard>
      </FadeItem>

      <FadeItem>
        <TiltCard className="mp-card rounded-2xl p-5">
        <h3 className="text-sm font-semibold">
          {parseDateKey(selected).toLocaleDateString(locale, {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </h3>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-xl p-3" style={{ background: "rgba(var(--page-accent-2-rgb), 0.12)" }}>
            <p className="text-[10px] text-slate-500">{tr("incomeLabel")}</p>
            <p className="font-bold text-emerald-400">+{formatMoney(dayInfo.income, cur)}</p>
          </div>
          <div className="rounded-xl bg-rose-500/10 p-3">
            <p className="text-[10px] text-slate-500">{tr("expense")}</p>
            <p className="font-bold text-rose-400">−{formatMoney(dayInfo.expense, cur)}</p>
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <p className="text-[10px] text-slate-500">{tr("dayBalance")}</p>
            <p className="font-bold" style={{ color: "var(--page-accent)" }}>
              {formatMoney(dayInfo.income - dayInfo.expense, cur)}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <TransactionList
            transactions={dayTx}
            onChange={refresh}
            currency={cur}
            pageSize={10}
          />
        </div>
        </TiltCard>
      </FadeItem>
    </PageShell>
  );
}
