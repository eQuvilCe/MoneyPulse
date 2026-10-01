"use client";

import { motion } from "framer-motion";
import { useApp } from "@/components/AppProvider";
import AuroraBackground from "@/components/fx/AuroraBackground";
import ParticleField from "@/components/fx/ParticleField";
import BrandPanel from "@/components/auth/BrandPanel";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginScreen() {
  const { lang, setLang, setShowAuth } = useApp();
  const ru = lang !== "en";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16">
      <AuroraBackground intensity={1.15} />
      <ParticleField density="strong" />
      <div className="mp-grain" />

      <button
        type="button"
        onClick={() => setShowAuth(false)}
        className="group fixed left-4 top-4 z-50 flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs text-slate-300 backdrop-blur-md transition hover:border-white/20 hover:text-white"
      >
        <span className="inline-block transition-transform group-hover:-translate-x-0.5">←</span>
        {ru ? "На главную" : "Home"}
      </button>

      <div className="fixed right-4 top-4 z-50 flex rounded-full border border-white/10 bg-white/[0.04] p-0.5 backdrop-blur-md">
        {(["ru", "en"] as const).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            className={`relative rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
              lang === l ? "text-white" : "text-slate-500"
            }`}
          >
            {lang === l && (
              <motion.span
                layoutId="lang-pill"
                className="absolute inset-0 rounded-full bg-cyan-400/20"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10">{l}</span>
          </button>
        ))}
      </div>

      <div className="relative z-10 grid w-full max-w-5xl items-center gap-10 lg:grid-cols-2">
        <BrandPanel ru={ru} />
        <LoginForm />
      </div>
    </div>
  );
}
