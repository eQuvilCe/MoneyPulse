"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { loadDataAsync } from "@/lib/storage";
import { FinanceData } from "@/lib/types";
import { answerAIChat, getDoctorGreeting, getHealthScore } from "@/lib/ai";

const QUICK = [
  "Полный отчёт",
  "Сколько сегодня?",
  "Прогноз месяца",
  "Баланс",
  "Бюджеты",
  "Топ расходов",
  "Цели",
  "Дай совет",
  "Последние операции",
  "Мой пульс",
];

export default function AIBuddy() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<FinanceData | null>(null);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [bounce, setBounce] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadDataAsync().then((d) => {
      setData(d);
      setMessages([{ role: "assistant", text: getDoctorGreeting(d) }]);
    });
    const t = setInterval(() => setBounce(true), 12000);
    const onTutorial = () => {
      setOpen(true);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text:
            "👋 Быстрый тутор: 1) Добавь доход/расход на Пульсе или в формах. 2) Банки → вставь SMS от карты. 3) Спроси меня «баланс» или «совет». Жми кнопки ниже!",
        },
      ]);
    };
    window.addEventListener("mp-open-ai-tutorial", onTutorial);
    return () => {
      clearInterval(t);
      window.removeEventListener("mp-open-ai-tutorial", onTutorial);
    };
  }, []);

  useEffect(() => {
    if (bounce) {
      const t = setTimeout(() => setBounce(false), 800);
      return () => clearTimeout(t);
    }
  }, [bounce]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing, open]);

  const send = async (text: string) => {
    if (!text.trim() || !data) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setTyping(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (res.ok) {
        const json = await res.json();
        setMessages((m) => [...m, { role: "assistant", text: json.reply }]);
      } else {
        setMessages((m) => [...m, { role: "assistant", text: answerAIChat(text, data) }]);
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: answerAIChat(text, data) }]);
    }
    setTyping(false);
  };

  const health = data ? getHealthScore(data) : 0;

  return (
    <>
      {/* Floating 3D buddy */}
      <motion.button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-2xl perspective-1000 lg:bottom-8 lg:right-8"
        style={{ perspective: 800 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        animate={bounce ? { y: [0, -10, 0], rotate: [0, -6, 6, 0] } : { y: [0, -4, 0] }}
        transition={
          bounce
            ? { duration: 0.6 }
            : { y: { duration: 3, repeat: Infinity, ease: "easeInOut" } }
        }
      >
        <motion.div
          className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-500 shadow-2xl shadow-emerald-500/40"
          style={{ transformStyle: "preserve-3d" }}
          animate={{
            rotateY: [0, 8, 0, -8, 0],
            rotateX: [0, 4, 0, -4, 0],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* face */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="flex gap-1.5">
              <motion.span
                className="h-2 w-2 rounded-full bg-slate-900"
                animate={{ scaleY: [1, 0.2, 1] }}
                transition={{ duration: 3.5, repeat: Infinity, repeatDelay: 2 }}
              />
              <motion.span
                className="h-2 w-2 rounded-full bg-slate-900"
                animate={{ scaleY: [1, 0.2, 1] }}
                transition={{ duration: 3.5, repeat: Infinity, repeatDelay: 2, delay: 0.05 }}
              />
            </div>
            <motion.div
              className="mt-1 h-1 w-3 rounded-full bg-slate-900/80"
              animate={{ width: ["12px", "8px", "12px"] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          {/* glow ring */}
          <motion.span
            className="absolute inset-0 rounded-2xl ring-2 ring-white/30"
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-950 text-[10px] font-bold text-emerald-400 ring-2 ring-emerald-400/50">
            AI
          </span>
        </motion.div>
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.92, rotateX: 8 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              style={{ transformPerspective: 1000 }}
              className="fixed bottom-24 right-4 z-[70] flex h-[min(520px,70vh)] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0a0f1a]/95 shadow-2xl shadow-black/50 backdrop-blur-xl lg:right-8"
            >
              {/* header */}
              <div className="flex items-center gap-3 border-b border-white/5 bg-gradient-to-r from-emerald-500/15 to-cyan-500/10 px-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/30">
                  <div className="flex flex-col items-center scale-75">
                    <div className="flex gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-900" />
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-900" />
                    </div>
                    <div className="mt-0.5 h-0.5 w-2 rounded-full bg-slate-900/80" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">Пульс</p>
                  <p className="text-[11px] text-emerald-400/80">
                    AI-помощник · score {health}
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* messages */}
              <div className="flex-1 space-y-2.5 overflow-y-auto p-3">
                {messages.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[88%] whitespace-pre-line rounded-2xl px-3 py-2 text-[13px] leading-relaxed ${
                        m.role === "user"
                          ? "bg-emerald-500/25 text-emerald-50"
                          : "bg-white/[0.06] text-slate-200"
                      }`}
                    >
                      {m.text}
                    </div>
                  </motion.div>
                ))}
                {typing && (
                  <div className="flex justify-start">
                    <motion.div
                      className="rounded-2xl bg-white/[0.06] px-3 py-2 text-xs text-slate-500"
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      думает...
                    </motion.div>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              {/* quick */}
              <div className="flex flex-wrap gap-1 border-t border-white/5 px-3 pt-2">
                {QUICK.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] text-slate-400 ring-1 ring-white/[0.06] hover:bg-white/[0.08] hover:text-white"
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                className="flex gap-2 p-3"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Спроси про деньги..."
                  className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/40"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-emerald-400"
                >
                  →
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
