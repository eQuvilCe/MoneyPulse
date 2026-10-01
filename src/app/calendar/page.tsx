"use client";

import { useMemo, useState } from "react";
import { useRealtimeData } from "@/hooks/useRealtimeData";
import { PageShell, FadeItem } from "@/components/motion/PageShell";
import { formatMoney } from "@/lib/types";
import TransactionList from "@/components/TransactionList";
import { motion } from "framer-motion";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export default function CalendarPage() {
  const { data, refresh } = useRealtimeData(0);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selected, setSelected] = useState(() => new Date().toISOString().slice(0, 10));

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

  const maxExp = useMemo(() => {
    let m = 1;
    Object.values(byDay).forEach((v) => {
      if (v.expense > m) m = v.expense;
    });
    return m;
  }, [byDay]);

  const dayInfo = byDay[selected] || { income: 0, expense: 0, count: 0 };
  const dayTx = data?.transactions.filter((t) => t.date === selected) || [];
  const monthLabel = cursor.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });

  if (!data) return <div className="py-20 text-center text-slate-500">Загрузка...</div>;

  return (
    <PageShell>
      <FadeItem>
        <p className="text-xs font-medium uppercase tracking-widest text-emerald-400/80">MoneyPulse</p>
        <h1 className="mt-1 text-3xl font-bold">Финансовый календарь</h1>
        <p className="mt-1 text-sm text-slate-400">Дни подсвечены по уровню расходов</p>
      </FadeItem>

      <FadeItem className="mp-card rounded-2xl p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            className="rounded-lg px-3 py-1.5 text-sm ring-1 ring-white/10 hover:bg-white/5"
          >
            ←
          </button>
          <h2 className="text-sm font-semibold capitalize">{monthLabel}</h2>
          <button
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            className="rounded-lg px-3 py-1.5 text-sm ring-1 ring-white/10 hover:bg-white/5"
          >
            →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-slate-500">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-1 font-medium">
              {w}
            </div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((c, i) => {
            if (!c) return <div key={`e-${i}`} />;
            const info = byDay[c.key];
            const intensity = info ? info.expense / maxExp : 0;
            const isSel = selected === c.key;
            const isToday = c.key === new Date().toISOString().slice(0, 10);
            return (
              <motion.button
                key={c.key}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelected(c.key)}
                className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-xs ${
                  isSel
                    ? "ring-2 ring-emerald-400/60"
                    : "ring-1 ring-white/5 hover:ring-white/15"
                }`}
                style={{
                  background:
                    intensity > 0
                      ? `rgba(251, 113, 133, ${0.08 + intensity * 0.35})`
                      : info?.income
                      ? "rgba(52, 211, 153, 0.12)"
                      : "transparent",
                }}
              >
                <span className={`font-semibold ${isToday ? "text-emerald-400" : "text-slate-200"}`}>
                  {c.day}
                </span>
                {info && info.count > 0 && (
                  <span className="mt-0.5 h-1 w-1 rounded-full bg-white/50" />
                )}
              </motion.button>
            );
          })}
        </div>
      </FadeItem>

      <FadeItem className="mp-card rounded-2xl p-5">
        <h3 className="text-sm font-semibold">
          {new Date(selected).toLocaleDateString("ru-RU", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </h3>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-xl bg-emerald-500/10 p-3">
            <p className="text-[10px] text-slate-500">Доход</p>
            <p className="font-bold text-emerald-400">+{formatMoney(dayInfo.income, cur)}</p>
          </div>
          <div className="rounded-xl bg-rose-500/10 p-3">
            <p className="text-[10px] text-slate-500">Расход</p>
            <p className="font-bold text-rose-400">−{formatMoney(dayInfo.expense, cur)}</p>
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <p className="text-[10px] text-slate-500">Баланс дня</p>
            <p className="font-bold text-cyan-300">
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
      </FadeItem>
    </PageShell>
  );
}
