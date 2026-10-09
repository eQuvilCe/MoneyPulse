"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { EASE, Loop, Mark, Words } from "@/components/landing/ui";

/** What a typed line turns into — the same quick entry the app and the Telegram bot accept. */
const ENTRIES: [string, string, string, string][] = [
  ["кофе 25 000", "🍕", "еда", "−25 000"],
  ["25к такси", "🚗", "транспорт", "−25 000"],
  ["+5 млн зарплата", "💰", "зарплата", "+5 000 000"],
  ["netflix 120 000", "📱", "подписки", "−120 000"],
];

export default function BrandPanel({ ru }: { ru: boolean }) {
  const reduced = useReducedMotion();
  const lines = ru
    ? ["SMS Uzcard и Humo превращается в расход сама", "AI Pulse: оценка 0–100 и совет на каждый день", "Сум по умолчанию, данные не продаём"]
    : ["Uzcard and Humo SMS turn into expenses by themselves", "AI Pulse: a 0–100 score and a tip every day", "So'm by default, and we never sell data"];

  return (
    <div className="hidden lg:block">
      <motion.div
        className="flex items-center gap-2.5"
        initial={reduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
      >
        <Mark size={22} />
        <span className="text-[16px] font-medium">MoneyPulse</span>
      </motion.div>

      <h1 className="rc-h-lg mt-8">
        <Words text={ru ? "Знайте, куда уходят деньги." : "Know where your money goes."} />
      </h1>

      <ul className="mt-8 space-y-3">
        {lines.map((line, i) => (
          <motion.li
            key={line}
            className="flex items-start gap-3 text-[15px] text-[color:var(--rc-ash)]"
            initial={reduced ? false : { opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.35 + i * 0.1, ease: EASE }}
          >
            <Check size={16} className="mt-[3px] shrink-0 text-[color:var(--rc-mist)]" />
            {line}
          </motion.li>
        ))}
      </ul>

      {/* live sample: a typed line becomes a categorised transaction */}
      <motion.div
        className="rc-card-key mt-10 max-w-[380px] p-4"
        initial={reduced ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.6, ease: EASE }}
        aria-hidden="true"
      >
        <Loop every={2800}>
          {(cycle) => {
            const [typed, icon, cat, amount] = ENTRIES[cycle % ENTRIES.length];
            return (
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={cycle} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3, ease: EASE }}>
                  <div className="rc-well flex items-center gap-3 px-3 py-2.5">
                    <span className="rc-mono shrink-0 text-[color:var(--rc-smoke)]">›</span>
                    <span className="min-w-0 flex-1 truncate text-[14px]">
                      {typed}
                      <span className="rc-caret" />
                    </span>
                    <span className="rc-kbd shrink-0">↵</span>
                  </div>
                  <motion.div
                    className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2.5"
                    style={{ background: "rgba(255,99,99,0.12)", boxShadow: "inset 0 0 0 1px rgba(255,99,99,0.35)" }}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.7, ease: EASE }}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[15px]">{icon}</span>
                    <span className="min-w-0 flex-1 truncate text-[14px] text-[color:var(--rc-ash)]">{cat}</span>
                    <span className={`shrink-0 text-[14px] font-medium tabular-nums ${amount.startsWith("+") ? "text-[color:var(--rc-green)]" : "text-white"}`}>{amount}</span>
                  </motion.div>
                </motion.div>
              </AnimatePresence>
            );
          }}
        </Loop>
      </motion.div>
    </div>
  );
}
