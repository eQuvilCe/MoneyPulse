"use client";

import { motion } from "framer-motion";
import FitText from "@/components/FitText";

const tone: Record<string, { text: string; rgb: string }> = {
  green: { text: "text-emerald-400", rgb: "52,211,153" },
  red: { text: "text-rose-400", rgb: "251,113,133" },
  blue: { text: "text-cyan-400", rgb: "34,211,238" },
  cyan: { text: "text-cyan-400", rgb: "34,211,238" },
  amber: { text: "text-amber-400", rgb: "251,191,36" },
  purple: { text: "text-violet-400", rgb: "167,139,250" },
};

function Spark({ data, rgb }: { data: number[]; rgb: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${28 - (v / max) * 24}`);
  const d = `M${pts.join(" L")}`;
  return (
    <svg viewBox="0 0 100 30" className="mt-3 h-8 w-full" preserveAspectRatio="none" aria-hidden>
      <motion.path d={d} fill="none" stroke={`rgb(${rgb})`} strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: "easeOut" }} />
      <path d={`${d} L100,30 L0,30 Z`} fill={`rgba(${rgb},0.12)`} />
    </svg>
  );
}

export default function StatCard({
  title, value, fullValue, icon, color = "blue", subtitle, delay = 0, spark,
}: {
  title: string; value: string; /** exact value for the tooltip when `value` is abbreviated */ fullValue?: string;
  icon?: string; color?: string; subtitle?: string; delay?: number; spark?: number[];
}) {
  const c = tone[color] || tone.blue;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 26, delay }}
      className="mp-card relative min-w-0 overflow-hidden p-5"
      style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), 0 20px 50px -24px rgba(${c.rgb},0.45)` }}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-2xl" style={{ background: `rgba(${c.rgb},0.16)` }} />
      <div className="relative flex items-center justify-between">
        <p className="mp-label">{title}</p>
        {icon && (
          <span className={`flex h-8 w-8 items-center justify-center rounded-xl text-sm ${c.text}`} style={{ background: `rgba(${c.rgb},0.14)` }}>
            {icon}
          </span>
        )}
      </div>
      <p className={`relative mt-3 font-display text-3xl font-semibold tabular-nums tracking-tight ${c.text}`}>
        <FitText title={fullValue}>{value}</FitText>
      </p>
      {subtitle && <p className="relative mt-1 text-[11px] text-slate-500">{subtitle}</p>}
      {spark && <Spark data={spark} rgb={c.rgb} />}
    </motion.div>
  );
}
