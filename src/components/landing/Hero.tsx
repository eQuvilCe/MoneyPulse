"use client";

import { motion } from "framer-motion";
import { WordReveal, MagneticButton } from "./shared";
import ProductPreview from "./ProductPreview";
import StatsStrip from "./StatsStrip";
import SceneGate from "@/components/three/SceneGate";

export default function Hero({
  ru,
  onStart,
  onDemo,
}: {
  ru: boolean;
  onStart: () => void;
  onDemo: () => void;
}) {
  const h1a = ru ? "Знайте, куда уходят" : "Know where your";
  const h1b = ru ? "деньги." : "money goes.";
  const h1c = ru ? "AI подскажет, что исправить." : "AI tells you what to fix.";

  return (
    <section className="relative mx-auto max-w-6xl px-6 pb-8 pt-28 sm:pt-32">
      <div className="pointer-events-none absolute inset-y-0 left-1/2 z-0 w-screen -translate-x-1/2 overflow-hidden">
        <SceneGate />
      </div>
      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mp-label mb-5 text-cyan-400/90"
        >
          Uzcard · Humo · Click · Payme
        </motion.p>
        <h1
          className="font-display font-semibold text-white"
          style={{
            fontSize: "clamp(2.8rem, 7vw, 6rem)",
            lineHeight: 1.02,
            letterSpacing: "-0.03em",
          }}
        >
          <WordReveal text={h1a} />
          <br />
          <WordReveal text={h1b} />
          <br />
          <span className="mp-gradient-text">
            <WordReveal text={h1c} />
          </span>
        </h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg"
        >
          {ru
            ? "Скопируйте SMS от банка — расход появится сам. Бюджеты, цели, прогноз и AI-пульс для Узбекистана."
            : "Paste a bank SMS — expense appears automatically. Budgets, goals, forecast and AI pulse for Uzbekistan."}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          className="mt-9 flex flex-wrap items-center justify-center gap-3"
        >
          <MagneticButton primary onClick={onStart}>
            {ru ? "Начать бесплатно" : "Start free"}
          </MagneticButton>
          <MagneticButton onClick={onDemo}>{ru ? "Смотреть демо" : "View demo"}</MagneticButton>
        </motion.div>
      </div>
      <div className="relative z-10">
        <ProductPreview ru={ru} />
        <StatsStrip ru={ru} />
      </div>
    </section>
  );
}
