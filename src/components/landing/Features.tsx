"use client";

import { motion } from "framer-motion";
import TiltCard from "@/components/motion/TiltCard";
import { SectionTitle } from "./shared";

export default function Features({ ru }: { ru: boolean }) {
  const items = ru
    ? [
        { icon: "◈", t: "AI Pulse", d: "Оценка 0–100 и один понятный совет на сегодня." },
        { icon: "📷", t: "Сканер чеков", d: "Фото чека → сумма и категория за секунды." },
        { icon: "💬", t: "SMS → расход", d: "Вставьте SMS Uzcard/Humo — операция создаётся сама." },
        { icon: "↗", t: "Прогноз", d: "Куда уйдёте к концу месяца, если ничего не менять." },
      ]
    : [
        { icon: "◈", t: "AI Pulse", d: "Score 0–100 and one clear action for today." },
        { icon: "📷", t: "Receipt scan", d: "Photo → amount and category in seconds." },
        { icon: "💬", t: "SMS → expense", d: "Paste Uzcard/Humo SMS — transaction is created." },
        { icon: "↗", t: "Forecast", d: "Where you'll land by month-end if nothing changes." },
      ];
  return (
    <section id="features" className="border-t border-white/[0.05] py-20">
      <div className="mx-auto max-w-6xl px-6">
        <SectionTitle
          eyebrow={ru ? "Возможности" : "Features"}
          title={ru ? "Всё, что нужно каждый день" : "Everything you need daily"}
        />
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((f, i) => (
            <motion.div
              key={f.t}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
            >
              <TiltCard className="mp-card h-full p-5">
                <span className="text-2xl">{f.icon}</span>
                <h3 className="mt-3 font-display text-sm font-semibold">{f.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.d}</p>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
