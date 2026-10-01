"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { loadDataAsync, getStats } from "@/lib/storage";
import { FinanceData, formatMoney } from "@/lib/types";
import {
  generateAIAnalysis,
  getDoctorGreeting,
  answerAIChat,
  AIAdvice,
  ChatMessage,
  getHealthScore,
} from "@/lib/ai";
import { fullAnalysis } from "@/lib/insights";
import { PageShell, FadeItem } from "@/components/motion/PageShell";
import TiltCard from "@/components/motion/TiltCard";
import { LetterReveal } from "@/components/motion/Reveal";
import { useApp } from "@/components/AppProvider";
import { TKey } from "@/lib/i18n";

const typeStyles: Record<AIAdvice["type"], string> = {
  positive: "border-emerald-500/25 bg-emerald-500/8",
  warning: "border-amber-500/25 bg-amber-500/8",
  tip: "border-cyan-500/25 bg-cyan-500/8",
  critical: "border-rose-500/25 bg-rose-500/8",
  insight: "border-violet-500/25 bg-violet-500/8",
};

// `query` stays Russian — it's the keyword the rule-based fallback engine (src/lib/ai.ts)
// matches on when the real LLM is unavailable; only `labelKey` is localized.
const quickQuestions: { labelKey: TKey; query: string }[] = [
  { labelKey: "fullReport", query: "Полный отчёт" },
  { labelKey: "today", query: "Сегодня" },
  { labelKey: "forecast", query: "Прогноз" },
  { labelKey: "budgets", query: "Бюджеты" },
  { labelKey: "topExpenses", query: "Топ расходов" },
  { labelKey: "giveAdvice", query: "Дай совет" },
];

export default function AIPage() {
  const { tr } = useApp();
  const [data, setData] = useState<FinanceData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [whyId, setWhyId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadDataAsync().then((d) => {
      setData(d);
      setMessages([{ role: "assistant", text: getDoctorGreeting(d) }]);
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || !data) return;
    const history = messages;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });
      if (res.ok) {
        const json = await res.json();
        setMessages((m) => [...m, { role: "assistant", text: json.reply }]);
      } else {
        setMessages((m) => [...m, { role: "assistant", text: answerAIChat(text, data) }]);
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: answerAIChat(text, data) }]);
    }
    setLoading(false);
  };

  if (!data) return <div className="py-20 text-center text-slate-500">{tr("loading")}</div>;

  const advice = generateAIAnalysis(data);
  const health = getHealthScore(data);
  const analysis = fullAnalysis(data);
  const cur = analysis.currency;

  return (
    <PageShell className="page-accent-sky">
      <FadeItem>
        <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--page-accent)" }}>
          MoneyPulse AI
        </p>
        <h1 className="mt-1 text-3xl font-bold">
          <LetterReveal text={tr("aiHeroTitle")} />
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {tr("pulse")} {health}/100 {tr("aiNotChatbot")}
        </p>
      </FadeItem>

      {/* Full analysis */}
      <FadeItem>
        <TiltCard className="mp-card rounded-2xl p-5">
        <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-white">Analyze my finances</h2>
          <button
            onClick={() => void send("Полный отчёт")}
            className="rounded-xl px-3 py-1.5 text-xs font-semibold ring-1"
            style={{
              background: "rgba(var(--page-accent-rgb), 0.2)",
              color: "var(--page-accent)",
              boxShadow: "inset 0 0 0 1px rgba(var(--page-accent-rgb), 0.3)",
            }}
          >
            {tr("runInChat")}
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase text-rose-400">{tr("threeProblems")}</p>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-300">
              {analysis.problems.map((p, i) => (
                <li key={i}>• {p}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase text-emerald-400">{tr("threeOpportunities")}</p>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-300">
              {analysis.opportunities.map((p, i) => (
                <li key={i}>• {p}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-xl bg-white/[0.04] p-4 ring-1 ring-white/5">
          <p className="text-[11px] font-semibold uppercase text-amber-400">{tr("unusualExpenses")}</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-400">
            {analysis.unusual.map((u, i) => (
              <li key={i}>{u}</li>
            ))}
          </ul>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 text-sm">
          <div className="rounded-xl bg-white/[0.04] p-3">
            <p className="text-[10px] text-slate-500">{tr("thisMonth")}</p>
            <p className="font-bold">{formatMoney(analysis.comparison.thisExpense, cur)}</p>
          </div>
          <div className="rounded-xl bg-white/[0.04] p-3">
            <p className="text-[10px] text-slate-500">{tr("lastMonth")}</p>
            <p className="font-bold">{formatMoney(analysis.comparison.lastExpense, cur)}</p>
          </div>
          <div className="rounded-xl bg-white/[0.04] p-3">
            <p className="text-[10px] text-slate-500">{tr("expenseDelta")}</p>
            <p
              className={`font-bold ${
                analysis.comparison.deltaPct > 0 ? "text-rose-400" : "text-emerald-400"
              }`}
            >
              {analysis.comparison.deltaPct > 0 ? "+" : ""}
              {analysis.comparison.deltaPct}%
            </p>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase text-cyan-400">
            {tr("forecastTillMonthEnd")}
          </p>
          <p className="mt-1 text-xl font-bold text-white">~{formatMoney(analysis.forecast, cur)}</p>
        </div>

        <div
          className="rounded-xl border p-4"
          style={{ borderColor: "rgba(var(--page-accent-rgb), 0.2)", background: "rgba(var(--page-accent-rgb), 0.1)" }}
        >
          <p className="text-[11px] font-semibold uppercase" style={{ color: "var(--page-accent)" }}>
            Action plan
          </p>
          <ul className="mt-2 space-y-1 text-sm text-slate-200">
            {analysis.plan.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
        </div>
        </TiltCard>
      </FadeItem>

      {/* Advice cards with Why */}
      <div className="space-y-2">
        {advice.map((a) => (
          <FadeItem key={a.id}>
            <TiltCard className={`rounded-2xl border p-4 ${typeStyles[a.type]}`}>
              <p className="text-sm font-semibold">
                {a.icon} {a.title}
              </p>
              <p className="mt-1 text-sm text-slate-300">{a.message}</p>
              {a.why && (
                <>
                  <button
                    onClick={() => setWhyId(whyId === a.id ? null : a.id)}
                    className="mt-2 text-[11px] font-semibold"
                    style={{ color: "var(--page-accent)" }}
                  >
                    {whyId === a.id ? tr("hideWhy") : "Why?"}
                  </button>
                  {whyId === a.id && (
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{a.why}</p>
                  )}
                </>
              )}
            </TiltCard>
          </FadeItem>
        ))}
      </div>

      {/* Chat */}
      <FadeItem className="mp-card flex h-[420px] flex-col rounded-2xl">
        <div className="border-b border-white/5 px-4 py-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {tr("chatTitle")}
          </h2>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
                  m.role === "user" ? "ml-auto text-sky-50" : "bg-white/[0.05] text-slate-200"
                }`}
                style={m.role === "user" ? { background: "rgba(var(--page-accent-rgb), 0.2)" } : undefined}
              >
                {m.text}
              </motion.div>
            ))}
          </AnimatePresence>
          {loading && (
            <div className="flex items-center gap-1.5 px-1">
              {[0, 1, 2].map((d) => (
                <motion.span
                  key={d}
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: "var(--page-accent)" }}
                  animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay: d * 0.15 }}
                />
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <div className="flex flex-wrap gap-1.5 border-t border-white/5 px-3 py-2">
          {quickQuestions.map((q) => (
            <button
              key={q.labelKey}
              onClick={() => void send(q.query)}
              className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-slate-400 ring-1 ring-white/10 hover:text-white"
            >
              {tr(q.labelKey)}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="flex gap-2 border-t border-white/5 p-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={tr("askAboutMoney")}
            className="flex-1 rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2.5 text-sm outline-none focus:border-sky-400/40"
          />
          <button
            type="submit"
            className="rounded-xl px-4 py-2.5 text-sm font-semibold"
            style={{ background: "var(--page-accent)", color: "#042f2e" }}
          >
            →
          </button>
        </form>
      </FadeItem>
    </PageShell>
  );
}
