"use client";

import { motion } from "framer-motion";
import { FinanceData } from "@/lib/types";

function dayKey(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return {
    key: d.toISOString().slice(0, 10),
    label: d.toLocaleDateString("ru-RU", { weekday: "short" }),
    num: d.getDate(),
    isToday: offset === 0,
  };
}

interface Props {
  data: FinanceData;
  selected: string;
  onSelect: (date: string) => void;
}

export default function DayStrip({ data, selected, onSelect }: Props) {
  const days = Array.from({ length: 14 }, (_, i) => dayKey(13 - i));

  const spent = (key: string) =>
    data.transactions
      .filter((t) => t.date === key && t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);

  const income = (key: string) =>
    data.transactions
      .filter((t) => t.date === key && t.type === "income")
      .reduce((s, t) => s + t.amount, 0);

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      {days.map((d) => {
        const ex = spent(d.key);
        const inc = income(d.key);
        const active = selected === d.key;
        const has = ex > 0 || inc > 0;
        return (
          <motion.button
            key={d.key}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(d.key)}
            className={`relative flex min-w-[52px] flex-col items-center rounded-2xl px-2.5 py-2.5 transition ${
              active
                ? "bg-emerald-500/20 ring-1 ring-emerald-500/40"
                : "bg-white/[0.03] ring-1 ring-white/[0.05] hover:bg-white/[0.06]"
            }`}
          >
            <span className={`text-[10px] uppercase ${active ? "text-emerald-400" : "text-slate-500"}`}>
              {d.label}
            </span>
            <span className={`mt-0.5 text-sm font-bold tabular-nums ${active ? "text-white" : "text-slate-300"}`}>
              {d.num}
            </span>
            {has && (
              <span className="mt-1 flex gap-0.5">
                {inc > 0 && <span className="h-1 w-1 rounded-full bg-emerald-400" />}
                {ex > 0 && <span className="h-1 w-1 rounded-full bg-rose-400" />}
              </span>
            )}
            {d.isToday && !active && (
              <span className="absolute -bottom-0.5 h-0.5 w-3 rounded-full bg-emerald-500/60" />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
