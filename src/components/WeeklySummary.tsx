"use client";

import { motion } from "framer-motion";
import { FinanceData } from "@/lib/types";
import { getStats } from "@/lib/storage";

export default function WeeklySummary({ data }: { data: FinanceData }) {
  const w = getStats(data, 7);
  const bars = w.dailySeries.slice(-7);

  const max = Math.max(...bars.map((b) => b.income + b.expense), 1);

  return (
    <div className="mp-card rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Неделя</h2>
          <p className="mt-1 text-sm text-slate-300">
            <span className="text-emerald-400">+{w.income.toLocaleString("ru-RU")}</span>
            {" · "}
            <span className="text-rose-400">−{w.expense.toLocaleString("ru-RU")}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-500">баланс 7д</p>
          <p className={`text-sm font-bold tabular-nums ${w.balance >= 0 ? "text-cyan-400" : "text-rose-400"}`}>
            {w.balance >= 0 ? "+" : ""}
            {w.balance.toLocaleString("ru-RU")} ₽
          </p>
        </div>
      </div>
      <div className="mt-4 flex h-16 items-end gap-1.5">
        {bars.map((b, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-12 w-full items-end justify-center gap-0.5">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${(b.income / max) * 100}%` }}
                transition={{ delay: i * 0.04, duration: 0.5 }}
                className="w-[40%] min-h-[2px] rounded-t bg-emerald-500/70"
              />
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${(b.expense / max) * 100}%` }}
                transition={{ delay: i * 0.04 + 0.05, duration: 0.5 }}
                className="w-[40%] min-h-[2px] rounded-t bg-rose-500/70"
              />
            </div>
            <span className="text-[9px] text-slate-600">{b.date.slice(3)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
