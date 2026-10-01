"use client";

import { motion } from "framer-motion";
import { SectionTitle } from "./shared";

export default function HowItWorks({ ru }: { ru: boolean }) {
  const steps = ru
    ? [
        { n: "01", t: "Регистрация", d: "Email или демо за 20 секунд. Валюта — сум." },
        { n: "02", t: "Добавьте или импорт", d: "Ввод, SMS банка, CSV или фото чека." },
        { n: "03", t: "Получите совет", d: "Пульс двигается, AI показывает что сократить." },
      ]
    : [
        { n: "01", t: "Sign up", d: "Email or demo in 20 seconds. Currency: so'm." },
        { n: "02", t: "Add or import", d: "Manual, bank SMS, CSV or receipt photo." },
        { n: "03", t: "Get advice", d: "Pulse moves; AI shows what to cut." },
      ];
  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <SectionTitle eyebrow={ru ? "Шаги" : "Steps"} title={ru ? "Как это работает" : "How it works"} />
        <div className="relative mt-14 grid gap-8 sm:grid-cols-3">
          <div className="pointer-events-none absolute left-[16%] right-[16%] top-8 hidden h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent sm:block" />
          {steps.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative text-center"
            >
              <p className="font-display text-3xl font-bold text-cyan-400/35">{s.n}</p>
              <h3 className="mt-2 font-display text-base font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm text-slate-400">{s.d}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
