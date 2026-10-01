"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { FinanceData } from "@/lib/types";
import { getQuickInsights, generateAIAnalysis, getHealthScore } from "@/lib/ai";
import { useApp } from "@/components/AppProvider";

export default function AIInsightBar({ data }: { data: FinanceData }) {
  const [health, setHealth] = useState(0);
  const [whyOpen, setWhyOpen] = useState(false);
  const { lang } = useApp();
  const insights = getQuickInsights(data);
  const top = generateAIAnalysis(data)[0];

  useEffect(() => {
    setHealth(getHealthScore(data));
  }, [data]);

  const healthColor =
    health >= 70 ? "text-emerald-400" : health >= 40 ? "text-amber-400" : "text-rose-400";

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0a0e17] p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mp-label">AI Pulse</span>
            <span className={`text-[11px] font-semibold tabular-nums ${healthColor}`}>
              {health}/100
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.9)]" />
              {lang === "ru" ? "анализ активен" : "analysis active"}
            </span>
          </div>
          <h3 className="mt-2 text-base font-semibold tracking-tight text-white">
            {top?.title || (lang === "ru" ? "Ваш финансовый AI" : "Your finance AI")}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
            {top?.message ||
              (lang === "ru"
                ? "Добавь операции — система начнёт строить инсайты."
                : "Add transactions — the system will build insights.")}
          </p>

          {top?.why && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setWhyOpen((v) => !v)}
                className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400/90 hover:text-cyan-300"
              >
                {whyOpen ? (lang === "ru" ? "Скрыть" : "Hide") : "Why?"}
              </button>
              <AnimatePresence>
                {whyOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 space-y-1 border-l border-cyan-400/20 pl-3 text-[12px] leading-relaxed text-slate-500"
                  >
                    {top.why.split(/[.;]/).filter(Boolean).map((line, i) => (
                      <p key={i}>• {line.trim()}</p>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {insights.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {insights.slice(0, 3).map((ins, i) => (
                <span
                  key={i}
                  className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-2 py-1 text-[10px] text-slate-400"
                >
                  {ins}
                </span>
              ))}
            </div>
          )}
        </div>

        <Link
          href="/ai"
          className="mp-btn-ghost shrink-0 self-start px-4 py-2 text-xs font-medium"
        >
          {lang === "ru" ? "Открыть AI" : "Open AI"}
        </Link>
      </div>
    </div>
  );
}
