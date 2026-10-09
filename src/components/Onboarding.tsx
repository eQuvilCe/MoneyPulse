"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/components/AppProvider";

const KEY = "money-pulse-onboarded";

export default function Onboarding() {
  const { lang, user } = useApp();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const steps =
    lang === "en"
      ? [
          {
            title: "Log one thing a day",
            text: "On the dashboard use “Today”: amount → category → Add. It flows into the month automatically.",
            icon: "📅",
          },
          {
            title: "AI buddy is always here",
            text: "Green face bottom-right. Ask: balance, today, budgets, advice. After login it greets you.",
            icon: "✦",
          },
          {
            title: "Cards & SMS",
            text: "Banks → paste Uzcard / Humo / Visa SMS. We parse where, how much, when. Salary push too.",
            icon: "💳",
          },
          {
            title: "Money pulse 0–100",
            text: "Score from balance, savings %, budgets, goals, daily streak. Tap ⓘ on the hero to see the bars.",
            icon: "◈",
          },
        ]
      : [
          {
            title: "Каждый день — по одной записи",
            text: "На дашборде блок «Сегодня»: сумма → категория → Добавить. Всё сразу идёт в месяц.",
            icon: "📅",
          },
          {
            title: "AI-чел всегда рядом",
            text: "Зелёная мордашка справа внизу. Жми: баланс, сегодня, бюджеты, совет. После входа он сам поздоровается.",
            icon: "✦",
          },
          {
            title: "Карты и SMS",
            text: "Банки → вставь SMS от Uzcard / Humo / Visa. Разберём где, сколько, когда. Зарплата тоже.",
            icon: "💳",
          },
          {
            title: "Пульс 0–100",
            text: "Оценка из баланса, % сбережений, бюджетов, целей и серии записей. Жми ⓘ на кольце — увидишь полоски.",
            icon: "◈",
          },
        ];

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!user) return;
    // per-user onboarding key so new accounts see tutorial
    const k = KEY + "-" + (user.id || "anon");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount (not during SSR)
    if (!localStorage.getItem(k) && !localStorage.getItem(KEY)) setOpen(true);
  }, [user]);

  const close = () => {
    if (user) localStorage.setItem(KEY + "-" + user.id, "1");
    localStorage.setItem(KEY, "1");
    setOpen(false);
    // signal AI buddy to open with tutorial tip
    window.dispatchEvent(new CustomEvent("mp-open-ai-tutorial"));
  };

  const next = () => {
    if (step < steps.length - 1) setStep(step + 1);
    else close();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#0a0f1a] shadow-2xl"
          >
            <div className="bg-gradient-to-br from-emerald-500/20 via-transparent to-cyan-500/10 p-6">
              <p className="text-[11px] font-medium uppercase tracking-widest text-emerald-400/80">
                MoneyPulse · {step + 1}/{steps.length}
              </p>
              <div className="mt-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-3xl shadow-lg shadow-emerald-500/30">
                {steps[step].icon}
              </div>
              <h2 className="mt-4 text-xl font-bold text-white">{steps[step].title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{steps[step].text}</p>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-white/5 p-4">
              <button type="button" onClick={close} className="text-xs text-slate-500 hover:text-white">
                {lang === "en" ? "Skip" : "Пропустить"}
              </button>
              <div className="flex gap-1.5">
                {steps.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                      i === step ? "w-6 bg-emerald-400" : "w-1.5 bg-white/15"
                    }`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={next}
                className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-400"
              >
                {step === steps.length - 1
                  ? lang === "en"
                    ? "Let's go"
                    : "Поехали"
                  : lang === "en"
                    ? "Next"
                    : "Дальше"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
