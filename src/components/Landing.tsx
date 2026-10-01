"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useApp } from "@/components/AppProvider";
import LoginScreen from "@/components/LoginScreen";
import AuroraBackground from "@/components/fx/AuroraBackground";
import ParticleField from "@/components/fx/ParticleField";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import HowItWorks from "@/components/landing/HowItWorks";
import Pricing from "@/components/landing/Pricing";
import Faq from "@/components/landing/Faq";
import Footer from "@/components/landing/Footer";
import { MagneticButton } from "@/components/landing/shared";

export default function Landing() {
  const { setShowAuth, showAuth, enterDemo, lang } = useApp();
  const ru = lang !== "en";
  const [scrolled, setScrolled] = useState(false);
  const spotX = useMotionValue(0);
  const spotY = useMotionValue(0);
  const ssx = useSpring(spotX, { stiffness: 80, damping: 25 });
  const ssy = useSpring(spotY, { stiffness: 80, damping: 25 });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (showAuth) {
    return (
      <div className="relative min-h-screen bg-[#05070d]">
        <LoginScreen />
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen overflow-x-hidden bg-[#05070d] text-white"
      onMouseMove={(e) => {
        if (window.innerWidth < 768) return;
        spotX.set(e.clientX);
        spotY.set(e.clientY);
      }}
    >
      <AuroraBackground />
      <ParticleField />
      <div className="mp-grain" />
      <motion.div
        className="pointer-events-none fixed z-[1] hidden h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full md:block"
        style={{
          left: ssx,
          top: ssy,
          background: "radial-gradient(circle, rgba(56,189,248,0.12) 0%, transparent 70%)",
        }}
      />

      <header
        className={`fixed inset-x-0 top-0 z-30 transition-all duration-300 ${
          scrolled ? "mp-header-glass" : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/10 ring-1 ring-cyan-400/25">
              <span className="text-cyan-300">◈</span>
            </div>
            <div>
              <span className="font-display text-sm font-semibold tracking-tight">MoneyPulse</span>
              <p className="text-[9px] uppercase tracking-[0.16em] text-slate-500">
                {ru ? "Финансы · AI · UZ" : "Finance · AI · UZ"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="#features" className="hidden px-3 py-2 text-sm text-slate-400 hover:text-white sm:inline">
              {ru ? "Возможности" : "Features"}
            </a>
            <a href="#pricing" className="hidden px-3 py-2 text-sm text-slate-400 hover:text-white sm:inline">
              {ru ? "Цены" : "Pricing"}
            </a>
            <button
              type="button"
              onClick={() => setShowAuth(true)}
              className="px-3 py-2 text-sm text-slate-400 hover:text-white"
            >
              {ru ? "Войти" : "Sign in"}
            </button>
            <MagneticButton primary onClick={() => setShowAuth(true)}>
              {ru ? "Начать" : "Start"}
            </MagneticButton>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <Hero ru={ru} onStart={() => setShowAuth(true)} onDemo={() => void enterDemo()} />
        <div className="mp-marquee-mask relative z-10 my-12 overflow-hidden py-3">
          <div className="mp-marquee-track gap-10 text-sm font-medium uppercase tracking-[0.18em] text-slate-600">
            {Array.from({ length: 2 }).map((_, k) => (
              <div key={k} className="flex gap-10 pr-10">
                {(ru
                  ? ["SMS-импорт", "AI Pulse", "Сканер чеков", "Прогноз", "Бюджеты", "Цели", "Telegram"]
                  : ["SMS import", "AI Pulse", "Receipt scan", "Forecast", "Budgets", "Goals", "Telegram"]
                ).map((t) => (
                  <span key={t} className="whitespace-nowrap">
                    {t} ·
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
        <Features ru={ru} />
        <HowItWorks ru={ru} />
        <Pricing ru={ru} onStart={() => setShowAuth(true)} />
        <Faq ru={ru} />
        <Footer ru={ru} onStart={() => setShowAuth(true)} />
      </main>
    </div>
  );
}
