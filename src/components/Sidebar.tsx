"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send } from "lucide-react";
import { useApp } from "@/components/AppProvider";

import PulseRing from "@/components/fx/PulseRing";
import { useRealtimeData } from "@/hooks/useRealtimeData";
import { getHealthScore } from "@/lib/ai";

function NavItem({
  href,
  label,
  icon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: string;
  active: boolean;
  onNavigate?: () => void;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [glow, setGlow] = useState({ x: 50, y: 50, on: false });

  return (
    <Link
      ref={ref}
      href={href}
      onClick={onNavigate}
      onMouseMove={(e) => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        setGlow({
          x: ((e.clientX - r.left) / r.width) * 100,
          y: ((e.clientY - r.top) / r.height) * 100,
          on: true,
        });
      }}
      onMouseLeave={() => setGlow((g) => ({ ...g, on: false }))}
      className="group relative block"
    >
      <motion.div
        layout
        className={`relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-[13px] transition-colors duration-200 ${
          active
            ? "text-white"
            : "text-slate-500 hover:text-slate-200"
        }`}
        whileHover={{ x: 2 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
      >
        {/* cursor-follow light */}
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: glow.on
              ? `radial-gradient(circle at ${glow.x}% ${glow.y}%, rgba(34,211,238,0.12) 0%, transparent 70%)`
              : "transparent",
          }}
        />
        {/* active bar */}
        {active && (
          <motion.span
            layoutId="nav-active"
            className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-cyan-400"
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          />
        )}
        {active && (
          <span className="absolute inset-0 rounded-xl bg-cyan-400/[0.06]" />
        )}
        <span
          className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-lg text-sm transition-all duration-200 ${
            active
              ? "bg-cyan-400/10 text-cyan-300"
              : "text-slate-500 group-hover:text-cyan-300/90"
          }`}
        >
          {icon}
        </span>
        <span className="relative z-10 font-medium tracking-tight">{label}</span>
      </motion.div>
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { tr, user, lang, setLang, logout } = useApp();
  const { data } = useRealtimeData(0);

  const navItems = [
    { href: "/", label: tr("pulse"), icon: "◈" },
    { href: "/income", label: tr("income"), icon: "↑" },
    { href: "/expenses", label: tr("expenses"), icon: "↓" },
    { href: "/scan", label: tr("scan"), icon: "▣" },
    { href: "/budgets", label: tr("budgets"), icon: "▦" },
    { href: "/goals", label: tr("goals"), icon: "◎" },
    { href: "/subscriptions", label: tr("subscriptions"), icon: "↻" },
    { href: "/family", label: tr("family"), icon: "👪" },
    { href: "/banks", label: tr("banks"), icon: "⇄" },
    { href: "/calendar", label: tr("calendar"), icon: "▦" },
    { href: "/analytics", label: tr("analytics"), icon: "◈" },
    { href: "/forecast", label: tr("forecast"), icon: "↗" },
    { href: "/ai", label: tr("aiPulse"), icon: "✦" },
    { href: "/settings", label: tr("settings"), icon: "⚙" },
  ];

  const Nav = (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex items-center gap-3 border-b border-white/[0.05] px-4 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400/20 to-teal-500/10 ring-1 ring-cyan-400/20">
          <span className="text-sm font-bold text-cyan-300">◈</span>
        </div>
        <div>
          <h1 className="text-sm font-semibold tracking-tight text-white">{tr("brand")}</h1>
          <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-slate-500">
            {tr("tagline")}
          </p>
        </div>
      </div>

      {/* Mini financial core */}
      <div className="flex justify-center border-b border-white/[0.05] py-4">
        <PulseRing score={data ? getHealthScore(data) : 0} size={88} />
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={pathname === item.href}
            onNavigate={() => setMobileOpen(false)}
          />
        ))}
      </nav>

      <div className="border-t border-white/[0.05] p-3 space-y-2">
        {/* one tap → the bot; /api/telegram/go links the account on the way if needed */}
        <a
          href="/api/telegram/go"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 rounded-xl bg-sky-500/10 px-3 py-2.5 text-sky-200 ring-1 ring-sky-400/20 transition hover:bg-sky-500/20"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-500 text-white">
            <Send size={14} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold leading-tight">{lang === "ru" ? "Бот в Telegram" : "Telegram bot"}</span>
            <span className="block truncate text-[10px] text-sky-300/70">{lang === "ru" ? "Траты одной строкой" : "Log spending in one line"}</span>
          </span>
        </a>
        <div className="flex gap-1">
          {(["ru", "en"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                lang === l
                  ? "bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-400/25"
                  : "text-slate-600 hover:text-slate-400"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        {user && (
          <div className="rounded-xl bg-white/[0.02] px-3 py-2.5 ring-1 ring-white/[0.04]">
            <p className="truncate text-xs font-medium text-slate-300">{user.name}</p>
            <p className="truncate text-[10px] text-slate-600">{user.email}</p>
            <button
              type="button"
              onClick={() => void logout()}
              className="mt-1.5 text-[10px] text-slate-500 transition hover:text-rose-400"
            >
              {lang === "ru" ? "Выйти" : "Log out"}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[240px] border-r border-white/[0.05] bg-[#070b12] lg:block">
        {Nav}
      </aside>

      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-3 top-3 z-40 flex h-10 w-10 items-center justify-center rounded-xl bg-[#0e1420] text-slate-300 ring-1 ring-white/10 lg:hidden"
        aria-label="Menu"
      >
        ☰
      </button>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/70 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed left-0 top-0 z-50 h-full w-[240px] bg-[#070b12] lg:hidden"
            >
              {Nav}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
