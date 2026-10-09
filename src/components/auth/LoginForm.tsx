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
        // eslint-disable-next-line react-hooks/set-state-in-effect -- remembered email lives in localStorage, readable only after mount
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
      setError(ru ? "Введите email и пароль" : "Enter email and password");
      setShake(true);
      setTimeout(() => setShake(false), 450);
      return;
    }
    if (mode === "register" && password.length < 6) {
      setError(ru ? "Пароль — минимум 6 символов" : "Password min 6 characters");
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

  const field =
    "rc-well w-full min-w-0 px-3 py-3 text-[15px] text-white outline-none transition-shadow placeholder:text-[color:var(--rc-smoke)] focus:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.45)]";
  const label = "mb-2 block text-[13px] text-[color:var(--rc-ash)]";
  const strengthWord = [ru ? "слабый" : "weak", ru ? "слабый" : "weak", ru ? "средний" : "fair", ru ? "хороший" : "good", ru ? "надёжный" : "strong"][str];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto w-full max-w-[420px]"
    >
      <motion.div
        animate={shake ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
        className="rc-card-key overflow-hidden"
        style={{ boxShadow: "var(--rc-key), rgba(0,0,0,0.45) 0 4px 40px 8px, rgba(0,0,0,0.6) 0 40px 80px -20px" }}
      >
        <div className="px-6 pt-6">
          <h2 className="rc-h">{mode === "login" ? (ru ? "С возвращением" : "Welcome back") : ru ? "Создайте аккаунт" : "Create your account"}</h2>
          <p className="mt-2 text-[14px] text-[color:var(--rc-ash)]">
            {mode === "login"
              ? ru ? "Войдите, чтобы продолжить учёт." : "Sign in to keep tracking."
              : ru ? "Бесплатно и без привязки карты." : "Free, and no card needed."}
          </p>

          {/* segmented switch */}
          <div className="relative mt-5 grid grid-cols-2 rounded-lg bg-white/[0.05] p-1" role="tablist">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => {
                  setMode(m);
                  setError("");
                }}
                className={`relative rounded-md py-2 text-[13px] font-medium transition-colors ${mode === m ? "text-[#18191a]" : "text-[color:var(--rc-ash)] hover:text-white"}`}
              >
                {mode === m && (
                  <motion.span
                    layoutId="auth-tab-pill"
                    className="absolute inset-0 rounded-md bg-[color:var(--rc-mist)]"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative">{m === "login" ? tr("login") : tr("register")}</span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4 p-6" noValidate>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {mode === "register" && (
                <div>
                  <label htmlFor="mp-name" className={label}>
                    {tr("name") || (ru ? "Имя" : "Name")}
                  </label>
                  <input id="mp-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} className={field} />
                </div>
              )}
              <div>
                <label htmlFor="mp-email" className={`${label} flex items-center justify-between`}>
                  <span>Email</span>
                  {emailOk(email) && <span className="text-[color:var(--rc-green)]" aria-hidden="true">✓</span>}
                </label>
                <input
                  id="mp-email"
                  type="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={field}
                />
              </div>
              <div>
                <label htmlFor="mp-pass" className={label}>
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
                    className={`${field} pr-24`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    aria-pressed={showPass}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md px-2 py-1.5 text-[12px] text-[color:var(--rc-ash)] transition-colors hover:text-white"
                  >
                    {showPass ? (ru ? "Скрыть" : "Hide") : ru ? "Показать" : "Show"}
                  </button>
                </div>
                {mode === "register" && password.length > 0 && (
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex flex-1 gap-1" aria-hidden="true">
                      {[0, 1, 2, 3].map((i) => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < str ? (str <= 1 ? "bg-[color:var(--rc-coral)]" : "bg-white") : "bg-white/10"}`} />
                      ))}
                    </div>
                    <span className="rc-mono shrink-0 text-[color:var(--rc-smoke)]">{strengthWord}</span>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-[color:var(--rc-ash)]">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 accent-[#e6e6e6]" />
            {ru ? "Запомнить меня" : "Remember me"}
          </label>

          <AnimatePresence>
            {error && (
              <motion.p
                role="alert"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-lg px-3 py-2.5 text-[13px] text-white"
                style={{ background: "var(--rc-ember)", boxShadow: "inset 0 0 0 1px rgba(255,99,99,0.4)" }}
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <button type="submit" disabled={loading || success} className="rc-btn rc-btn-fill !min-h-[46px] w-full disabled:opacity-70">
            {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black/70" />}
            {success ? "✓" : mode === "login" ? tr("login") : tr("register")}
          </button>

          <div className="flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-[color:var(--rc-border)]" />
            <span className="rc-eyebrow !text-[10px]">{ru ? "или" : "or"}</span>
            <span className="h-px flex-1 bg-[color:var(--rc-border)]" />
          </div>

          <button type="button" onClick={() => void enterDemo()} className="rc-btn rc-btn-dark !min-h-[44px] w-full">
            {ru ? "Попробовать демо" : "Try demo"}
            <span aria-hidden="true">→</span>
          </button>

          <p className="rc-mono text-center text-[color:var(--rc-smoke)]">
            {ru ? "пароль хранится как scrypt-хеш" : "passwords are stored as scrypt hashes"}
          </p>
        </form>
      </motion.div>
    </motion.div>
  );
}
