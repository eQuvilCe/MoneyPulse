"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { loadDataAsync } from "@/lib/storage";
import { generateDailyBriefing, DailyBriefing } from "@/lib/ai";
import { useApp } from "@/components/AppProvider";

const SESSION_KEY = "mp-briefing-shown";

export default function AIBriefing() {
  const { tr } = useApp();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"scan" | "show">("scan");
  const [brief, setBrief] = useState<DailyBriefing | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    let cancelled = false;
    (async () => {
      const data = await loadDataAsync();
      if (cancelled) return;
      const b = generateDailyBriefing(data);
      setBrief(b);
      setOpen(true);
      setTimeout(() => setPhase("show"), 1600);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const close = () => {
    sessionStorage.setItem(SESSION_KEY, "1");
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && brief && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-emerald-500/20 bg-[#070b14] shadow-2xl shadow-emerald-500/10"
          >
            {/* scan phase */}
            {phase === "scan" && (
              <div className="flex flex-col items-center justify-center px-8 py-16">
                <div className="relative flex h-28 w-28 items-center justify-center">
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-emerald-400/30"
                    animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 1.4, repeat: Infinity }}
                  />
                  <motion.div
                    className="absolute inset-2 rounded-full border border-cyan-400/40"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    style={{ borderTopColor: "#34d399", borderRightColor: "transparent" }}
                  />
                  <span className="text-3xl">✦</span>
                </div>
                <motion.p
                  className="mt-6 text-sm font-medium text-emerald-300"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                >
                  {tr("aiScanning")}
                </motion.p>
                <p className="mt-1 text-xs text-slate-500">{tr("aiScanningCategories")}</p>
              </div>
            )}

            {phase === "show" && (
              <div className="p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-lg font-bold text-slate-950 shadow-lg shadow-emerald-500/30">
                    ✦
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-widest text-emerald-400/80">
                      AI Briefing
                    </p>
                    <h2 className="text-lg font-bold text-white">{brief.headline}</h2>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {tr("pulse")}{" "}
                      <span
                        className={
                          brief.health >= 70
                            ? "text-emerald-400"
                            : brief.health >= 45
                            ? "text-amber-400"
                            : "text-rose-400"
                        }
                      >
                        {brief.health}/100
                      </span>
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-2">
                  {brief.lines.map((line, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.08 }}
                      className="rounded-xl bg-white/[0.04] px-3.5 py-2.5 text-sm text-slate-300 ring-1 ring-white/[0.05]"
                    >
                      {line}
                    </motion.div>
                  ))}
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                    {tr("aiBriefingFocus")}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-200">{brief.focus}</p>
                </motion.div>

                <button
                  onClick={close}
                  className="mt-5 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:opacity-95"
                >
                  {tr("aiBriefingGotIt")}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
