"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, CATEGORY_ICONS, TransactionType, formatMoney, allExpenseCategories, allIncomeCategories, Settings, MAX_AMOUNT, formatMoneyCompact, readAmount, dateKey } from "@/lib/types";
import { addTransaction } from "@/lib/storage";
import { useToast } from "@/components/Toast";
import { useApp } from "@/components/AppProvider";

function suggestCategory(text: string, type: string): string | null {
  const s = text.toLowerCase();
  if (type === "income") {
    if (/зарплат|зп|оклад/.test(s)) return "зарплата";
    if (/фриланс|заказ|клиент/.test(s)) return "фриланс";
    if (/дивиденд|акци|инвест/.test(s)) return "инвестиции";
    if (/подарок|дарен/.test(s)) return "подарок";
    return null;
  }
  if (/кофе|обед|ужин|еда|продукт|ресторан|доставк|пицц|бургер|магнит|пятероч/.test(s)) return "еда";
  if (/такси|метро|бензин|uber|яндекс|транспорт|автобус/.test(s)) return "транспорт";
  if (/кино|бар|клуб|игр|развлеч|концерт/.test(s)) return "развлечения";
  if (/аренда|квартир|ипотек|коммунал|жкх/.test(s)) return "жильё";
  if (/аптек|врач|витамин|больниц/.test(s)) return "здоровье";
  if (/netflix|spotify|подписк|icloud|youtube|telegram/.test(s)) return "подписки";
  if (/курс|учёб|книг|обучен/.test(s)) return "образование";
  if (/куртк|кросс|одежд|обув/.test(s)) return "одежда";
  return null;
}

interface Props {
  type: TransactionType;
  onAdded: () => void;
  currency?: string;
  settings?: Settings;
}

export default function TransactionForm({ type, onAdded, currency = "₽", settings }: Props) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(type === "income" ? "зарплата" : "еда");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(dateKey());
  const [recurring, setRecurring] = useState(false);
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const { tr } = useApp();

  const categories =
    type === "income"
      ? allIncomeCategories(settings)
      : allExpenseCategories(settings);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = readAmount(amount);
    if (num === "too-big") {
      toast(tr("amountTooBig", { max: formatMoneyCompact(MAX_AMOUNT, currency) }), "err");
      return;
    }
    if (!num) return;
    void addTransaction({
      type,
      amount: num,
      category,
      description: description || tr(type === "income" ? "addIncome" : "addExpense"),
      date,
      recurring,
    }).then(() => {
      setAmount("");
      setDescription("");
      setRecurring(false);
      setOpen(false);
      toast(
        type === "income"
          ? `+${formatMoney(num, currency)} ${tr("addIncome").toLowerCase()}${recurring ? " ↻" : ""}`
          : `−${formatMoney(num, currency)} ${tr("addExpense").toLowerCase()}${recurring ? " ↻" : ""}`
      );
      onAdded();
    });
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] py-4 text-sm font-medium text-slate-400 transition hover:border-emerald-500/30 hover:text-emerald-300"
      >
        + {type === "income" ? tr("addIncome") : tr("addExpense")}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
            onClick={() => setOpen(false)}
          >
            <motion.form
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              onSubmit={handleSubmit}
              className="w-full max-w-md space-y-3 rounded-3xl border border-white/10 bg-[#0a0f1a] p-5 shadow-2xl"
            >
              <h3 className="text-lg font-bold">
                {type === "income" ? tr("newIncomeTitle") : tr("newExpenseTitle")}
              </h3>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`${tr("amount")} ${currency}`}
                required
                min="1"
                step="any"
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-emerald-500/40"
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_ICONS[c] || "📦"} {c}
                  </option>
                ))}
              </select>
              <input
                value={description}
                onChange={(e) => {
                  const v = e.target.value;
                  setDescription(v);
                  const sug = suggestCategory(v, type);
                  if (sug) setCategory(sug);
                }}
                placeholder={tr("txDescriptionPlaceholder")}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-emerald-500/40"
              />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm"
              />
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-400">
                <input
                  type="checkbox"
                  checked={recurring}
                  onChange={(e) => setRecurring(e.target.checked)}
                  className="rounded border-white/20"
                />
                {tr("recurringMonthlyLabel")}
              </label>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-xl bg-white/5 py-3 text-sm text-slate-400"
                >
                  {tr("cancel")}
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white hover:bg-emerald-400"
                >
                  {tr("add")}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
