"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/AppProvider";

export default function PWARegister() {
  const { tr } = useApp();
  const [deferred, setDeferred] = useState<Event | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // DEV: kill service workers — they cache stale Next chunks and break HMR
    if (process.env.NODE_ENV !== "production") {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((r) => r.unregister());
        });
      }
      if ("caches" in window) {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
      }
      return;
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  if (!show || !deferred) return null;

  return (
    <div className="fixed bottom-20 left-3 right-3 z-50 mx-auto max-w-md rounded-2xl border border-emerald-500/30 bg-[#0a0f1a]/95 p-4 shadow-2xl backdrop-blur-xl lg:bottom-6">
      <p className="text-sm font-semibold text-white">{tr("installAppTitle")}</p>
      <p className="mt-1 text-xs text-slate-400">{tr("installAppHint")}</p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="flex-1 rounded-xl bg-emerald-500 py-2 text-sm font-semibold text-white"
          onClick={async () => {
            // @ts-expect-error beforeinstallprompt
            await deferred.prompt?.();
            setShow(false);
            setDeferred(null);
          }}
        >
          {tr("installAction")}
        </button>
        <button
          type="button"
          className="rounded-xl bg-white/5 px-4 py-2 text-sm text-slate-400"
          onClick={() => setShow(false)}
        >
          {tr("installLater")}
        </button>
      </div>
    </div>
  );
}
