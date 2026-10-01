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

const typeStyles: Record<AIAdvice["type"], string> = {
  positive: "border-emerald-500/25 bg-emerald-500/8",
  warning: "border-amber-500/25 bg-amber-500/8",
  tip: "border-cyan-500/25 bg-cyan-500/8",
  critical: "border-rose-500/25 bg-rose-500/8",
  insight: "border-violet-500/25 bg-violet-500/8",
};

const quickQuestions = [
  "Полный отчёт",
  "Analyze my finances",
  "Сегодня",
  "Прогноз",
  "Бюджеты",
  "Топ расходов",
  "Дай совет",
];

export default function AIPage() {
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
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
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

  if (!data) return <div className="py-20 text-center text-slate-500">Загрузка...</div>;

  const advice = generateAIAnalysis(data);
  const health = getHealthScore(data);
  const analysis = fullAnalysis(data);
  const cur = analysis.currency;

  return (
    <PageShell>
      <FadeItem>
        <p className="text-xs font-medium uppercase tracking-widest text-emerald-400/80">MoneyPulse AI</p>
        <h1 className="mt-1 text-3xl font-bold">Анализ финансов</h1>
        <p className="mt-1 text-sm text-slate-400">
          Пульс {health}/100 · не chatbot, а вывод из твоих цифр
        </p>
      </FadeItem>

      {/* Full analysis */}
      <FadeItem className="mp-card space-y-5 rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-white">Analyze my finances</h2>
          <button
            onClick={() => void send("Полный отчёт")}
            className="rounded-xl bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/30"
          >
            Запустить в чате
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase text-rose-400">3 проблемы</p>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-300">
              {analysis.problems.map((p, i) => (
                <li key={i}>• {p}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase text-emerald-400">3 возможности</p>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-300">
              {analysis.opportunities.map((p, i) => (
                <li key={i}>• {p}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-xl bg-white/[0.04] p-4 ring-1 ring-white/5">
          <p className="text-[11px] font-semibold uppercase text-amber-400">Необычные расходы</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-400">
            {analysis.unusual.map((u, i) => (
              <li key={i}>{u}</li>
            ))}
          </ul>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 text-sm">
          <div className="rounded-xl bg-white/[0.04] p-3">
            <p className="text-[10px] text-slate-500">Этот месяц</p>
            <p className="font-bold">{formatMoney(analysis.comparison.thisExpense, cur)}</p>
          </div>
          <div className="rounded-xl bg-white/[0.04] p-3">
            <p className="text-[10px] text-slate-500">Прошлый</p>
            <p className="font-bold">{formatMoney(analysis.comparison.lastExpense, cur)}</p>
          </div>
          <div className="rounded-xl bg-white/[0.04] p-3">
            <p className="text-[10px] text-slate-500">Δ расходов</p>
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
            Прогноз расходов до конца месяца
          </p>
          <p className="mt-1 text-xl font-bold text-white">~{formatMoney(analysis.forecast, cur)}</p>
        </div>

        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
          <p className="text-[11px] font-semibold uppercase text-emerald-400">Action plan</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-200">
            {analysis.plan.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      </FadeItem>

      {/* Advice cards with Why */}
      <div className="space-y-2">
        {advice.map((a) => (
          <FadeItem key={a.id}>
            <div className={`rounded-2xl border p-4 ${typeStyles[a.type]}`}>
              <p className="text-sm font-semibold">
                {a.icon} {a.title}
              </p>
              <p className="mt-1 text-sm text-slate-300">{a.message}</p>
              {a.why && (
                <>
                  <button
                    onClick={() => setWhyId(whyId === a.id ? null : a.id)}
                    className="mt-2 text-[11px] font-semibold text-cyan-400"
                  >
                    {whyId === a.id ? "Скрыть Why?" : "Why?"}
                  </button>
                  {whyId === a.id && (
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{a.why}</p>
                  )}
                </>
              )}
            </div>
          </FadeItem>
        ))}
      </div>

      {/* Chat */}
      <FadeItem className="mp-card flex h-[420px] flex-col rounded-2xl">
        <div className="border-b border-white/5 px-4 py-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Чат · MoneyPulse AI
          </h2>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
                m.role === "user"
                  ? "ml-auto bg-emerald-500/20 text-emerald-50"
                  : "bg-white/[0.05] text-slate-200"
              }`}
            >
              {m.text}
            </div>
          ))}
          {loading && <p className="text-xs text-slate-500">Думаю…</p>}
          <div ref={bottomRef} />
        </div>
        <div className="flex flex-wrap gap-1.5 border-t border-white/5 px-3 py-2">
          {quickQuestions.map((q) => (
            <button
              key={q}
              onClick={() => void send(q)}
              className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-slate-400 ring-1 ring-white/10 hover:text-white"
            >
              {q}
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
            placeholder="Спроси про деньги…"
            className="flex-1 rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2.5 text-sm outline-none focus:border-emerald-500/40"
          />
          <button
            type="submit"
            className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white"
          >
            →
          </button>
        </form>
      </FadeItem>
    </PageShell>
  );
}
