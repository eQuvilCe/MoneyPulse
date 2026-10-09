"use client";

import { motion, AnimatePresence } from "framer-motion";
import { FinanceData, dateKey } from "@/lib/types";
import { useState, useEffect } from "react";
import { scheduleEveningNudge, enableBrowserNotifications } from "@/lib/notifications";
import { useApp } from "@/components/AppProvider";

export default function TodayNudge({ data }: { data: FinanceData }) {
  const [show, setShow] = useState(false);
  const { lang } = useApp();
  const today = dateKey();
  const hasToday = data.transactions.some((t) => t.date === today);
  const enabled = data.settings.notifications !== false; // default on

  useEffect(() => {
    // request permission once if notifications preferred
    if (enabled) {
      void enableBrowserNotifications();
    }
    scheduleEveningNudge(enabled, hasToday, lang);
    if (!hasToday) {
      const t = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- visibility follows a timer; hiding it when today's entry appears is the same sync
    setShow(false);
  }, [hasToday, data.transactions.length, enabled, lang]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3">
            <span className="text-xl">👀</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-200">
                {lang === "ru" ? "Сегодня ещё ничего не записано" : "Nothing logged today yet"}
              </p>
              <p className="text-xs text-amber-200/60">
                {lang === "ru"
                  ? "Кинь кофе, обед или доход — 20 секунд. После 20:00 придёт напоминание."
                  : "Log coffee, lunch or income in 20 sec. After 8 PM you’ll get a reminder."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShow(false)}
              className="text-amber-200/50 hover:text-amber-100"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
