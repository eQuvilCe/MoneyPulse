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
import { LetterReveal } from "@/components/motion/Reveal";
import AIInsightBar from "@/components/AIInsightBar";
import { useToast } from "@/components/Toast";
import { useApp } from "@/components/AppProvider";

export default function BudgetsPage() {
  const { tr } = useApp();
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

  if (!data) return <div className="py-20 text-center text-slate-500">{tr("loading")}</div>;
  const statuses = getBudgetStatus(data);
  const cur = data.settings.currency || "₽";
  const cats = allExpenseCategories(data.settings);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(limit);
    if (!num) return;
    await addBudget({ category: cat, limit: num, period: "month" });
    toast(editId ? tr("limitUpdated") : tr("limitCreated"));
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
    <PageShell className="page-accent-amber">
      <FadeItem>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--page-accent)" }}>
              MoneyPulse
            </p>
            <h1 className="mt-1 text-3xl font-bold">
              <LetterReveal text={tr("budgetsHeroTitle")} />
            </h1>
            <p className="mt-1 text-sm text-slate-400">{tr("budgetsHeroSubtitle")}</p>
          </div>
          <button
            onClick={() => {
              setEditId(null);
              setLimit("");
              setCat("еда");
              setShow(!show);
            }}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg"
            style={{
              background: "linear-gradient(135deg, var(--page-accent), var(--page-accent-2))",
              boxShadow: "0 8px 24px rgba(var(--page-accent-rgb), 0.25)",
            }}
          >
            {tr("addLimitButton")}
          </button>
        </div>
      </FadeItem>
      <FadeItem>
        <AIInsightBar data={data} />
      </FadeItem>
      {show && (
        <FadeItem>
          <TiltCard className="mp-card rounded-2xl p-5">
          <form onSubmit={handleSave}>
            <p className="mb-3 text-sm font-medium">{editId ? tr("editLimit") : tr("newLimit")}</p>
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
                placeholder={tr("limitFor", { cur })}
                required
                min="1"
                className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm"
              />
              <button
                type="submit"
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
                style={{ background: "linear-gradient(135deg, var(--page-accent), var(--page-accent-2))" }}
              >
                {tr("save")}
              </button>
            </div>
          </form>
          </TiltCard>
        </FadeItem>
      )}
      {statuses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center text-slate-500">
          {tr("noBudgets")}
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
                    <p className="text-[11px] text-slate-500">{tr("perMonthLabel")}</p>
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
                    ? tr("overBudgetBy", { v: formatMoney(b.spent - b.limit, cur) })
                    : tr("remainingAmount", { v: formatMoney(b.remaining, cur) })}{" "}
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
