"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { addTransaction } from "@/lib/storage";
import { useToast } from "@/components/Toast";
import {
  CATEGORY_ICONS,
  MAX_AMOUNT,
  Settings,
  Transaction,
  allExpenseCategories,
  allIncomeCategories,
  compactNumber,
  formatMoney,
  formatMoneyCompact, dateKey } from "@/lib/types";
import { useApp } from "@/components/AppProvider";
import FitText from "@/components/FitText";
import { useHideAmounts, HIDDEN_AMOUNT } from "@/hooks/useHideAmounts";

interface Props {
  onAdded: () => void;
  todayIncome: number;
  todayExpense: number;
  currency?: string;
  settings?: Settings;
  /** Latest transactions — source for the "repeat" shortcuts. */
  recent?: Transaction[];
}

const NOTE_MAX = 80;

/** "1234567,5" → "1 234 567,5": digits grouped while typing, at most 2 decimals. */
function prettyAmount(raw: string): string {
  const cleaned = raw.replace(/[^\d.,]/g, "").replace(/\./g, ",");
  const [int = "", ...rest] = cleaned.split(",");
  const intPart = int.replace(/^0+(?=\d)/, "").slice(0, 16);
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  if (rest.length === 0) return grouped;
  return `${grouped || "0"},${rest.join("").slice(0, 2)}`;
}

function parseAmount(pretty: string): number {
  const n = parseFloat(pretty.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export default function DailyQuickAdd({ onAdded, todayIncome, todayExpense, currency = "₽", settings, recent }: Props) {
  const [mode, setMode] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("еда");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState(false);
  const toast = useToast();
  const { tr, lang } = useApp();
  const { hidden } = useHideAmounts();
  const l = lang === "en" ? "en" : "ru";
  const locale = lang === "en" ? "en-US" : "ru-RU";

  const cats = mode === "income" ? allIncomeCategories(settings) : allExpenseCategories(settings);
  const today = dateKey();
  const net = todayIncome - todayExpense;

  const num = parseAmount(amount);
  const tooBig = num > MAX_AMOUNT;
  const valid = num > 0 && !tooBig;

  // Step buttons sized for the currency: so'm amounts run in the tens of thousands.
  const steps = ["UZS", "сум", "so'm"].includes(currency) ? [10_000, 50_000, 100_000, 500_000] : [100, 500, 1000, 5000];

  // The last few distinct entries of this type — one tap refills the form.
  const repeats = useMemo(() => {
    const seen = new Set<string>();
    const out: Transaction[] = [];
    for (const t of recent || []) {
      if (t.type !== mode || t.amount > MAX_AMOUNT) continue;
      const key = `${t.category}|${t.amount}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(t);
      if (out.length === 3) break;
    }
    return out;
  }, [recent, mode]);

  const show = (n: number) =>
    hidden ? HIDDEN_AMOUNT : Math.abs(n) >= 1e6 ? compactNumber(n, l) : Math.abs(n).toLocaleString(locale);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    try {
      await addTransaction({
        type: mode,
        amount: num,
        category,
        description: note.trim() || tr(mode === "income" ? "defaultIncomeToday" : "defaultExpenseToday"),
        date: today,
      });
    } catch {
      setSaving(false);
      toast(tr("quickAddSaveError"), "err");
      return;
    }
    setAmount("");
    setNote("");
    setSaving(false);
    setFlash(true);
    setTimeout(() => setFlash(false), 1400);
    toast(
      tr(mode === "income" ? "quickAddToastIncome" : "quickAddToastExpense", {
        amount: num >= 1e9 ? formatMoneyCompact(num, currency, l) : formatMoney(num, currency),
      })
    );
    onAdded();
  };

  const amountSize = amount.length > 17 ? "text-lg" : amount.length > 12 ? "text-xl" : "text-2xl";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative flex h-full min-w-0 flex-col overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-emerald-950/30 p-5 shadow-2xl"
    >
      <motion.div
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full blur-3xl"
        animate={{ backgroundColor: mode === "income" ? "rgba(16,185,129,0.16)" : "rgba(244,63,94,0.14)" }}
        transition={{ duration: 0.5 }}
      />
      <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="relative">
        <p className="truncate text-[11px] font-medium uppercase tracking-widest text-emerald-400/80">
          {tr("today")} · {new Date().toLocaleDateString(locale, { day: "numeric", month: "long" })}
        </p>
        <h2 className="mt-1 text-lg font-bold text-white">{tr("quickAddTitle")}</h2>
      </div>

      {/* Today's totals: three equal cells, each number shrinks to fit instead of pushing its neighbours */}
      <div className="relative mt-3 grid grid-cols-3 gap-2 text-center">
        {[
          { label: tr("todayIncomeWord"), value: `+${show(todayIncome)}`, full: todayIncome, box: "bg-emerald-500/10 ring-emerald-500/20", text: "text-emerald-400" },
          { label: tr("todayExpenseWord"), value: `−${show(todayExpense)}`, full: todayExpense, box: "bg-rose-500/10 ring-rose-500/20", text: "text-rose-400" },
          { label: tr("todayNetWord"), value: `${net >= 0 ? "+" : "−"}${show(net)}`, full: net, box: "bg-white/5 ring-white/10", text: net >= 0 ? "text-cyan-400" : "text-rose-400" },
        ].map((c) => (
          <div key={c.label} className={`min-w-0 rounded-xl px-2 py-1.5 ring-1 ${c.box}`}>
            <p className="truncate text-[10px] text-slate-500">{c.label}</p>
            <p className={`text-sm font-semibold tabular-nums ${c.text}`}>
              <FitText className="text-center" title={hidden ? undefined : formatMoney(c.full, currency)}>
                {c.value}
              </FitText>
            </p>
          </div>
        ))}
      </div>

      {/* Expense / income switch */}
      <div className="relative mt-4 grid grid-cols-2 gap-1 rounded-2xl bg-white/[0.04] p-1 ring-1 ring-white/10">
        {(["expense", "income"] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => {
              setMode(m);
              setCategory(m === "income" ? "зарплата" : "еда");
            }}
            className={`relative rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
              mode === m ? "text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {mode === m && (
              <motion.span
                layoutId="quick-add-mode"
                className={`absolute inset-0 rounded-xl ${m === "income" ? "bg-emerald-500 shadow-lg shadow-emerald-500/25" : "bg-rose-500 shadow-lg shadow-rose-500/25"}`}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative">{m === "income" ? `+ ${tr("addIncome")}` : `− ${tr("addExpense")}`}</span>
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="relative mt-3 flex min-w-0 flex-1 flex-col gap-3">
        {/* Amount */}
        <div>
          <div
            className={`flex min-w-0 items-baseline gap-2 rounded-2xl border bg-slate-950/60 px-4 py-3 transition-colors ${
              tooBig
                ? "border-rose-500/60"
                : mode === "income"
                  ? "border-white/10 focus-within:border-emerald-500/50"
                  : "border-white/10 focus-within:border-rose-500/50"
            }`}
          >
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={amount}
              onChange={(e) => setAmount(prettyAmount(e.target.value))}
              placeholder="0"
              aria-label={tr("amount")}
              aria-invalid={tooBig}
              className={`w-full min-w-0 flex-1 bg-transparent font-display font-semibold tabular-nums text-white outline-none placeholder:text-slate-600 ${amountSize}`}
            />
            <span className="shrink-0 text-sm font-medium text-slate-500">{currency}</span>
            {amount && (
              <button
                type="button"
                onClick={() => setAmount("")}
                aria-label={tr("quickAddClear")}
                className="shrink-0 self-center rounded-lg px-1.5 text-slate-500 transition hover:bg-white/5 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
          <p className={`mt-1 min-h-4 truncate text-[11px] ${tooBig ? "text-rose-400" : "text-slate-500"}`} aria-live="polite">
            {tooBig
              ? tr("quickAddTooBig", { max: formatMoneyCompact(MAX_AMOUNT, currency, l) })
              : num >= 1e6
                ? `= ${formatMoneyCompact(num, currency, l)}`
                : ""}
          </p>
          <div className="mt-1 grid grid-cols-4 gap-1.5">
            {steps.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setAmount(prettyAmount(String(Math.min(MAX_AMOUNT, num + s)).replace(".", ",")))}
                className="min-w-0 truncate rounded-lg bg-white/[0.05] px-1 py-1 text-[11px] font-medium tabular-nums text-slate-300 ring-1 ring-white/10 transition hover:bg-white/10"
              >
                +{compactNumber(s, l)}
              </button>
            ))}
          </div>
        </div>

        {/* Category tiles */}
        <div className="-mx-1 grid auto-cols-max grid-flow-col grid-rows-2 gap-1.5 overflow-x-auto px-1 pb-1" role="radiogroup" aria-label={tr("category")}>
          {cats.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={category === c}
              onClick={() => setCategory(c)}
              className={`max-w-[11rem] truncate rounded-xl px-2.5 py-1.5 text-left text-xs transition ${
                category === c
                  ? mode === "income"
                    ? "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/40"
                    : "bg-rose-500/20 text-rose-200 ring-1 ring-rose-400/40"
                  : "bg-white/[0.04] text-slate-400 ring-1 ring-white/10 hover:text-slate-200"
              }`}
            >
              {CATEGORY_ICONS[c] || "📦"} {c}
            </button>
          ))}
        </div>

        {/* Note */}
        <div className="relative">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
            maxLength={NOTE_MAX}
            placeholder={tr("commentOptional")}
            className="w-full min-w-0 rounded-xl border border-white/10 bg-slate-950/40 py-2 pl-4 pr-14 text-sm text-white outline-none focus:border-emerald-500/30"
          />
          {note.length > 0 && (
            <span className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] tabular-nums ${note.length >= NOTE_MAX ? "text-amber-400" : "text-slate-600"}`}>
              {note.length}/{NOTE_MAX}
            </span>
          )}
        </div>

        {/* One-tap repeats */}
        {repeats.length > 0 && (
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="shrink-0 text-[10px] uppercase tracking-wider text-slate-600">{tr("quickAddRepeat")}</span>
            <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
              {repeats.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  title={t.description}
                  onClick={() => {
                    setAmount(prettyAmount(String(t.amount).replace(".", ",")));
                    setCategory(t.category);
                  }}
                  className="shrink-0 whitespace-nowrap rounded-lg bg-white/[0.04] px-2 py-1 text-[11px] tabular-nums text-slate-300 ring-1 ring-white/10 transition hover:bg-white/10"
                >
                  {CATEGORY_ICONS[t.category] || "📦"} {hidden ? HIDDEN_AMOUNT : compactNumber(t.amount, l)}
                </button>
              ))}
            </div>
          </div>
        )}

        <motion.button
          type="submit"
          disabled={saving || !valid}
          whileTap={{ scale: 0.97 }}
          className={`mt-auto min-w-0 rounded-xl px-4 py-3 text-sm font-semibold text-white transition ${
            mode === "income" ? "bg-emerald-500 hover:bg-emerald-400" : "bg-rose-500 hover:bg-rose-400"
          } disabled:cursor-not-allowed disabled:opacity-40`}
        >
          <span className="block truncate">
            {saving
              ? "…"
              : `${tr(mode === "income" ? "quickAddSubmitIncome" : "quickAddSubmitExpense")}${
                  valid ? ` · ${num >= 1e9 ? formatMoneyCompact(num, currency, l) : formatMoney(num, currency)}` : ""
                }`}
          </span>
        </motion.button>
      </form>

      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-x-5 bottom-5 truncate rounded-xl bg-emerald-500 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-emerald-500/30"
          >
            {tr("savedCountedInMonth")}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
