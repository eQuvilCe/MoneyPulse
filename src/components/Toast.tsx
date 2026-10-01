"use client";

import { createContext, useCallback, useContext, useState, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

type ToastItem = { id: number; text: string; type: "ok" | "err" | "info" };

const Ctx = createContext<(text: string, type?: ToastItem["type"]) => void>(() => {});

export function useToast() {
  return useContext(Ctx);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((text: string, type: ToastItem["type"] = "ok") => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev.slice(-3), { id, text, type }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 2800);
  }, []);

  const colors = {
    ok: "border-emerald-500/30 bg-emerald-500/15 text-emerald-200",
    err: "border-rose-500/30 bg-rose-500/15 text-rose-200",
    info: "border-cyan-500/30 bg-cyan-500/15 text-cyan-200",
  };

  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-24 left-1/2 z-[100] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4 lg:bottom-8">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              className={`pointer-events-auto rounded-2xl border px-4 py-3 text-sm font-medium shadow-xl backdrop-blur-xl ${colors[t.type]}`}
            >
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
