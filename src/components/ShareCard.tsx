"use client";

import { formatNumber } from "@/lib/types";
import { useRef, useState } from "react";
import { FinanceData } from "@/lib/types";
import { getHealthScore } from "@/lib/ai";
import { motion } from "framer-motion";
import { useApp } from "@/components/AppProvider";

export default function ShareCard({ data }: { data: FinanceData }) {
  const { tr, lang } = useApp();
  const ref = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const health = getHealthScore(data);
  const goal = data.goals[0];
  const progress = goal
    ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
    : 0;
  const streak = data.settings.streak || 0;

  const text = goal
    ? tr("shareTextWithGoal", { emoji: goal.emoji, title: goal.title, progress, health, streak })
    : tr("shareTextNoGoal", { health, streak });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "MoneyPulse", text });
        return;
      } catch {
        /* fallthrough */
      }
    }
    void copy();
  };

  return (
    <div className="mp-card rounded-2xl p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{tr("shareLabel")}</h2>
      <motion.div
        ref={ref}
        className="mt-3 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/20 via-slate-900 to-cyan-500/20 p-5 ring-1 ring-emerald-500/20"
        whileHover={{ scale: 1.01 }}
      >
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">MoneyPulse</p>
        {goal ? (
          <>
            <p className="mt-2 text-lg font-bold">
              {goal.emoji} {goal.title}
            </p>
            <p className="mt-1 text-3xl font-bold text-emerald-300">{progress}%</p>
            <p className="text-xs text-slate-400">
              {formatNumber(goal.currentAmount, lang === "en" ? "en" : "ru")} / {formatNumber(goal.targetAmount, lang === "en" ? "en" : "ru")} {data.settings.currency || "₽"}
            </p>
          </>
        ) : (
          <p className="mt-2 text-lg font-bold">{tr("sharePulseLabel", { health })}</p>
        )}
        <div className="mt-3 flex gap-3 text-xs text-slate-400">
          <span>🔥 {streak} {tr("streakDaysShort")}</span>
          <span>♥ {health}/100</span>
        </div>
      </motion.div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => void share()}
          className="flex-1 rounded-xl bg-emerald-500/20 py-2.5 text-sm font-semibold text-emerald-300 ring-1 ring-emerald-500/30"
        >
          {tr("shareLabel")}
        </button>
        <button
          onClick={() => void copy()}
          className="rounded-xl bg-white/5 px-4 py-2.5 text-sm text-slate-300 ring-1 ring-white/10"
        >
          {copied ? tr("shareCopied") : tr("copyLabel")}
        </button>
      </div>
    </div>
  );
}
