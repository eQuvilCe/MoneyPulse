"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import Link from "next/link";
import PulseRing from "@/components/fx/PulseRing";
import { useApp } from "@/components/AppProvider";

function CountMoney({ value, currency }: { value: number; currency: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / 750);
      setN(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <span className="tabular-nums">
      {new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(Math.round(n))}{" "}
      <span className="text-[0.55em] font-medium text-slate-500">{currency}</span>
    </span>
  );
}

function healthLabel(score: number, ru: boolean, empty: boolean) {
  if (empty) return ru ? "Пока пусто — добавьте доход" : "Empty — add income";
  if (score >= 75) return ru ? "Отлично" : "Strong";
  if (score >= 55) return ru ? "Нормально" : "OK";
  if (score >= 40) return ru ? "На грани" : "Tight";
  return ru ? "Нужно внимание" : "Needs attention";
}

export default function PulseHero({
  balance,
  income,
  expense,
  savingsRate,
  health,
  parts,
  currency,
  flashPulse = false,
}: {
  balance: number;
  income: number;
  expense: number;
  savingsRate: number;
  health: number;
  parts?: { balance: number; savings: number; budgets: number; goals: number; streak: number };
  currency: string;
  flashPulse?: boolean;
}) {
  const { tr, lang } = useApp();
  const ru = lang !== "en";
  const [showHow, setShowHow] = useState(false);
  const good = balance >= 0;
  const isEmpty = income === 0 && expense === 0;
  const label = healthLabel(health, ru, isEmpty);

  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [8, -8]), { stiffness: 120, damping: 18 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-10, 10]), { stiffness: 120, damping: 18 });
  return (
    <motion.div
      ref={ref}
      className="relative h-full overflow-hidden rounded-3xl border border-white/[0.08]"
      style={{
        rotateX: rx,
        rotateY: ry,
        transformStyle: "preserve-3d",
        transformPerspective: 1200,
        background:
          "linear-gradient(145deg, rgba(14,20,32,0.95) 0%, rgba(8,12,22,0.98) 50%, rgba(12,18,30,0.95) 100%)",
        boxShadow:
          "0 25px 80px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.08)",
      }}
      onMouseMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onMouseLeave={() => {
        mx.set(0);
        my.set(0);
      }}
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          background:
            "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.1) 0%, transparent 42%)",
        }}
      />
      <div
        className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full blur-3xl"
        style={{
          background:
            health >= 70
              ? "rgba(52,211,153,0.28)"
              : health >= 40
                ? "rgba(251,191,36,0.22)"
                : "rgba(248,113,113,0.2)",
        }}
      />
      <motion.div
        className="pointer-events-none absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl"
        animate={{ opacity: [0.4, 0.8, 0.4], scale: [1, 1.1, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />

      <div
        className="relative grid gap-6 p-6 sm:p-7 lg:grid-cols-[1.15fr_auto_0.9fr] lg:items-center"
        style={{ transform: "translateZ(20px)" }}
      >
        <div className="order-2 space-y-5 lg:order-1">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {tr("balance") || (ru ? "Баланс месяца" : "Month balance")}
            </p>
            <p
              className={`mt-1.5 font-display text-3xl font-semibold tracking-tight sm:text-4xl ${
                good ? "text-white" : "text-rose-300"
              }`}
              style={{ textShadow: good ? "0 0 40px rgba(56,189,248,0.25)" : "0 0 30px rgba(248,113,113,0.3)" }}
            >
              <CountMoney value={balance} currency={currency} />
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <motion.div
              whileHover={{ y: -3, scale: 1.02 }}
              className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.08] px-3.5 py-3 shadow-[0_8px_32px_-8px_rgba(52,211,153,0.35)]"
            >
              <p className="text-[10px] font-medium uppercase tracking-wider text-emerald-500/80">
                {tr("income") || (ru ? "Доход" : "Income")}
              </p>
              <p className="mt-1 font-display text-lg font-semibold tabular-nums text-emerald-400">
                +
                <CountMoney value={income} currency={currency} />
              </p>
            </motion.div>
            <motion.div
              whileHover={{ y: -3, scale: 1.02 }}
              className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.08] px-3.5 py-3 shadow-[0_8px_32px_-8px_rgba(248,113,113,0.3)]"
            >
              <p className="text-[10px] font-medium uppercase tracking-wider text-rose-400/80">
                {tr("expenses") || (ru ? "Расход" : "Expense")}
              </p>
              <p className="mt-1 font-display text-lg font-semibold tabular-nums text-rose-400">
                −
                <CountMoney value={expense} currency={currency} />
              </p>
            </motion.div>
          </div>

          {isEmpty && (
            <div className="flex flex-wrap gap-2">
              <Link
                href="/income"
                className="rounded-xl bg-emerald-500/20 px-3 py-2 text-xs font-medium text-emerald-200 ring-1 ring-emerald-400/30 transition hover:bg-emerald-500/30 hover:shadow-[0_0_24px_rgba(52,211,153,0.35)]"
              >
                {ru ? "+ Добавить доход" : "+ Add income"}
              </Link>
              <Link
                href="/expenses"
                className="rounded-xl bg-white/[0.05] px-3 py-2 text-xs font-medium text-slate-300 ring-1 ring-white/10 transition hover:bg-white/[0.1]"
              >
                {ru ? "+ Расход" : "+ Expense"}
              </Link>
            </div>
          )}
        </div>

        <div className="order-1 flex flex-col items-center lg:order-2" style={{ transform: "translateZ(40px)" }}>
          <PulseRing score={isEmpty ? 0 : health} size={160} flash={flashPulse} />
          <motion.p
            className="mt-3 text-center text-sm font-medium text-slate-300"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            {label}
          </motion.p>
          <button
            type="button"
            onClick={() => setShowHow((v) => !v)}
            className="mt-1.5 text-[11px] text-slate-500 underline-offset-2 transition hover:text-cyan-400 hover:underline"
          >
            {showHow ? (ru ? "Скрыть разбор" : "Hide breakdown") : ru ? "Из чего Pulse?" : "What's in Pulse?"}
          </button>
        </div>

        <div className="order-3 grid grid-cols-2 gap-3 lg:grid-cols-1">
          {[
            {
              title: tr("savings") || (ru ? "Сбережения" : "Savings"),
              value: `${savingsRate}%`,
              color: "text-cyan-400",
            },
            {
              title: ru ? "Статус" : "Status",
              value: isEmpty
                ? ru
                  ? "Старт"
                  : "Start"
                : good
                  ? tr("statusOk") || (ru ? "В плюсе" : "In plus")
                  : tr("statusBad") || (ru ? "В минусе" : "In minus"),
              color: isEmpty ? "text-slate-400" : good ? "text-emerald-400" : "text-rose-400",
            },
          ].map((m) => (
            <motion.div
              key={m.title}
              whileHover={{ y: -3, scale: 1.02 }}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3.5 backdrop-blur-sm"
              style={{ boxShadow: "0 12px 40px -16px rgba(0,0,0,0.5)" }}
            >
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{m.title}</p>
              <p className={`mt-1 font-display text-2xl font-semibold tabular-nums ${m.color}`}>{m.value}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showHow && parts && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-white/[0.06]"
          >
            <div className="px-6 py-4">
              <p className="mb-3 text-xs text-slate-400">
                {tr("healthExplain") ||
                  (ru
                    ? "Pulse складывается из баланса, сбережений, бюджетов, целей и серии записей."
                    : "Pulse is built from balance, savings, budgets, goals and logging streak.")}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    { key: "balance" as const, max: 30, label: tr("healthBalance") || (ru ? "Баланс" : "Balance") },
                    { key: "savings" as const, max: 30, label: tr("healthSavings") || (ru ? "Сбережения" : "Savings") },
                    { key: "budgets" as const, max: 20, label: tr("healthBudgets") || (ru ? "Бюджеты" : "Budgets") },
                    { key: "goals" as const, max: 15, label: tr("healthGoals") || (ru ? "Цели" : "Goals") },
                    { key: "streak" as const, max: 5, label: tr("healthStreak") || (ru ? "Серия" : "Streak") },
                  ]
                ).map((row, i) => {
                  const val = parts[row.key];
                  const pct = Math.round((val / row.max) * 100);
                  return (
                    <motion.div
                      key={row.key}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <div className="mb-1 flex justify-between text-[11px] text-slate-500">
                        <span>{row.label}</span>
                        <span className="tabular-nums">
                          {val}/{row.max}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, pct)}%` }}
                          transition={{ duration: 0.8, delay: 0.1 + i * 0.05 }}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
