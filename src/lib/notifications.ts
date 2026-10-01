"use client";

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
  const dayKey = new Date().toISOString().slice(0, 10);
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
      lang === "ru"
        ? "Уже после 20:00, а записей за сегодня нет. Добавь доход или расход за 20 секунд."
        : "It's after 8 PM and no logs today. Add income or expense in 20 seconds.",
      true
    );
  };

  const now = new Date();
  const target = new Date();
  target.setHours(20, 0, 0, 0);
  if (now >= target) {
    // already past 20:00 — fire once this session if no txs
    fire();
    return;
  }
  const ms = target.getTime() - now.getTime();
  window.setTimeout(fire, Math.min(ms, 12 * 60 * 60 * 1000));
}

/** @deprecated use scheduleEveningNudge */
export function maybeNudgeToday(enabled: boolean, hasToday: boolean) {
  scheduleEveningNudge(enabled, hasToday, "ru");
}
