"use client";

import { useApp } from "@/components/AppProvider";
import Landing from "@/components/Landing";
import { AmbientBg } from "@/components/motion/PageShell";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";

const PUBLIC = ["/privacy", "/terms"];

export default function AuthShell({ children }: { children: React.ReactNode }) {
  const { user, ready } = useApp();
  const path = usePathname();

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

  // Logged-in shell only — aurora once, never on Landing/Login
  return (
    <>
      <AmbientBg />
      {children}
    </>
  );
}
