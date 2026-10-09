"use client";

import { useEffect, useState } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import { useApp } from "@/components/AppProvider";
import LoginScreen from "@/components/LoginScreen";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import HowItWorks from "@/components/landing/HowItWorks";
import StatsStrip from "@/components/landing/StatsStrip";
import Pricing from "@/components/landing/Pricing";
import Faq from "@/components/landing/Faq";
import Footer from "@/components/landing/Footer";
import { Mark, CursorLight } from "@/components/landing/ui";

export default function Landing() {
  const { setShowAuth, showAuth, enterDemo, lang, setLang } = useApp();
  const ru = lang !== "en";
  const [scrolled, setScrolled] = useState(false);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 200, damping: 40 });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (showAuth) {
    return (
      <div className="rc relative min-h-screen">
        <LoginScreen />
      </div>
    );
  }

  const start = () => setShowAuth(true);
  const demo = () => void enterDemo();

  return (
    <div className="rc relative min-h-screen overflow-x-clip">
      <a href="#features" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-black">
        {ru ? "К содержанию" : "Skip to content"}
      </a>

      <div className="rc-ambient" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <CursorLight />
      <motion.div className="rc-progress" style={{ scaleX: progress }} aria-hidden="true" />

      <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-5 sm:pt-4">
        <div
          className="rc-nav mx-auto flex h-[52px] max-w-[1080px] items-center justify-between gap-3 pl-4 pr-2 transition-[background-color] duration-300"
          style={{ backgroundColor: scrolled ? "rgba(7,8,10,0.94)" : undefined }}
        >
          <a href="#top" className="flex shrink-0 items-center gap-2.5" aria-label="MoneyPulse">
            <Mark />
            <span className="text-[14px] font-medium">MoneyPulse</span>
          </a>
          <nav aria-label={ru ? "Основная навигация" : "Main"} className="hidden items-center gap-7 text-[13px] font-medium md:flex">
            <a href="#features" className="rc-link">{ru ? "Возможности" : "Features"}</a>
            <a href="#how" className="rc-link">{ru ? "Как работает" : "How it works"}</a>
            <a href="#pricing" className="rc-link">{ru ? "Цены" : "Pricing"}</a>
            <a href="#faq" className="rc-link">FAQ</a>
          </nav>
          <div className="flex shrink-0 items-center gap-1">
            {/* language switch — up here where it is seen, not only in the footer */}
            <span className="flex items-center gap-0.5 rounded-lg border border-[color:var(--rc-border)] p-0.5" role="group" aria-label={ru ? "Язык" : "Language"}>
              {(["ru", "en"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  aria-pressed={lang === l}
                  className={`rc-mono rounded-md px-1.5 py-1 uppercase transition-colors ${lang === l ? "bg-white/10 text-white" : "text-[color:var(--rc-smoke)] hover:text-white"}`}
                >
                  {l}
                </button>
              ))}
            </span>
            <button type="button" onClick={start} className="rc-link px-2 py-2 text-[13px] font-medium sm:px-3">
              {ru ? "Войти" : "Sign in"}
            </button>
            <button type="button" onClick={start} className="rc-btn rc-btn-fill rc-btn-sm">
              {ru ? "Начать" : "Start"}
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        <Hero ru={ru} onStart={start} onDemo={demo} />
        <StatsStrip ru={ru} />
        <Features ru={ru} />
        <div className="rc-wrap"><div className="rc-hairline" /></div>
        <HowItWorks ru={ru} />
        <div className="rc-wrap"><div className="rc-hairline" /></div>
        <Pricing ru={ru} onStart={start} />
        <div className="rc-wrap"><div className="rc-hairline" /></div>
        <Faq ru={ru} />
        <Footer ru={ru} onStart={start} onDemo={demo} onLang={setLang} />
      </main>
    </div>
  );
}
