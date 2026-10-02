"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { addTransaction } from "@/lib/storage";
import { useToast } from "@/components/Toast";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  CATEGORY_ICONS,
} from "@/lib/types";
import { useApp } from "@/components/AppProvider";

interface Props {
  onAdded: () => void;
  todayIncome: number;
  todayExpense: number;
}

export default function DailyQuickAdd({ onAdded, todayIncome, todayExpense }: Props) {
  const [mode, setMode] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("еда");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState(false);
  const toast = useToast();
  const { tr, lang } = useApp();
  const locale = lang === "en" ? "en-US" : "ru-RU";

  const cats = mode === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const today = new Date().toISOString().slice(0, 10);
  const net = todayIncome - todayExpense;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (!num || num <= 0) return;
    setSaving(true);
    await addTransaction({
      type: mode,
      amount: num,
      category: category as any,
      description: note || tr(mode === "income" ? "defaultIncomeToday" : "defaultExpenseToday"),
      date: today,
    });
    setAmount("");
    setNote("");
    setSaving(false);
    setFlash(true);
    setTimeout(() => setFlash(false), 1200);
    toast(
      tr(mode === "income" ? "quickAddToastIncome" : "quickAddToastExpense", {
        amount: num.toLocaleString(locale),
      })
    );
    onAdded();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden h-full rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-emerald-950/30 p-5 shadow-2xl"
      style={{ transformStyle: "preserve-3d" }}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-emerald-400/80">
            {tr("today")} · {new Date().toLocaleDateString(locale, { day: "numeric", month: "long" })}
          </p>
          <h2 className="mt-1 text-lg font-bold text-white">{tr("quickAddTitle")}</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            {tr("quickAddHint")}
          </p>
        </div>
        <div className="flex gap-2 text-center">
          <div className="rounded-xl bg-emerald-500/10 px-3 py-1.5 ring-1 ring-emerald-500/20">
            <p className="text-[10px] text-slate-500">{tr("todayIncomeWord")}</p>
            <p className="text-sm font-semibold tabular-nums text-emerald-400">
              +{todayIncome.toLocaleString(locale)}
            </p>
          </div>
          <div className="rounded-xl bg-rose-500/10 px-3 py-1.5 ring-1 ring-rose-500/20">
            <p className="text-[10px] text-slate-500">{tr("todayExpenseWord")}</p>
            <p className="text-sm font-semibold tabular-nums text-rose-400">
              −{todayExpense.toLocaleString(locale)}
            </p>
          </div>
          <div className="rounded-xl bg-white/5 px-3 py-1.5 ring-1 ring-white/10">
            <p className="text-[10px] text-slate-500">{tr("todayNetWord")}</p>
            <p className={`text-sm font-semibold tabular-nums ${net >= 0 ? "text-cyan-400" : "text-rose-400"}`}>
              {net >= 0 ? "+" : ""}{net.toLocaleString(locale)}
            </p>
          </div>
        </div>
      </div>

      <div className="relative mt-4 flex gap-2">
        {(["expense", "income"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setCategory(m === "income" ? "зарплата" : "еда");
            }}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
              mode === m
                ? m === "income"
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                  : "bg-rose-500 text-white shadow-lg shadow-rose-500/25"
                : "bg-white/5 text-slate-400 ring-1 ring-white/10"
            }`}
          >
            {m === "income" ? `+ ${tr("addIncome")}` : `− ${tr("addExpense")}`}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="relative mt-4 grid gap-3">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={tr("amount")}
          required
          min="1"
          className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-lg font-semibold text-white outline-none focus:border-emerald-500/40"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-3 text-sm text-white outline-none focus:border-emerald-500/40"
        >
          {cats.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_ICONS[c]} {c}
            </option>
          ))}
        </select>
        <motion.button
          type="submit"
          disabled={saving}
          whileTap={{ scale: 0.96 }}
          className={`rounded-xl px-6 py-3 text-sm font-semibold text-white ${
            mode === "income"
              ? "bg-emerald-500 hover:bg-emerald-400"
              : "bg-rose-500 hover:bg-rose-400"
          } disabled:opacity-50`}
        >
          {saving ? "..." : tr("add")}
        </motion.button>
      </form>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={tr("commentOptional")}
        className="relative mt-2 w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2 text-sm text-white outline-none focus:border-emerald-500/30"
      />

      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-3 right-4 rounded-lg bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-300 ring-1 ring-emerald-500/30"
          >
            {tr("savedCountedInMonth")}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
