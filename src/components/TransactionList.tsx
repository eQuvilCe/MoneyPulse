"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Transaction, CATEGORY_ICONS, CATEGORY_COLORS, formatMoney, MAX_AMOUNT, formatMoneyCompact, readAmount } from "@/lib/types";
import { deleteTransaction, updateTransaction } from "@/lib/storage";
import { useApp } from "@/components/AppProvider";
import { useToast } from "@/components/Toast";

interface Props {
  transactions: Transaction[];
  type?: "income" | "expense";
  onChange: () => void;
  limit?: number;
  currency?: string;
  pageSize?: number;
}

export default function TransactionList({
  transactions,
  type,
  onChange,
  limit,
  currency = "₽",
  pageSize = 15,
}: Props) {
  const [page, setPage] = useState(0);
  const [editId, setEditId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editCat, setEditCat] = useState("");
  const [editDate, setEditDate] = useState("");
  const { tr } = useApp();
  const toast = useToast();

  const filtered = useMemo(() => {
    let list = type ? transactions.filter((t) => t.type === type) : transactions;
    if (limit) list = list.slice(0, limit);
    return list;
  }, [transactions, type, limit]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSafe = Math.min(page, totalPages - 1);
  const slice = filtered.slice(pageSafe * pageSize, pageSafe * pageSize + pageSize);

  const startEdit = (t: Transaction) => {
    setEditId(t.id);
    setEditAmount(String(t.amount));
    setEditDesc(t.description);
    setEditCat(t.category);
    setEditDate(t.date);
  };

  const saveEdit = async () => {
    if (!editId) return;
    const num = readAmount(editAmount);
    if (num === "too-big") {
      toast(tr("amountTooBig", { max: formatMoneyCompact(MAX_AMOUNT, currency) }), "err");
      return;
    }
    if (!num) return;
    await updateTransaction(editId, {
      amount: num,
      description: editDesc,
      category: editCat,
      date: editDate,
    });
    setEditId(null);
    onChange();
  };

  const remove = async (id: string) => {
    await deleteTransaction(id);
    onChange();
  };

  if (!filtered.length) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 py-12 text-center text-sm text-slate-500">
        {tr("noTransactions")}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <AnimatePresence mode="popLayout">
        {slice.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="mp-card rounded-xl p-3"
          >
            {editId === t.id ? (
              <div className="space-y-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    type="number"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm"
                    placeholder={tr("amount")}
                  />
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm"
                  />
                  <input
                    value={editCat}
                    onChange={(e) => setEditCat(e.target.value)}
                    className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm"
                    placeholder={tr("category")}
                  />
                  <input
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm"
                    placeholder={tr("txDescriptionPlaceholder")}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => void saveEdit()}
                    className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    {tr("save")}
                  </button>
                  <button
                    onClick={() => setEditId(null)}
                    className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-slate-400"
                  >
                    {tr("cancel")}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
                  style={{ background: (CATEGORY_COLORS[t.category] || "#64748b") + "22" }}
                >
                  {CATEGORY_ICONS[t.category] || "📦"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {t.description}
                    {t.recurring && (
                      <span className="ml-1.5 text-[10px] text-cyan-400">↻</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">
                    {t.category} · {t.date}
                  </p>
                </div>
                <p
                  className={`shrink-0 text-sm font-bold tabular-nums ${
                    t.type === "income" ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {t.type === "income" ? "+" : "−"}
                  {formatMoney(t.amount, currency).replace(/^[−+]/, "")}
                </p>
                <button
                  onClick={() => startEdit(t)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-cyan-400"
                  title={tr("editAction")}
                >
                  ✎
                </button>
                <button
                  onClick={() => void remove(t.id)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-rose-400"
                  title={tr("remove")}
                >
                  🗑️
                </button>
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {!limit && filtered.length > pageSize && (
        <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
          <button
            disabled={pageSafe <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded-lg px-3 py-1.5 ring-1 ring-white/10 disabled:opacity-30"
          >
            {tr("backNav")}
          </button>
          <span>
            {tr("txPageIndicator", { page: pageSafe + 1, total: totalPages, count: filtered.length })}
          </span>
          <button
            disabled={pageSafe >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            className="rounded-lg px-3 py-1.5 ring-1 ring-white/10 disabled:opacity-30"
          >
            {tr("nextNav")}
          </button>
        </div>
      )}
    </div>
  );
}
