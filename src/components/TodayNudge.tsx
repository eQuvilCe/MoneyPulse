"use client";

import { motion, AnimatePresence } from "framer-motion";
import { FinanceData, dateKey } from "@/lib/types";
import { useState, useEffect } from "react";
import { scheduleEveningNudge, enableBrowserNotifications } from "@/lib/notifications";
import { useApp } from "@/components/AppProvider";

/** Small delay so the banner doesn't flash in before the dashboard has painted. */
const SHOW_DELAY_MS = 1500;

export default function TodayNudge({ data }: { data: FinanceData }) {
  const [show, setShow] = useState(false);
  const { lang, tr } = useApp();
  const today = dateKey();
  const hasToday = data.transactions.some((t) => t.date === today);
  const enabled = data.settings.notifications !== false; // default on

  useEffect(() => {
    // request permission once if notifications preferred
    if (enabled) {
      void enableBrowserNotifications();
    }
    const cancelNudge = scheduleEveningNudge(enabled, hasToday, lang);
    if (!hasToday) {
      const t = setTimeout(() => setShow(true), SHOW_DELAY_MS);
      return () => {
        clearTimeout(t);
        cancelNudge();
      };
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- visibility follows a timer; hiding it when today's entry appears is the same sync
    setShow(false);
    return cancelNudge;
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
            <span className="text-xl" aria-hidden>👀</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-200">
                {tr("nudgeNothingToday")}
              </p>
              <p className="text-xs text-amber-200/60">
                {tr("nudgeNothingTodayHint")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShow(false)}
              aria-label={tr("dismiss")}
              title={tr("dismiss")}
              className="rounded-lg p-1 text-amber-200/50 transition hover:bg-amber-500/10 hover:text-amber-100"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
