"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";
import { Reveal, SectionHead, Loop } from "./ui";

export default function HowItWorks({ ru }: { ru: boolean }) {
  const steps = ru
    ? [
        { t: "Зарегистрируйтесь", d: "Email или демо-режим за 20 секунд. Валюта по умолчанию — сум." },
        { t: "Добавьте операции", d: "Быстрый ввод, SMS банка, сообщение Telegram-боту или фото чека — как удобнее." },
        { t: "Получите совет", d: "Пульс двигается с каждой записью, а AI показывает, что сократить." },
      ]
    : [
        { t: "Sign up", d: "Email or demo mode in 20 seconds. Default currency is so'm." },
        { t: "Add transactions", d: "Quick entry, a bank SMS, a message to the Telegram bot or a receipt photo — your call." },
        { t: "Get advice", d: "Pulse moves with every entry and AI shows what to cut." },
      ];
  const list = useRef<HTMLOListElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: list, offset: ["start 0.85", "start 0.35"] });
  const fill = useSpring(scrollYProgress, { stiffness: 120, damping: 24 });

  return (
    <section id="how" className="rc-section">
      <div className="rc-wrap">
        <SectionHead center eyebrow={ru ? "Как это работает" : "How it works"} title={ru ? "Три шага до ясной картины" : "Three steps to a clear picture"} />
        <Loop every={2400}>
          {(cycle) => (
            <ol ref={list} className="relative mt-16 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-6">
              <div className="pointer-events-none absolute left-[16%] right-[16%] top-6 hidden h-px bg-[color:var(--rc-border)] md:block" aria-hidden="true">
                <motion.div className="h-full origin-left bg-white" style={{ scaleX: reduced ? 1 : fill }} />
              </div>
              {steps.map((s, i) => {
                const active = reduced || cycle % steps.length === i;
                return (
                  <li key={s.t} className="relative">
                    <Reveal delay={i * 0.12} className="flex flex-col items-center text-center">
                      <motion.span
                        className="rc-kbd rc-kbd-lg relative"
                        aria-hidden="true"
                        animate={reduced ? undefined : { y: active ? 3 : 0, scale: active ? 1.08 : 1, filter: active ? "brightness(1.7)" : "brightness(1)" }}
                        transition={{ type: "spring", stiffness: 420, damping: 22 }}
                      >
                        {i + 1}
                        {active && !reduced && <span className="rc-ring" />}
                      </motion.span>
                      <motion.div animate={{ opacity: active ? 1 : 0.5 }} transition={{ duration: 0.4 }}>
                        <h3 className="rc-sub mt-6">{s.t}</h3>
                        <p className="rc-body mt-3 max-w-[300px] text-[15px]">{s.d}</p>
                      </motion.div>
                    </Reveal>
                  </li>
                );
              })}
            </ol>
          )}
        </Loop>
      </div>
    </section>
  );
}
