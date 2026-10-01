"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useApp } from "@/components/AppProvider";

export default function MobileNav() {
  const path = usePathname();
  const { tr } = useApp();

  const items = [
    { href: "/", label: tr("pulse"), icon: "◈" },
    { href: "/expenses", label: tr("spending"), icon: "↓" },
    { href: "/calendar", label: tr("calendar"), icon: "▦" },
    { href: "/ai", label: "AI", icon: "✦" },
    { href: "/settings", label: tr("more"), icon: "⚙" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#05080f]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 py-1.5">
        {items.map((item) => {
          const active = path === item.href || (item.href !== "/" && path.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-medium ${
                active ? "text-emerald-400" : "text-slate-500"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="mob-nav"
                  className="absolute inset-0 rounded-xl bg-emerald-500/10"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative text-base leading-none">{item.icon}</span>
              <span className="relative truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
