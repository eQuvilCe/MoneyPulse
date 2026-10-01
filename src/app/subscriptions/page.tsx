"use client";

import { useRealtimeData } from "@/hooks/useRealtimeData";
import { PageShell, FadeItem, Skeleton } from "@/components/motion/PageShell";
import TiltCard from "@/components/motion/TiltCard";
import { LetterReveal } from "@/components/motion/Reveal";
import { formatMoney } from "@/lib/types";
import { getSubscriptions } from "@/lib/insights";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";

export default function SubscriptionsPage() {
  const { data } = useRealtimeData(0);
  const { tr, lang } = useApp();

  if (!data) {
    return (
      <PageShell className="page-accent-rose">
        <FadeItem>
          <Skeleton className="h-16 w-full" />
        </FadeItem>
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <FadeItem>
          <Skeleton className="h-48 w-full" />
        </FadeItem>
      </PageShell>
    );
  }

  const { list, monthly, yearly } = getSubscriptions(data);
  const cur = data.settings.currency || "₽";
  const income = data.transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const pctOfIncome = income > 0 ? Math.round((monthly / income) * 100) : 0;

  return (
    <PageShell className="page-accent-rose">
      <FadeItem>
        <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--page-accent)" }}>
          MoneyPulse
        </p>
        <h1 className="mt-1 text-3xl font-bold">
          <LetterReveal text={tr("subscriptionsTitle")} />
        </h1>
        <p className="mt-1 text-sm text-slate-400">{tr("subscriptionsHint")}</p>
      </FadeItem>

      <FadeItem className="grid gap-3 sm:grid-cols-3">
        <TiltCard className="mp-card rounded-2xl p-5">
          <p className="text-[11px] uppercase text-slate-500">{tr("monthly")}</p>
          <p className="mt-1 text-2xl font-bold text-rose-300">{formatMoney(monthly, cur)}</p>
        </TiltCard>
        <TiltCard className="mp-card rounded-2xl p-5">
          <p className="text-[11px] uppercase text-slate-500">{tr("yearly")}</p>
          <p className="mt-1 text-2xl font-bold text-amber-300">{formatMoney(yearly, cur)}</p>
        </TiltCard>
        <TiltCard className="mp-card rounded-2xl p-5">
          <p className="text-[11px] uppercase text-slate-500">
            {lang === "ru" ? "% от дохода" : "% of income"}
          </p>
          <p className="mt-1 text-2xl font-bold text-cyan-300">{pctOfIncome}%</p>
        </TiltCard>
      </FadeItem>

      {list.length === 0 ? (
        <FadeItem className="rounded-2xl border border-dashed border-white/10 py-14 text-center text-sm text-slate-500">
          <p>{tr("noSubs")}</p>
          <div className="mt-3">
            <Link href="/expenses" className="text-emerald-400 hover:underline">
              {tr("toExpenses")}
            </Link>
          </div>
          <ol className="mx-auto mt-6 max-w-sm space-y-2 text-left text-xs text-slate-400">
            <li>1. {lang === "ru" ? "Открой Расходы → Добавить" : "Open Expenses → Add"}</li>
            <li>
              2.{" "}
              {lang === "ru"
                ? "Поставь галочку «Повторять каждый месяц» или категорию «подписки»"
                : "Check “Repeat monthly” or category “subscriptions”"}
            </li>
            <li>3. {lang === "ru" ? "Они появятся здесь автоматически" : "They appear here automatically"}</li>
          </ol>
        </FadeItem>
      ) : (
        <FadeItem>
          <TiltCard className="mp-card divide-y divide-white/5 rounded-2xl">
            {list.map((s) => (
              <div key={s.name + s.amount} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm font-medium text-white">{s.name || "—"}</p>
                  <p className="text-xs text-slate-500">
                    {s.category} · {tr("monthly")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold tabular-nums text-slate-200">
                    {formatMoney(s.amount, cur)}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {formatMoney(s.amount * 12, cur)} / {lang === "ru" ? "год" : "yr"}
                  </p>
                </div>
              </div>
            ))}
          </TiltCard>
        </FadeItem>
      )}

      {monthly > 0 && (
        <FadeItem>
          <div
            className="rounded-2xl px-4 py-3 text-sm"
            style={{
              background: "rgba(var(--page-accent-rgb),0.1)",
              color: "var(--page-accent)",
              boxShadow: "inset 0 0 0 1px rgba(var(--page-accent-rgb),0.2)",
            }}
          >
            💡 {lang === "ru" ? "Примерно" : "About"} {formatMoney(yearly, cur)}{" "}
            {lang === "ru"
              ? "в год уходит на подписки и регулярные платежи. Раз в квартал сверь, что реально используешь."
              : "per year goes to subscriptions. Review quarterly what you still use."}
          </div>
        </FadeItem>
      )}
    </PageShell>
  );
}
