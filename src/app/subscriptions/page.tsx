"use client";

import { useRealtimeData } from "@/hooks/useRealtimeData";
import { PageShell, FadeItem } from "@/components/motion/PageShell";
import { formatMoney } from "@/lib/types";
import { getSubscriptions } from "@/lib/insights";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";

export default function SubscriptionsPage() {
  const { data } = useRealtimeData(0);
  const { tr, lang } = useApp();

  if (!data) return <div className="py-20 text-center text-slate-500">{tr("loading")}</div>;

  const { list, monthly, yearly } = getSubscriptions(data);
  const cur = data.settings.currency || "₽";
  const income = data.transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const pctOfIncome = income > 0 ? Math.round((monthly / income) * 100) : 0;

  return (
    <PageShell>
      <FadeItem>
        <p className="text-xs font-medium uppercase tracking-widest text-emerald-400/80">MoneyPulse</p>
        <h1 className="mt-1 text-3xl font-bold">{tr("subscriptionsTitle")}</h1>
        <p className="mt-1 text-sm text-slate-400">{tr("subscriptionsHint")}</p>
      </FadeItem>

      <FadeItem className="grid gap-3 sm:grid-cols-3">
        <div className="mp-card rounded-2xl p-5">
          <p className="text-[11px] uppercase text-slate-500">{tr("monthly")}</p>
          <p className="mt-1 text-2xl font-bold text-rose-300">{formatMoney(monthly, cur)}</p>
        </div>
        <div className="mp-card rounded-2xl p-5">
          <p className="text-[11px] uppercase text-slate-500">{tr("yearly")}</p>
          <p className="mt-1 text-2xl font-bold text-amber-300">{formatMoney(yearly, cur)}</p>
        </div>
        <div className="mp-card rounded-2xl p-5">
          <p className="text-[11px] uppercase text-slate-500">
            {lang === "ru" ? "% от дохода" : "% of income"}
          </p>
          <p className="mt-1 text-2xl font-bold text-cyan-300">{pctOfIncome}%</p>
        </div>
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
        <FadeItem className="mp-card divide-y divide-white/5 rounded-2xl">
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
        </FadeItem>
      )}

      {monthly > 0 && (
        <FadeItem className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
          💡 {lang === "ru" ? "Примерно" : "About"} {formatMoney(yearly, cur)}{" "}
          {lang === "ru"
            ? "в год уходит на подписки и регулярные платежи. Раз в квартал сверь, что реально используешь."
            : "per year goes to subscriptions. Review quarterly what you still use."}
        </FadeItem>
      )}
    </PageShell>
  );
}
