"use client";

import { useEffect } from "react";
import { useApp } from "@/components/AppProvider";
import Landing from "@/components/Landing";
import BackgroundStage from "@/components/motion/BackgroundStage";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useToast } from "@/components/Toast";
import { onSessionExpired } from "@/lib/events";

const PUBLIC = ["/privacy", "/terms", "/offline"];
/** Several requests can fail with 401 at once — show the expiry toast only once per burst. */
const SESSION_TOAST_DEDUPE_MS = 5000;

export default function AuthShell({ children }: { children: React.ReactNode }) {
  const { user, ready, tr } = useApp();
  const path = usePathname();
  const toast = useToast();

  useEffect(() => {
    let lastShown = 0;
    return onSessionExpired(() => {
      const now = Date.now();
      if (now - lastShown < SESSION_TOAST_DEDUPE_MS) return; // collapse duplicate fires (e.g. dev StrictMode double-effects)
      lastShown = now;
      toast(tr("sessionExpired"), "err");
    });
  }, [toast, tr]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#05070d]">
        <motion.div
          className="h-10 w-10 rounded-full border-2 border-cyan-500/20 border-t-cyan-400"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  if (!user && PUBLIC.includes(path)) {
    return <div className="min-h-screen bg-[#05070d] text-white">{children}</div>;
  }

  if (!user) return <Landing />;

  // Logged-in shell only — one background per route, never on Landing/Login
  return (
    <>
      <BackgroundStage pathname={path} />
      {children}
    </>
  );
}
