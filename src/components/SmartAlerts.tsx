"use client";

import { motion } from "framer-motion";
import { FinanceData } from "@/lib/types";
import { buildSmartAlerts, type SmartAlert } from "@/lib/insights";
import { useApp } from "@/components/AppProvider";

const TONE_CLASSES: Record<SmartAlert["tone"], string> = {
  warn: "border-amber-500/20 bg-amber-500/8",
  info: "border-cyan-500/20 bg-cyan-500/8",
  goal: "border-violet-500/20 bg-violet-500/8",
  streak: "border-orange-500/20 bg-orange-500/8",
};

export default function SmartAlerts({ data }: { data: FinanceData }) {
  const { tr } = useApp();
  const alerts = buildSmartAlerts(data);
  if (!alerts.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{tr("smartAlertsTitle")}</p>
      {alerts.map((a, i) => (
        <motion.div
          key={a.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className={`rounded-2xl border px-4 py-3 ${TONE_CLASSES[a.tone]}`}
        >
          <p className="text-xs font-semibold text-white">
            <span aria-hidden>{a.icon}</span> {a.title}
          </p>
          <p className="mt-0.5 text-sm text-slate-300">{a.body}</p>
        </motion.div>
      ))}
    </div>
  );
}
