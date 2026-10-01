"use client";

import { motion } from "framer-motion";

export default function BrandPanel({ ru }: { ru: boolean }) {
  const lines = ru
    ? ["SMS Uzcard/Humo → расход сам", "AI Pulse 0–100 каждый день", "Сум по умолчанию · данные не продаём"]
    : ["Uzcard/Humo SMS → auto expense", "AI Pulse 0–100 every day", "So'm default · we never sell data"];

  return (
    <motion.div
      className="hidden lg:block"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.55 }}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/10 ring-1 ring-cyan-400/25">
          <span className="text-lg text-cyan-300">◈</span>
        </div>
        <span className="font-display text-lg font-semibold">MoneyPulse</span>
      </div>
      <h1
        className="mt-8 font-display font-semibold leading-[1.05] tracking-tight"
        style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
      >
        {ru ? (
          <>
            Знайте, куда
            <br />
            <span className="mp-gradient-text">уходят деньги</span>
          </>
        ) : (
          <>
            Know where your
            <br />
            <span className="mp-gradient-text">money goes</span>
          </>
        )}
      </h1>
      <ul className="mt-8 space-y-3 text-sm text-slate-400">
        {lines.map((line, i) => (
          <motion.li
            key={line}
            className="flex items-start gap-2.5"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 + i * 0.08 }}
          >
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-[10px] text-emerald-400">
              ✓
            </span>
            {line}
          </motion.li>
        ))}
      </ul>
      <motion.div
        className="mt-10 w-48 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 backdrop-blur"
        animate={{ scale: [1, 1.02, 1], opacity: [0.9, 1, 0.9] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <p className="text-[10px] uppercase tracking-wider text-slate-500">Pulse</p>
        <p className="mt-1 font-display text-2xl font-semibold text-emerald-400">82/100</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-[82%] rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" />
        </div>
      </motion.div>
    </motion.div>
  );
}
