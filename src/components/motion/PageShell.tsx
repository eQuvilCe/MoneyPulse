"use client";

import { motion, type Variants } from "framer-motion";
import { ReactNode } from "react";
import AuroraBackground from "@/components/fx/AuroraBackground";
import ParticleField from "@/components/fx/ParticleField";
import DashboardSceneGate from "@/components/three/DashboardSceneGate";

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.04 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 380, damping: 30 },
  },
};

export function PageShell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className={`space-y-6 ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function FadeItem({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={item} className={className}>
      {children}
    </motion.div>
  );
}

/** Ambient background for the whole logged-in app shell (mounted once) — aurora + particles
 *  everywhere, plus a real WebGL "pulse" scene layered on top where the device can handle it. */
export function AmbientBg() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <AuroraBackground intensity={1.5} />
      <ParticleField density="app" />
      <div className="mp-grain opacity-[0.03]" />
      <DashboardSceneGate />
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-white/[0.04] ${className}`}
      aria-hidden
    >
      <div className="absolute inset-0 -translate-x-full animate-[mp-shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
    </div>
  );
}
