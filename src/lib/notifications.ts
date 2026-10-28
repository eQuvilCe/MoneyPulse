"use client";

import { dateKey } from "@/lib/types";
import { t } from "@/lib/i18n";

/** Local hour after which an empty day triggers the reminder. */
const NUDGE_HOUR = 20;
/** Cap for the pending timer so a tab left open overnight doesn't fire tomorrow. */
const MAX_NUDGE_DELAY_MS = 12 * 60 * 60 * 1000;

export async function enableBrowserNotifications(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const res = await Notification.requestPermission();
  return res === "granted";
}

export function notifyIfAllowed(title: string, body: string, enabled = true) {
  if (!enabled) return;
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/icons/icon-192.png" });
  } catch {
    /* ignore */
  }
}

/**
 * Evening reminder after 20:00 local time if user has no transactions today.
 * Also schedules a check so if they open the app before 20:00, nudge fires later.
 */
export function scheduleEveningNudge(enabled: boolean, hasToday: boolean, lang: "ru" | "en" = "ru") {
  if (typeof window === "undefined" || !enabled) return;
  const dayKey = dateKey();
  const doneKey = "mp-evening-nudge-" + dayKey;
  if (localStorage.getItem(doneKey)) return;

  const fire = () => {
    if (localStorage.getItem(doneKey)) return;
    if (hasToday) {
      localStorage.setItem(doneKey, "1");
      return;
    }
    localStorage.setItem(doneKey, "1");
    notifyIfAllowed(
      "MoneyPulse",
      t(lang, "eveningNudgeBody"),
      true
    );
  };

  const now = new Date();
  const target = new Date();
  target.setHours(NUDGE_HOUR, 0, 0, 0);
  if (now >= target) {
    // already past 20:00 — fire once this session if no txs
    fire();
    return;
  }
  const ms = target.getTime() - now.getTime();
  window.setTimeout(fire, Math.min(ms, MAX_NUDGE_DELAY_MS));
}

