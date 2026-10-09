"use client";

import { formatNumber } from "@/lib/types";
import { useEffect, useState, useRef, useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceDot,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/components/AppProvider";

interface Point {
  date: string;
  income: number;
  expense: number;
}

export default function LiveAreaChart({ data }: { data: Point[] }) {
  const { tr, lang } = useApp();
  const [display, setDisplay] = useState(data);
  const [flash, setFlash] = useState(false);
  const [tick, setTick] = useState(0);
  const prevRef = useRef(JSON.stringify(data));

  useEffect(() => {
    const next = JSON.stringify(data);
    if (next !== prevRef.current) {
      prevRef.current = next;
      setFlash(true);
      setDisplay(data);
      setTick((t) => t + 1);
      const t = setTimeout(() => setFlash(false), 900);
      return () => clearTimeout(t);
    }
  }, [data]);

  const last = display[display.length - 1];
  const totalIn = useMemo(() => display.reduce((s, d) => s + d.income, 0), [display]);
  const totalEx = useMemo(() => display.reduce((s, d) => s + d.expense, 0), [display]);

  return (
    <div className="relative h-full w-full">
      <div className="absolute right-1 top-0 z-10 flex items-center gap-1.5 rounded-full bg-slate-950/80 px-2 py-0.5 ring-1 ring-emerald-500/25 backdrop-blur">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        <span className="text-[9px] font-semibold uppercase tracking-wider text-emerald-400/90">Live</span>
      </div>

      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 z-10 rounded-xl ring-2 ring-emerald-400/25"
          />
        )}
      </AnimatePresence>

      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={display} key={tick}>
          <defs>
            <linearGradient id="rtInc" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="rtExp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fb7185" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#fb7185" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} width={44} />
          <Tooltip
            contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, fontSize: 12 }}
            formatter={(v: number) => `${formatNumber(Number(v), lang === "en" ? "en" : "ru")} ₽`}
          />
          <Area type="monotone" dataKey="income" stroke="#34d399" fill="url(#rtInc)" strokeWidth={2.5} name={tr("addIncome")} animationDuration={900} isAnimationActive dot={false} activeDot={{ r: 5, fill: "#34d399" }} />
          <Area type="monotone" dataKey="expense" stroke="#fb7185" fill="url(#rtExp)" strokeWidth={2.5} name={tr("addExpense")} animationDuration={900} animationBegin={80} isAnimationActive dot={false} activeDot={{ r: 5, fill: "#fb7185" }} />
          {last && last.income > 0 && <ReferenceDot x={last.date} y={last.income} r={3.5} fill="#34d399" stroke="#fff" strokeWidth={1} />}
          {last && last.expense > 0 && <ReferenceDot x={last.date} y={last.expense} r={3.5} fill="#fb7185" stroke="#fff" strokeWidth={1} />}
        </AreaChart>
      </ResponsiveContainer>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex justify-center gap-4">
        <span className="text-[10px] tabular-nums text-emerald-400/70">Σ +{formatNumber(totalIn, lang === "en" ? "en" : "ru")}</span>
        <span className="text-[10px] tabular-nums text-rose-400/70">Σ −{formatNumber(totalEx, lang === "en" ? "en" : "ru")}</span>
      </div>
    </div>
  );
}
