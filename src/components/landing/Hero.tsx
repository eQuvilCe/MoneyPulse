"use client";

import { useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import HeroArt from "./HeroArt";
import AppWindow from "./AppWindow";
import { EASE, Words, Magnetic } from "./ui";

/** Sample transactions for the second marquee row — illustrative, not real data. */
const FEED: [string, string, string][] = [
  ["🍕", "Korzinka", "−85 000"], ["🚗", "Yandex Go", "−24 000"], ["💰", "Зарплата", "+4 200 000"], ["📱", "Beeline", "−50 000"],
  ["☕", "Кофе", "−25 000"], ["🏠", "Аренда", "−2 500 000"], ["💻", "Фриланс", "+1 500 000"], ["💊", "Аптека", "−37 500"],
  ["🎮", "Steam", "−120 000"], ["🎁", "Подарок", "+300 000"], ["👕", "Кроссовки", "−450 000"], ["📚", "Курс", "−600 000"],
];

export default function Hero({ ru, onStart, onDemo }: { ru: boolean; onStart: () => void; onDemo: () => void }) {
  const reduced = useReducedMotion();
  const rise = (delay: number) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 22 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.8, delay, ease: EASE },
        };

  // The window starts tilted back and straightens as it scrolls up the screen.
  const stage = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: stage, offset: ["start end", "start 0.25"] });
  const p = useSpring(scrollYProgress, { stiffness: 140, damping: 26, mass: 0.4 });
  // …and leans toward the pointer while the pointer is over it.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const lean = { stiffness: 120, damping: 18, mass: 0.5 };
  const smx = useSpring(mx, lean);
  const smy = useSpring(my, lean);
  const rotateX = useTransform([p, smy] as const, ([a, b]: number[]) => 22 * (1 - a) - b * 7);
  const rotateY = useTransform(smx, (v) => v * 9);
  const glare = useTransform(smx, (v) => `radial-gradient(520px circle at ${50 + v * 70}% 0%, rgba(255,255,255,0.09), transparent 60%)`);
  const scale = useTransform(p, [0, 1], [0.94, 1]);
  const chipsY = useTransform(p, [0, 1], [60, -30]);

  const words = ru
    ? ["SMS-импорт", "AI Pulse", "Сканер чеков", "Прогноз", "Бюджеты", "Цели", "Семейный чат", "Telegram-бот", "CSV", "Uzcard", "Humo", "Click", "Payme"]
    : ["SMS import", "AI Pulse", "Receipt scan", "Forecast", "Budgets", "Goals", "Family chat", "Telegram bot", "CSV", "Uzcard", "Humo", "Click", "Payme"];

  return (
    <section className="relative overflow-hidden pb-16 pt-32 sm:pt-40 lg:pb-20">
      <HeroArt />
      <div className="rc-wrap relative">
        <div className="mx-auto max-w-[1000px] text-center">
          <motion.p {...rise(0)} className="mx-auto inline-flex items-center gap-2 rounded-full border border-[color:var(--rc-border)] bg-black/30 px-3 py-1.5 text-[13px] text-[color:var(--rc-ash)] backdrop-blur-md">
            <span className="rc-badge rc-badge-ai !h-[18px] !px-1.5 !text-[10px]">AI</span>
            {ru ? "Трекер финансов для Узбекистана" : "Finance tracker for Uzbekistan"}
          </motion.p>

          <h1 className="rc-h-display mt-6">
            <Words text={ru ? "Знайте, куда уходят деньги." : "Know where your money goes."} />
            <motion.span {...rise(0.45)} className="rc-shimmer block">
              {ru ? "AI подскажет, что исправить." : "AI tells you what to fix."}
            </motion.span>
          </h1>

          <motion.p {...rise(0.16)} className="rc-body mx-auto mt-6 max-w-[520px] text-[18px]">
            {ru
              ? "Вставьте SMS от банка — расход появится сам. Бюджеты, цели, прогноз и семейный учёт в одном приложении."
              : "Paste a bank SMS and the expense appears by itself. Budgets, goals, forecast and family tracking in one app."}
          </motion.p>

          <motion.div {...rise(0.24)} className="mt-9 flex flex-wrap items-center justify-center gap-2">
            <Magnetic>
              <button type="button" onClick={onStart} className="rc-btn rc-btn-fill">
                {ru ? "Начать бесплатно" : "Start free"}
              </button>
            </Magnetic>
            <Magnetic>
              <button type="button" onClick={onDemo} className="rc-btn rc-btn-dark">
                {ru ? "Смотреть демо" : "View demo"}
                <span aria-hidden="true">→</span>
              </button>
            </Magnetic>
          </motion.div>

          <motion.p {...rise(0.3)} className="rc-mono mt-5 text-[color:var(--rc-ash)]">
            {ru ? "бесплатно" : "free"} <span className="mx-1.5 opacity-50">|</span> {ru ? "без привязки карты" : "no card needed"}{" "}
            <span className="mx-1.5 opacity-50">|</span> RU · EN
          </motion.p>
        </div>

        <div
          ref={stage}
          className="relative mx-auto mt-16 max-w-[980px]"
          style={{ perspective: 1400 }}
          onPointerMove={(e) => {
            if (e.pointerType === "touch") return;
            const r = e.currentTarget.getBoundingClientRect();
            mx.set((e.clientX - r.left) / r.width - 0.5);
            my.set((e.clientY - r.top) / r.height - 0.5);
          }}
          onPointerLeave={() => {
            mx.set(0);
            my.set(0);
          }}
        >
          <motion.div
            {...(reduced ? {} : { initial: { opacity: 0, y: 60 }, animate: { opacity: 1, y: 0 }, transition: { duration: 1.1, delay: 0.45, ease: EASE } })}
          >
            <motion.div className="relative" style={reduced ? undefined : { rotateX, rotateY, scale, transformOrigin: "50% 0%", willChange: "transform" }}>
              <AppWindow ru={ru} />
              {/* glare that slides across the glass with the pointer */}
              {!reduced && (
                <motion.div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-[12px]"
                  style={{ background: glare }}
                />
              )}
            </motion.div>
          </motion.div>

          {/* floating chips — desktop only, purely decorative */}
          {!reduced && (
            <motion.div style={{ y: chipsY }} className="pointer-events-none absolute inset-0 hidden xl:block" aria-hidden="true">
              <span className="rc-chip absolute -left-[150px] top-[18%]" style={{ "--r": "-4deg", "--f": "5.5s" } as React.CSSProperties}>
                <span>🍕</span> Korzinka <b className="font-medium tabular-nums">−85 000</b>
              </span>
              <span className="rc-chip absolute -left-[120px] top-[62%]" style={{ "--r": "3deg", "--f": "6.5s", "--fd": "-2s" } as React.CSSProperties}>
                <span className="rc-badge rc-badge-ai">AI</span> {ru ? "такси −12%" : "taxi −12%"}
              </span>
              <span className="rc-chip absolute -right-[140px] top-[12%]" style={{ "--r": "4deg", "--f": "6s", "--fd": "-1s" } as React.CSSProperties}>
                Pulse <b className="font-medium tabular-nums text-[color:var(--rc-green)]">78 ↑</b>
              </span>
              <span className="rc-chip absolute -right-[160px] top-[56%]" style={{ "--r": "-3deg", "--f": "7s", "--fd": "-3s" } as React.CSSProperties}>
                <span>🎯</span> {ru ? "Отпуск" : "Vacation"} <b className="font-medium tabular-nums">45%</b>
              </span>
            </motion.div>
          )}
        </div>
      </div>

      <div className="rc-marquee-mask relative mt-16" aria-hidden="true">
        <div className="rc-marquee">
          {[0, 1].map((k) => (
            <div key={k} className="flex shrink-0 items-center">
              {words.map((w) => (
                <span key={w} className="rc-mono flex items-center whitespace-nowrap px-6 text-[13px] uppercase tracking-[0.8px] text-[color:var(--rc-smoke)]">
                  {w}
                  <span className="ml-12 h-1 w-1 rounded-full bg-[color:var(--rc-border)]" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="rc-marquee-mask relative mt-3" aria-hidden="true">
        <div className="rc-marquee rc-marquee-rev">
          {[0, 1].map((k) => (
            <div key={k} className="flex shrink-0 items-center gap-3 pr-3">
              {FEED.map((f) => (
                <span key={f[1]} className="flex shrink-0 items-center gap-2.5 rounded-full border border-[color:var(--rc-border)] bg-[color:var(--rc-card)] py-2 pl-2.5 pr-4 text-[13px]">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.06] text-[13px]">{f[0]}</span>
                  <span className="text-[color:var(--rc-ash)]">{f[1]}</span>
                  <span className={`font-medium tabular-nums ${f[2].startsWith("+") ? "text-[color:var(--rc-green)]" : "text-white"}`}>{f[2]}</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
