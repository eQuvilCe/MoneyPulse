"use client";

import { motion } from "framer-motion";
import { FinanceData } from "@/lib/types";
import { buildSmartAlerts } from "@/lib/insights";

export default function SmartAlerts({ data }: { data: FinanceData }) {
  const alerts = buildSmartAlerts(data);
  if (!alerts.length) return null;

  const tone = {
    warn: "border-amber-500/20 bg-amber-500/8",
    info: "border-cyan-500/20 bg-cyan-500/8",
    goal: "border-violet-500/20 bg-violet-500/8",
    streak: "border-orange-500/20 bg-orange-500/8",
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Smart alerts</p>
      {alerts.map((a, i) => (
        <motion.div
          key={a.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className={`rounded-2xl border px-4 py-3 ${tone[a.tone]}`}
        >
          <p className="text-xs font-semibold text-white">
            {a.icon} {a.title}
          </p>
          <p className="mt-0.5 text-sm text-slate-300">{a.body}</p>
        </motion.div>
      ))}
    </div>
  );
}
