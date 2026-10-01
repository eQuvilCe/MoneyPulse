"use client";

import { useState } from "react";
import { importTransactions } from "@/lib/storage";
import { useToast } from "@/components/Toast";
import { EXPENSE_CATEGORIES, ExpenseCategory } from "@/lib/types";

function parseCSV(text: string) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const sep = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(sep).map((h) => h.trim().toLowerCase().replace(/"/g, ""));
  const rows: { date: string; amount: number; description: string; type: "income" | "expense"; category: ExpenseCategory }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
    const get = (...keys: string[]) => {
      for (const k of keys) {
        const idx = headers.findIndex((h) => h.includes(k));
        if (idx >= 0 && cols[idx]) return cols[idx];
      }
      return "";
    };
    const amountRaw = get("amount", "сумма", "sum", "value");
    const amount = Math.abs(parseFloat(amountRaw.replace(/\s/g, "").replace(",", ".")));
    if (!amount || isNaN(amount)) continue;
    let date = get("date", "дата", "time");
    if (date.includes(".")) {
      const [d, m, y] = date.split(".");
      date = `${y?.length === 2 ? "20" + y : y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    } else if (date.includes("/")) {
      const parts = date.split("/");
      date = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }
    if (!/^\d{4}-\d{2}-\d{2}/.test(date)) date = new Date().toISOString().slice(0, 10);
    const desc = get("description", "описан", "memo", "detail", "назначен") || "Импорт";
    const typeHint = get("type", "тип");
    const signed = parseFloat(amountRaw.replace(/\s/g, "").replace(",", "."));
    const type: "income" | "expense" =
      typeHint.includes("income") || typeHint.includes("доход") || signed > 0 && typeHint === ""
        ? signed < 0 || typeHint.includes("expense") || typeHint.includes("расход")
          ? "expense"
          : "income"
        : signed < 0
        ? "expense"
        : typeHint.includes("доход")
        ? "income"
        : "expense";
    // banks often: positive = credit
    let finalType: "income" | "expense" = "expense";
    if (typeHint) {
      finalType = /доход|income|credit/i.test(typeHint) ? "income" : "expense";
    } else if (signed < 0) {
      finalType = "expense";
    } else {
      // ambiguous: treat positive as expense if description looks like spend
      finalType = /зарплат|salary|income|перевод от/i.test(desc) ? "income" : "expense";
    }
    const catRaw = get("category", "категор");
    const category = (EXPENSE_CATEGORIES.includes(catRaw as ExpenseCategory) ? catRaw : "другое") as ExpenseCategory;
    rows.push({ date: date.slice(0, 10), amount, description: desc, type: finalType, category });
  }
  return rows;
}

export default function CsvImport({ onDone }: { onDone: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(0);

  const onFile = async (file: File) => {
    setBusy(true);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (!rows.length) {
        toast("Не удалось разобрать CSV", "err");
        setBusy(false);
        return;
      }
      setPreview(rows.length);
      await importTransactions(
        rows.map((r) => ({
          type: r.type,
          amount: r.amount,
          category: r.category,
          description: r.description,
          date: r.date,
        }))
      );
      toast(`Импортировано ${rows.length} операций`);
      onDone();
    } catch {
      toast("Ошибка импорта", "err");
    }
    setBusy(false);
  };

  return (
    <div className="mp-card rounded-2xl p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Импорт CSV</h2>
      <p className="mt-1 text-xs text-slate-500">
        Выписка банка: колонки date / amount / description (или дата, сумма, описание)
      </p>
      <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-8 transition hover:border-emerald-500/40 hover:bg-emerald-500/5">
        <span className="text-2xl">📄</span>
        <span className="mt-2 text-sm text-slate-300">{busy ? "Импорт..." : "Выбрать CSV"}</span>
        <input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
          }}
        />
      </label>
      {preview > 0 && <p className="mt-2 text-center text-xs text-emerald-400">Последний импорт: {preview} строк</p>}
    </div>
  );
}
