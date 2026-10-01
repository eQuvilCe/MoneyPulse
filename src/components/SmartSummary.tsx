"use client";

import { motion } from "framer-motion";
import { FinanceData, formatMoney } from "@/lib/types";
import { buildSmartSummary } from "@/lib/insights";
export default function SmartSummary({ data }: { data: FinanceData }) {
  const s = buildSmartSummary(data);
  const toneCls = {
    warn: "border-amber-500/25 bg-amber-500/10 text-amber-100",
    tip: "border-cyan-500/25 bg-cyan-500/10 text-cyan-100",
    goal: "border-violet-500/25 bg-violet-500/10 text-violet-100",
    ok: "border-emerald-500/25 bg-emerald-500/10 text-emerald-100",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mp-card overflow-hidden rounded-3xl p-5 sm:p-6"
    >
      <p className="text-sm text-slate-400">
        {s.greeting} 👋{" "}
        <span className="font-medium text-white">
          {s.name !== "Пользователь" && s.name !== "User" ? s.name : ""}
        </span>
      </p>
      <h2 className="mt-1 text-lg font-semibold text-slate-200">Ваш финансовый пульс</h2>
      <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-white sm:text-4xl">
        {formatMoney(s.thisMonth.balance, s.currency)}
        <span className="ml-2 text-sm font-medium text-slate-500">баланс месяца</span>
      </p>

      <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { l: "Доход", v: s.thisMonth.income, c: "text-emerald-400", pref: "+" },
          { l: "Расход", v: s.thisMonth.expense, c: "text-rose-400", pref: "−" },
          { l: "Остаток", v: s.thisMonth.savings, c: "text-cyan-400", pref: "" },
        ].map((x) => (
          <div key={x.l} className="rounded-2xl bg-white/[0.04] p-3 ring-1 ring-white/[0.06]">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">{x.l}</p>
            <p className={`mt-1 text-sm font-bold tabular-nums sm:text-base ${x.c}`}>
              {x.pref}
              {formatMoney(x.v, s.currency)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {s.lines.map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.06 }}
            className={`rounded-xl border px-3 py-2.5 text-sm leading-snug ${toneCls[line.tone]}`}
          >
            <span className="mr-1.5">{line.icon}</span>
            {line.text}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
