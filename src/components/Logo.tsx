"use client";

import { motion } from "framer-motion";

export default function Logo({ size = 40 }: { size?: number }) {
  return (
    <motion.div
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      animate={{
        filter: [
          "drop-shadow(0 0 6px rgba(52,211,153,0.4))",
          "drop-shadow(0 0 16px rgba(34,211,238,0.55))",
          "drop-shadow(0 0 6px rgba(52,211,153,0.4))",
        ],
      }}
      transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
    >
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-label="MoneyPulse">
        <defs>
          <linearGradient id="mp-g" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop stopColor="#34d399" />
            <stop offset="0.45" stopColor="#2dd4bf" />
            <stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
          <linearGradient id="mp-g2" x1="12" y1="12" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6ee7b7" />
            <stop offset="1" stopColor="#67e8f9" />
          </linearGradient>
          <filter id="mp-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* soft outer glow ring */}
        <circle cx="24" cy="24" r="21" stroke="url(#mp-g)" strokeWidth="1" opacity="0.25" />

        {/* main ring */}
        <circle
          cx="24"
          cy="24"
          r="18.5"
          stroke="url(#mp-g)"
          strokeWidth="2.2"
          opacity="0.95"
          strokeDasharray="4 2.5"
        />

        {/* solid inner arc accent */}
        <path
          d="M24 5.5a18.5 18.5 0 0 1 16.05 9.25"
          stroke="url(#mp-g2)"
          strokeWidth="2.4"
          strokeLinecap="round"
          opacity="0.9"
        />

        {/* ECG / pulse waveform */}
        <path
          d="M8 25h5.5l2.2-7.5 3.2 15 2.8-11 2.2 6.5H40"
          stroke="url(#mp-g)"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          filter="url(#mp-glow)"
        />

        {/* coin / pulse center */}
        <circle cx="24" cy="24" r="4.2" fill="url(#mp-g)" opacity="0.95" />
        <circle cx="24" cy="24" r="2" fill="#030712" opacity="0.35" />
      </svg>
    </motion.div>
  );
}
