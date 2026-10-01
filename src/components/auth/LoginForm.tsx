"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/components/AppProvider";

const REMEMBER_KEY = "mp-remember-email";

function emailOk(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function strength(pw: string) {
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) || /[^a-zA-Z0-9]/.test(pw)) s++;
  return s;
}

export default function LoginForm() {
  const { login, register, tr, lang, enterDemo } = useApp();
  const ru = lang !== "en";
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        setEmail(saved);
        setRemember(true);
      }
    } catch {
      /* */
    }
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError(ru ? "Введи email и пароль" : "Enter email and password");
      setShake(true);
      setTimeout(() => setShake(false), 450);
      return;
    }
    if (mode === "register" && password.length < 6) {
      setError(ru ? "Пароль минимум 6 символов" : "Password min 6 characters");
      setShake(true);
      setTimeout(() => setShake(false), 450);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        if (remember && email.trim()) localStorage.setItem(REMEMBER_KEY, email.trim().toLowerCase());
        else localStorage.removeItem(REMEMBER_KEY);
        const res =
          mode === "login"
            ? await login(email.trim(), password, remember)
            : await register(name.trim() || "User", email.trim(), password, remember);
        if (!res.ok) {
          setError(res.error || (ru ? "Ошибка" : "Error"));
          setShake(true);
          setTimeout(() => setShake(false), 450);
        } else {
          setSuccess(true);
        }
      } catch {
        setError(ru ? "Сеть недоступна" : "Network error");
        setShake(true);
        setTimeout(() => setShake(false), 450);
      }
      setLoading(false);
    })();
  };

  const str = strength(password);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="relative mx-auto w-full max-w-md"
    >
      <div
        className="absolute -inset-[1px] rounded-[1.35rem] opacity-80"
        style={{
          background: "conic-gradient(from var(--angle, 0deg), #3cf2b0, #38bdf8, #8b5cf6, #3cf2b0)",
          animation: "mp-spin-border 6s linear infinite",
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          padding: "1px",
        }}
      />
      <motion.div
        animate={shake ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-[1.3rem] border border-white/[0.08] bg-[#0a0e17]/90 shadow-2xl backdrop-blur-xl"
      >
        <div className="border-b border-white/[0.05] px-6 py-4 lg:hidden">
          <p className="font-display text-sm font-semibold">MoneyPulse</p>
          <p className="text-xs text-slate-500">
            {ru ? "Знайте, куда уходят деньги" : "Know where your money goes"}
          </p>
        </div>

        <div className="relative flex border-b border-white/[0.05]">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError("");
              }}
              className={`relative flex-1 py-3.5 text-sm font-medium transition ${
                mode === m ? "text-white" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {m === "login" ? tr("login") : tr("register")}
              {mode === m && (
                <motion.span
                  layoutId="auth-tab-pill"
                  className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3.5 p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
              className="space-y-3.5"
            >
              {mode === "register" && (
                <div>
                  <label htmlFor="mp-name" className="mb-1.5 block text-[11px] text-slate-500">
                    {tr("name") || (ru ? "Имя" : "Name")}
                  </label>
                  <input
                    id="mp-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    className="w-full rounded-xl border border-white/[0.08] bg-[#05070d] px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/15"
                  />
                </div>
              )}
              <div>
                <label
                  htmlFor="mp-email"
                  className="mb-1.5 flex items-center justify-between text-[11px] text-slate-500"
                >
                  <span>Email</span>
                  {emailOk(email) && <span className="text-emerald-400">✓</span>}
                </label>
                <input
                  id="mp-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full rounded-xl border border-white/[0.08] bg-[#05070d] px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/15"
                />
              </div>
              <div>
                <label htmlFor="mp-pass" className="mb-1.5 block text-[11px] text-slate-500">
                  {ru ? "Пароль" : "Password"}
                </label>
                <div className="relative">
                  <input
                    id="mp-pass"
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    className="w-full rounded-xl border border-white/[0.08] bg-[#05070d] px-3.5 py-2.5 pr-14 text-sm text-white outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 text-[11px] text-slate-500 hover:text-slate-300"
                  >
                    {showPass ? (ru ? "Скрыть" : "Hide") : ru ? "Показать" : "Show"}
                  </button>
                </div>
                {mode === "register" && password.length > 0 && (
                  <div className="mt-2 flex gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          i < str ? "bg-cyan-400" : "bg-white/10"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-500">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="rounded border-white/20 accent-cyan-400"
            />
            {ru ? "Запомнить меня" : "Remember me"}
          </label>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-xs text-rose-300"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={loading || success}
            className="mp-btn-primary flex w-full items-center justify-center gap-2 py-3 text-sm"
          >
            {loading && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900/30 border-t-slate-900" />
            )}
            {success ? "✓" : mode === "login" ? tr("login") : tr("register")}
          </button>

          <div className="relative py-1 text-center">
            <span className="relative z-10 bg-[#0a0e17] px-2 text-[10px] uppercase tracking-wider text-slate-600">
              {ru ? "или" : "or"}
            </span>
            <div className="absolute inset-x-0 top-1/2 h-px bg-white/[0.06]" />
          </div>

          <button type="button" onClick={() => void enterDemo()} className="mp-btn-ghost w-full py-2.5 text-sm">
            {ru ? "Попробовать демо" : "Try demo"}
          </button>
        </form>
      </motion.div>
      <style>{`
        @property --angle {
          syntax: "<angle>";
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes mp-spin-border {
          to { --angle: 360deg; }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="mp-spin-border"] { animation: none !important; }
        }
      `}</style>
    </motion.div>
  );
}
