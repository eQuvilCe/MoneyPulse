"use client";

import { useState } from "react";
import { PageShell, FadeItem } from "@/components/motion/PageShell";
import TiltCard from "@/components/motion/TiltCard";
import { LetterReveal } from "@/components/motion/Reveal";
import Link from "next/link";
import { parseBankSms, guessCategory } from "@/lib/smsParser";
import { addTransaction } from "@/lib/storage";
import { useRealtimeData } from "@/hooks/useRealtimeData";
import { formatMoney, dateKey } from "@/lib/types";
import { useToast } from "@/components/Toast";
import { useApp } from "@/components/AppProvider";

const PROVIDERS = [
  { name: "Plaid", region: "US / CA / EU", statusKey: "roadmap" as const },
  { name: "Salt Edge", region: "EU Open Banking", statusKey: "roadmap" as const },
  { name: "Local APIs", region: "UZ / KZ / RU", statusKey: "roadmap" as const },
];

export default function BanksPage() {
  const { data, refresh } = useRealtimeData();
  const toast = useToast();
  const { tr } = useApp();
  const [sms, setSms] = useState("");
  const [parsed, setParsed] = useState<ReturnType<typeof parseBankSms>>(null);
  const [pdfNote, setPdfNote] = useState("");
  const [busy, setBusy] = useState(false);

  const cur = data?.settings.currency || "₽";
  const accounts = data?.accounts || [];

  const tryParse = () => {
    const p = parseBankSms(sms);
    setParsed(p);
    if (!p) toast(tr("smsParseFail"), "err");
  };

  const confirmSms = async () => {
    if (!parsed) return;
    await addTransaction({
      type: parsed.type,
      amount: parsed.amount,
      category: guessCategory(parsed.merchant),
      description: parsed.merchant,
      date: dateKey(),
    });
    toast(
      `${parsed.type === "expense" ? "−" : "+"}${formatMoney(parsed.amount, parsed.currency || cur)} · ${parsed.merchant}`
    );
    setSms("");
    setParsed(null);
    refresh();
  };

  const onPdf = async (file: File) => {
    setBusy(true);
    setPdfNote("");
    try {
      const buf = await file.arrayBuffer();
      const text = new TextDecoder("utf-8", { fatal: false }).decode(buf);
      const matches = text.match(/\d[\d\s.,]{2,12}\s*(?:UZS|USD|RUB|EUR|сум)?/gi) || [];
      if (matches.length < 2) {
        setPdfNote(tr("pdfLooksScan"));
      } else {
        setPdfNote(tr("foundSumsInText", { n: matches.length }));
      }
    } catch {
      setPdfNote(tr("fileReadFail"));
    }
    setBusy(false);
  };

  return (
    <PageShell className="page-accent-rose">
      <FadeItem>
        <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--page-accent)" }}>
          MoneyPulse
        </p>
        <h1 className="mt-1 text-3xl font-bold">
          <LetterReveal text={tr("banksTitle")} />
        </h1>
        <p className="mt-1 text-sm text-slate-400">{tr("banksHint")}</p>
      </FadeItem>

      {/* Card brands */}
      <FadeItem className="grid gap-2 sm:grid-cols-3">
        {[
          { name: "Uzcard", tip: tr("smsPushHere") },
          { name: "Humo", tip: tr("smsPushHere") },
          { name: "Visa / MC", tip: tr("intlCards") },
        ].map((c) => (
          <TiltCard key={c.name} className="mp-card rounded-2xl px-4 py-3 text-center">
            <p className="text-sm font-bold text-white">{c.name}</p>
            <p className="mt-1 text-[11px] text-slate-500">{c.tip}</p>
          </TiltCard>
        ))}
      </FadeItem>

      {/* MoneyPulse Card vision */}
      <FadeItem>
        <div
          className="rounded-2xl border px-4 py-4 text-xs leading-relaxed text-slate-300"
          style={{
            borderColor: "rgba(var(--page-accent-rgb), 0.25)",
            background: "linear-gradient(135deg, rgba(var(--page-accent-rgb),0.12), rgba(var(--page-accent-2-rgb),0.05))",
          }}
        >
        <p className="font-semibold" style={{ color: "var(--page-accent)" }}>
          {tr("cardIdea")}
        </p>
        <p className="mt-1">
          {tr("cardIdeaBody")}
        </p>
        </div>
      </FadeItem>

      {/* How it works */}
      <FadeItem className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-xs leading-relaxed text-emerald-100/90">
        <strong>{tr("banksHowToTitle")}</strong> {tr("banksHowToBody")}
      </FadeItem>

      <FadeItem>
        <TiltCard className="mp-card rounded-2xl p-5">
        <div className="space-y-3">
        <h2 className="text-sm font-bold text-white">{tr("pasteSms")}</h2>
        <p className="text-xs text-slate-500">
          {tr("smsExample")}
        </p>
        <textarea
          value={sms}
          onChange={(e) => {
            setSms(e.target.value);
            setParsed(null);
          }}
          rows={4}
          placeholder={tr("pasteNotificationText")}
          aria-label={tr("pasteSms")}
          className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm outline-none"
          style={{ borderColor: "var(--mp-border)" }}
        />
        <button
          type="button"
          onClick={tryParse}
          disabled={!sms.trim()}
          className="rounded-xl px-4 py-2 text-sm font-semibold ring-1 transition hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            background: "rgba(var(--page-accent-rgb), 0.2)",
            color: "var(--page-accent)",
            boxShadow: "inset 0 0 0 1px rgba(var(--page-accent-rgb), 0.3)",
          }}
        >
          {tr("parse")}
        </button>
        {parsed && (
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm">
            <p className="font-semibold text-white">
              {parsed.type === "expense" ? tr("expense") : tr("incomeLabel")} ·{" "}
              {formatMoney(parsed.amount, parsed.currency || cur)}
            </p>
            <p className="mt-1 text-slate-300">{parsed.merchant}</p>
            <p className="mt-1 text-xs text-slate-500">
              {tr("category")}: {guessCategory(parsed.merchant)}
              {parsed.cardLast4 ? ` · …${parsed.cardLast4}` : ""}
              {parsed.balance != null
                ? ` · ${tr("balance")} ${formatMoney(parsed.balance, parsed.currency || cur)}`
                : ""}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => void confirmSms()}
                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white"
              >
                {tr("confirm")}
              </button>
              <button
                type="button"
                onClick={() => setParsed(null)}
                className="rounded-xl bg-white/5 px-4 py-2 text-sm text-slate-400"
              >
                {tr("cancel")}
              </button>
            </div>
          </div>
        )}
        </div>
        </TiltCard>
      </FadeItem>

      <FadeItem>
        <TiltCard className="mp-card rounded-2xl p-5">
        <div className="space-y-3">
        <h2 className="text-sm font-bold">{tr("pdfStatement")}</h2>
        <p className="text-xs text-slate-500">
          {tr("bestWayCsv")}
        </p>
        <label className="flex cursor-pointer flex-col items-center rounded-2xl border border-dashed border-white/15 px-4 py-10 hover:border-emerald-500/30">
          <span className="text-2xl">📄</span>
          <span className="mt-2 text-sm text-slate-400">
            {busy ? "…" : tr("pdfExcelHere")}
          </span>
          <input
            type="file"
            accept=".pdf,.xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              if (f.name.toLowerCase().endsWith(".csv")) {
                toast(tr("csvGoToImport"));
                return;
              }
              void onPdf(f);
            }}
          />
        </label>
        {pdfNote && <p className="text-xs leading-relaxed text-amber-200/90">{pdfNote}</p>}
        <Link href="/settings" className="text-xs hover:underline" style={{ color: "var(--page-accent)" }}>
          {tr("import")} CSV →
        </Link>
        </div>
        </TiltCard>
      </FadeItem>

      <FadeItem>
        <TiltCard className="mp-card rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold">{tr("accounts")}</h2>
            <p className="mt-1 text-xs text-slate-500">
              {tr("cardBalances")}
            </p>
          </div>
        </div>
        {accounts.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">{tr("noAccounts")}</p>
        ) : (
          <div className="mt-4 space-y-2">
            {accounts.map((a) => (
              <div key={a.id} className="flex justify-between text-sm">
                <span>
                  {a.emoji} {a.name}
                </span>
                <span className="font-semibold tabular-nums">{formatMoney(a.balance, cur)}</span>
              </div>
            ))}
          </div>
        )}
        </TiltCard>
      </FadeItem>

      <FadeItem className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{tr("autoSync")}</p>
        {PROVIDERS.map((p) => (
          <TiltCard key={p.name} className="mp-card rounded-2xl px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-[11px] text-slate-500">{p.region}</p>
              </div>
              <span className="text-[11px] text-slate-500">{tr(p.statusKey)}</span>
            </div>
          </TiltCard>
        ))}
      </FadeItem>
    </PageShell>
  );
}
