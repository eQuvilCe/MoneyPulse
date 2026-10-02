"use client";

import { motion } from "framer-motion";
import { FinanceData } from "@/lib/types";
import { useApp } from "@/components/AppProvider";

export default function StreakBadge({ data }: { data: FinanceData }) {
  const { tr } = useApp();
  const BADGE_META: Record<string, { emoji: string; label: string }> = {
    streak_3: { emoji: "🔥", label: tr("badgeStreak3") },
    streak_7: { emoji: "⚡", label: tr("badgeStreak7") },
    streak_30: { emoji: "💎", label: tr("badgeStreak30") },
    ops_10: { emoji: "📝", label: tr("badgeOps10") },
    ops_50: { emoji: "🏆", label: tr("badgeOps50") },
  };
  const streak = data.settings.streak || 0;
  const best = data.settings.bestStreak || 0;
  const badges = data.settings.badges || [];

  return (
    <div className="mp-card rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{tr("streakLabel")}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-orange-400">
            {streak} <span className="text-sm font-medium text-slate-500">{tr("streakDaysShort")}</span>
          </p>
          <p className="text-xs text-slate-500">{tr("streakRecord", { n: best })}</p>
        </div>
        <motion.div
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/15 text-2xl ring-1 ring-orange-500/25"
          animate={streak > 0 ? { scale: [1, 1.08, 1] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        >
          🔥
        </motion.div>
      </div>
      {badges.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {badges.map((b) => {
            const m = BADGE_META[b] || { emoji: "✨", label: b };
            return (
              <span
                key={b}
                className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] text-slate-300 ring-1 ring-white/10"
                title={m.label}
              >
                {m.emoji} {m.label}
              </span>
            );
          })}
        </div>
      )}
      {streak === 0 && (
        <p className="mt-3 text-xs text-slate-500">{tr("streakStartHint")}</p>
      )}
    </div>
  );
}
