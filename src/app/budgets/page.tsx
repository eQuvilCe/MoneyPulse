"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { loadDataAsync, addBudget, deleteBudget, getBudgetStatus } from "@/lib/storage";
import {
  FinanceData,
  CATEGORY_ICONS,
  formatMoney,
  allExpenseCategories,
} from "@/lib/types";
import { PageShell, FadeItem } from "@/components/motion/PageShell";
import TiltCard from "@/components/motion/TiltCard";
import AIInsightBar from "@/components/AIInsightBar";
import { useToast } from "@/components/Toast";

export default function BudgetsPage() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [cat, setCat] = useState("еда");
  const [limit, setLimit] = useState("");
  const [show, setShow] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const toast = useToast();
  const refresh = () => loadDataAsync().then(setData);
  useEffect(() => {
    refresh();
  }, []);

  if (!data) return <div className="py-20 text-center text-slate-500">Загрузка...</div>;
  const statuses = getBudgetStatus(data);
  const cur = data.settings.currency || "₽";
  const cats = allExpenseCategories(data.settings);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(limit);
    if (!num) return;
    await addBudget({ category: cat, limit: num, period: "month" });
    toast(editId ? "Лимит обновлён" : "Лимит создан");
    setLimit("");
    setShow(false);
    setEditId(null);
    refresh();
  };

  const openEdit = (b: (typeof statuses)[0]) => {
    setEditId(b.id);
    setCat(b.category);
    setLimit(String(b.limit));
    setShow(true);
  };

  return (
    <PageShell>
      <FadeItem>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-emerald-400/80">MoneyPulse</p>
            <h1 className="mt-1 text-3xl font-bold">Бюджеты</h1>
            <p className="mt-1 text-sm text-slate-400">Лимиты · редактирование · AI</p>
          </div>
          <button
            onClick={() => {
              setEditId(null);
              setLimit("");
              setCat("еда");
              setShow(!show);
            }}
            className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/20"
          >
            + Лимит
          </button>
        </div>
      </FadeItem>
      <FadeItem>
        <AIInsightBar data={data} />
      </FadeItem>
      {show && (
        <FadeItem>
          <form onSubmit={handleSave} className="mp-card rounded-2xl p-5">
            <p className="mb-3 text-sm font-medium">{editId ? "Изменить лимит" : "Новый лимит"}</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <select
                value={cat}
                onChange={(e) => setCat(e.target.value)}
                disabled={!!editId}
                className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm"
              >
                {cats.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_ICONS[c] || "📦"} {c}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                placeholder={`Лимит ${cur}`}
                required
                min="1"
                className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm"
              />
              <button
                type="submit"
                className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold hover:bg-amber-400"
              >
                Сохранить
              </button>
            </div>
          </form>
        </FadeItem>
      )}
      {statuses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center text-slate-500">
          Нет бюджетов
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {statuses.map((b, i) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <TiltCard className={`mp-card rounded-2xl p-5 ${b.over ? "ring-1 ring-rose-500/30" : ""}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{CATEGORY_ICONS[b.category] || "📦"}</span>
                  <div>
                    <h3 className="font-semibold capitalize">{b.category}</h3>
                    <p className="text-[11px] text-slate-500">в месяц</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(b)}
                    className="rounded-lg p-1 text-slate-500 hover:text-cyan-400"
                  >
                    ✎
                  </button>
                  <button
                    onClick={async () => {
                      await deleteBudget(b.id);
                      refresh();
                    }}
                    className="rounded-lg p-1 text-slate-600 hover:text-rose-400"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-sm">
                  <span className={b.over ? "text-rose-400" : "text-slate-300"}>
                    {formatMoney(b.spent, cur)}
                  </span>
                  <span className="text-slate-500">{formatMoney(b.limit, cur)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, b.percent)}%` }}
                    transition={{ duration: 0.8 }}
                    className={`h-full rounded-full ${
                      b.over ? "bg-rose-500" : b.percent >= 80 ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-500">
                  {b.over
                    ? `Превышен на ${formatMoney(b.spent - b.limit, cur)}`
                    : `Осталось ${formatMoney(b.remaining, cur)}`}{" "}
                  · {b.percent}%
                </p>
              </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
