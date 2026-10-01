"use client";

import { useEffect, useState } from "react";
import { loadDataAsync, getStats } from "@/lib/storage";
import { FinanceData, formatMoney } from "@/lib/types";
import TransactionForm from "@/components/TransactionForm";
import TransactionList from "@/components/TransactionList";
import StatCard from "@/components/StatCard";
import AIInsightBar from "@/components/AIInsightBar";
import { PageShell, FadeItem } from "@/components/motion/PageShell";
import { useApp } from "@/components/AppProvider";

export default function IncomePage() {
  const [data, setData] = useState<FinanceData | null>(null);
  const { tr, lang } = useApp();
  const refresh = () => loadDataAsync().then(setData);
  useEffect(() => {
    refresh();
  }, []);
  if (!data) return <div className="py-20 text-center text-slate-500">{tr("loading")}</div>;
  const stats = getStats(data);
  const incomeTx = data.transactions.filter((t) => t.type === "income");
  const cur = data.settings.currency || "₽";

  return (
    <PageShell>
      <FadeItem>
        <p className="text-xs font-medium uppercase tracking-widest text-emerald-400/80">MoneyPulse</p>
        <h1 className="mt-1 text-3xl font-bold">{tr("income")}</h1>
        <p className="mt-1 text-sm text-slate-400">
          {lang === "ru" ? "Поступления · AI отслеживает источники" : "Inflows · AI tracks sources"}
        </p>
      </FadeItem>
      <FadeItem>
        <AIInsightBar data={data} />
      </FadeItem>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard title={tr("total")} value={`+${formatMoney(stats.income, cur)}`} icon="↑" color="green" />
        <StatCard
          title={lang === "ru" ? "Операций" : "Ops"}
          value={`${incomeTx.length}`}
          icon="◈"
          color="blue"
        />
        <StatCard
          title={tr("goal")}
          value={
            data.settings.monthlyIncomeGoal
              ? formatMoney(data.settings.monthlyIncomeGoal, cur)
              : "—"
          }
          icon="◎"
          color="cyan"
        />
      </div>
      <FadeItem>
        <TransactionForm type="income" currency={cur} settings={data.settings} onAdded={refresh} />
      </FadeItem>
      <FadeItem>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          {lang === "ru" ? "История" : "History"}
        </h2>
        <TransactionList
          transactions={data.transactions}
          type="income"
          onChange={refresh}
          currency={cur}
        />
      </FadeItem>
    </PageShell>
  );
}
