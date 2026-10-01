"use client";

import { motion } from "framer-motion";
import TiltCard from "@/components/motion/TiltCard";

export default function ProductPreview({ ru }: { ru: boolean }) {
  return (
    <motion.div
      className="mx-auto mt-16 w-full max-w-lg"
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
      style={{ perspective: 900 }}
    >
      <TiltCard className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0e17]/90 p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <span className="mp-label">Pulse</span>
          <span className="text-sm font-semibold text-emerald-400">72/100</span>
        </div>
        <div className="mt-3 flex items-center gap-4">
          <div className="relative flex h-20 w-20 items-center justify-center">
            <svg viewBox="0 0 80 80" className="absolute inset-0">
              <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
              <motion.circle
                cx="40"
                cy="40"
                r="32"
                fill="none"
                stroke="url(#pg)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 32}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 32 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 32 * (1 - 0.72) }}
                transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                transform="rotate(-90 40 40)"
              />
              <defs>
                <linearGradient id="pg" x1="0" y1="0" x2="80" y2="80">
                  <stop stopColor="#3cf2b0" />
                  <stop offset="1" stopColor="#38bdf8" />
                </linearGradient>
              </defs>
            </svg>
            <span className="text-sm font-semibold">72</span>
          </div>
          <div className="grid flex-1 grid-cols-3 gap-2 text-center text-[11px]">
            <div className="rounded-xl bg-white/[0.03] py-2">
              <p className="text-slate-500">{ru ? "доход" : "in"}</p>
              <p className="font-semibold text-emerald-400">+8.2M</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] py-2">
              <p className="text-slate-500">{ru ? "расход" : "out"}</p>
              <p className="font-semibold text-rose-400">−3.1M</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] py-2">
              <p className="text-slate-500">{ru ? "баланс" : "bal"}</p>
              <p className="font-semibold">5.1M</p>
            </div>
          </div>
        </div>
        <svg viewBox="0 0 320 64" className="mt-4 h-16 w-full overflow-visible">
          <motion.path
            d="M0 48 C40 48 40 20 80 28 C120 36 120 8 160 16 C200 24 200 40 240 32 C280 24 300 12 320 18"
            fill="none"
            stroke="url(#area)"
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.6, ease: "easeInOut", delay: 0.4 }}
          />
          <defs>
            <linearGradient id="area" x1="0" y1="0" x2="320" y2="0">
              <stop stopColor="#3cf2b0" />
              <stop offset="1" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
        </svg>
        <p className="mt-1 text-[11px] text-slate-400">
          {ru ? "AI: транспорт +18% · пик 18:00–21:00" : "AI: transport +18% · peak 18:00–21:00"}
        </p>
      </TiltCard>
    </motion.div>
  );
}
