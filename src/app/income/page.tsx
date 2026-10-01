"use client";

import { useEffect, useState } from "react";
import { loadDataAsync, getStats } from "@/lib/storage";
import { FinanceData, formatMoney } from "@/lib/types";
import TransactionForm from "@/components/TransactionForm";
import TransactionList from "@/components/TransactionList";
import StatCard from "@/components/StatCard";
import AIInsightBar from "@/components/AIInsightBar";
import { PageShell, FadeItem, Skeleton } from "@/components/motion/PageShell";
import TiltCard from "@/components/motion/TiltCard";
import { LetterReveal } from "@/components/motion/Reveal";
import { useApp } from "@/components/AppProvider";

export default function IncomePage() {
  const [data, setData] = useState<FinanceData | null>(null);
  const { tr, lang } = useApp();
  const refresh = () => loadDataAsync().then(setData);
  useEffect(() => {
    refresh();
  }, []);
  if (!data) {
    return (
      <PageShell className="page-accent-emerald">
        <FadeItem>
          <Skeleton className="h-16 w-full" />
        </FadeItem>
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <FadeItem>
          <Skeleton className="h-56 w-full" />
        </FadeItem>
      </PageShell>
    );
  }
  const stats = getStats(data);
  const incomeTx = data.transactions.filter((t) => t.type === "income");
  const cur = data.settings.currency || "₽";

  return (
    <PageShell className="page-accent-emerald">
      <FadeItem>
        <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--page-accent)" }}>
          MoneyPulse
        </p>
        <h1 className="mt-1 text-3xl font-bold">
          <LetterReveal text={tr("income")} />
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {lang === "ru" ? "Поступления · AI отслеживает источники" : "Inflows · AI tracks sources"}
        </p>
      </FadeItem>
      <FadeItem>
        <AIInsightBar data={data} />
      </FadeItem>
      <div className="grid gap-3 sm:grid-cols-3">
        <TiltCard>
          <StatCard title={tr("total")} value={`+${formatMoney(stats.income, cur)}`} icon="↑" color="green" />
        </TiltCard>
        <TiltCard>
          <StatCard
            title={lang === "ru" ? "Операций" : "Ops"}
            value={`${incomeTx.length}`}
            icon="◈"
            color="blue"
          />
        </TiltCard>
        <TiltCard>
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
        </TiltCard>
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
