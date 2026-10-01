"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

function scoreColor(score: number) {
  if (score < 40) return { stroke: "#f87171", glow: "rgba(248,113,113,0.65)", text: "text-rose-400", soft: "rgba(248,113,113,0.15)" };
  if (score < 70) return { stroke: "#fbbf24", glow: "rgba(251,191,36,0.55)", text: "text-amber-400", soft: "rgba(251,191,36,0.12)" };
  return { stroke: "#34d399", glow: "rgba(52,211,153,0.6)", text: "text-emerald-400", soft: "rgba(52,211,153,0.14)" };
}

export default function PulseRing({
  score,
  size = 140,
  flash = false,
}: {
  score: number;
  size?: number;
  flash?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const [n, setN] = useState(0);
  const c = scoreColor(clamped);
  const r = 34;
  const circ = 2 * Math.PI * r;
  const gradId = `pr-${size}-${clamped}`;

  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / 900);
      setN(Math.round(clamped * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [clamped]);

  return (
    <motion.div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size, perspective: 600 }}
      animate={{
        scale: flash ? [1, 1.08, 1] : [1, 1.03, 1],
        rotateX: [0, 4, 0, -4, 0],
        rotateY: [0, -6, 0, 6, 0],
      }}
      transition={
        flash
          ? { duration: 0.5 }
          : { duration: 8, repeat: Infinity, ease: "easeInOut" }
      }
    >
      {/* outer glow disc */}
      <motion.div
        className="absolute inset-[8%] rounded-full"
        style={{
          background: `radial-gradient(circle, ${c.soft} 0%, transparent 70%)`,
          boxShadow: `0 0 40px ${c.glow}`,
        }}
        animate={{ opacity: [0.5, 1, 0.5], scale: [0.95, 1.05, 0.95] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* rotating arc ring */}
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: 360 }}
        transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
      >
        <svg viewBox="0 0 80 80" width={size} height={size} className="overflow-visible">
          <circle
            cx="40"
            cy="40"
            r="38"
            fill="none"
            stroke={c.stroke}
            strokeWidth="0.6"
            strokeDasharray="4 10"
            opacity="0.35"
          />
        </svg>
      </motion.div>
      <svg
        viewBox="0 0 80 80"
        width={size}
        height={size}
        className="relative overflow-visible"
        style={{ filter: `drop-shadow(0 0 14px ${c.glow})` }}
        aria-hidden
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="80" y2="80">
            <stop stopColor={c.stroke} />
            <stop offset="0.5" stopColor="#38bdf8" />
            <stop offset="1" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="6" />
        <motion.circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ * (1 - clamped / 100) }}
          transition={{ duration: 1.15, ease: [0.22, 1, 0.36, 1] }}
          transform="rotate(-90 40 40)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ transform: "translateZ(24px)" }}>
        <span className={`font-display text-3xl font-semibold tabular-nums ${c.text}`}>{n}</span>
        <span className="text-[9px] uppercase tracking-[0.2em] text-slate-500">/100</span>
      </div>
    </motion.div>
  );
}
