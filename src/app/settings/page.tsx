"use client";

import { useEffect, useState } from "react";
import { loadDataAsync, updateSettings, exportJSON, exportCSV } from "@/lib/storage";
import { FinanceData, MAX_AMOUNT, formatMoneyCompact, readAmount } from "@/lib/types";
import { PageShell, FadeItem, Skeleton } from "@/components/motion/PageShell";
import TiltCard from "@/components/motion/TiltCard";
import TelegramCard from "@/components/TelegramCard";
import { LetterReveal } from "@/components/motion/Reveal";
import { useApp } from "@/components/AppProvider";
import { useToast } from "@/components/Toast";
import CsvImport from "@/components/CsvImport";
import StreakBadge from "@/components/StreakBadge";
import {
  User,
  Target,
  Palette,
  Tags,
  Bell,
  Database,
  ShieldCheck,
  MessageCircle,
  Lock,
  Trash2,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function SectionHeading({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
      <span
        className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10"
        style={{ color: "var(--page-accent)" }}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
      </span>
      {children}
    </h2>
  );
}

function SettingsCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <FadeItem>
      <TiltCard className={`mp-card space-y-4 rounded-2xl p-6 ${className}`}>{children}</TiltCard>
    </FadeItem>
  );
}

const CURRENCIES = [
  { code: "сум", label: "сум (UZS)" },
  { code: "UZS", label: "UZS" },
  { code: "₽", label: "₽ RUB" },
  { code: "$", label: "$ USD" },
  { code: "€", label: "€ EUR" },
  { code: "₸", label: "₸ KZT" },
  { code: "₴", label: "₴ UAH" },
  { code: "£", label: "£ GBP" },
  { code: "¥", label: "¥" },
  { code: "₩", label: "₩" },
  { code: "CHF", label: "CHF" },
];

const fieldClass =
  "w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-2.5 text-sm outline-none transition focus:border-[var(--page-accent)]/50";

export default function SettingsPage() {
  const { tr, user, updateProfile, lang, setLang, logout, theme, setTheme } = useApp();
  const toast = useToast();
  const [data, setData] = useState<FinanceData | null>(null);

  // Account
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Finance (currency now saves together with income goal/savings — one explicit Save per card)
  const [incomeGoal, setIncomeGoal] = useState("");
  const [savings, setSavings] = useState("20");
  const [currency, setCurrency] = useState("₽");
  const [savingFinance, setSavingFinance] = useState(false);

  const [newCat, setNewCat] = useState("");

  // Danger zone
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const refresh = () => loadDataAsync().then(setData);

  useEffect(() => {
    loadDataAsync().then((d) => {
      setData(d);
      setIncomeGoal(d.settings.monthlyIncomeGoal?.toString() || "");
      setSavings(String(d.settings.savingsTargetPercent));
      setCurrency(d.settings.currency || "₽");
    });
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- form fields are seeded from the session user once it is known
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  const saveAccount = async () => {
    if (!EMAIL_RE.test(email.trim())) {
      setEmailError(lang === "ru" ? "Неверный формат email" : "Invalid email format");
      return;
    }
    setEmailError("");
    setSavingProfile(true);
    const res = await updateProfile({ name, email });
    setSavingProfile(false);
    if (!res.ok) {
      toast(res.error || (lang === "ru" ? "Не удалось сохранить профиль" : "Could not save profile"), "err");
      return;
    }
    toast(tr("saved"));
  };

  const savePassword = async () => {
    if (newPassword.length < 6) {
      toast(lang === "ru" ? "Новый пароль — минимум 6 символов" : "New password needs at least 6 characters", "err");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast(lang === "ru" ? "Пароли не совпадают" : "Passwords don't match", "err");
      return;
    }
    if (!currentPassword) {
      toast(lang === "ru" ? "Введи текущий пароль" : "Enter your current password", "err");
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const resData = await res.json();
      if (!res.ok) {
        toast(resData.issues?.[0] || resData.error || (lang === "ru" ? "Не удалось сменить пароль" : "Could not change password"), "err");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast(lang === "ru" ? "Пароль обновлён" : "Password updated");
    } finally {
      setSavingPassword(false);
    }
  };

  const saveFinance = async () => {
    const goal = incomeGoal ? readAmount(incomeGoal) : null;
    if (goal === "too-big") {
      toast(tr("amountTooBig", { max: formatMoneyCompact(MAX_AMOUNT, currency) }), "err");
      return;
    }
    setSavingFinance(true);
    await updateSettings({
      currency,
      monthlyIncomeGoal: goal ?? undefined,
      savingsTargetPercent: parseInt(savings) || 20,
    });
    setSavingFinance(false);
    toast(tr("saved"));
    refresh();
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/auth/delete", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword || undefined }),
      });
      const resData = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(resData.error || (lang === "ru" ? "Не удалось удалить аккаунт" : "Could not delete account"), "err");
        return;
      }
      await logout();
    } finally {
      setDeleting(false);
    }
  };

  if (!data) {
    return (
      <PageShell className="page-accent-cyan">
        <FadeItem>
          <Skeleton className="h-16 w-full" />
        </FadeItem>
        <FadeItem>
          <Skeleton className="h-56 w-full" />
        </FadeItem>
        <FadeItem>
          <Skeleton className="h-40 w-full" />
        </FadeItem>
        <FadeItem>
          <Skeleton className="h-40 w-full" />
        </FadeItem>
      </PageShell>
    );
  }

  const planLabel =
    lang === "ru"
      ? { free: "Бесплатный", pro: "Pro", demo: "Демо" }[user?.plan || "free"]
      : { free: "Free plan", pro: "Pro", demo: "Demo" }[user?.plan || "free"];

  return (
    <PageShell className="page-accent-cyan">
      <FadeItem>
        <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--page-accent-2)" }}>
          MoneyPulse
        </p>
        <h1 className="mt-1 text-3xl font-bold">
          <LetterReveal text={tr("settings")} />
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {lang === "ru"
            ? "Аккаунт, финансы, оформление и данные — всё в одном месте"
            : "Account, finances, appearance and data — all in one place"}
        </p>
      </FadeItem>

      <FadeItem>
        <StreakBadge data={data} />
      </FadeItem>

      {/* Account */}
      <FadeItem>
        <TiltCard className="mp-card overflow-hidden rounded-2xl">
          <div
            className="border-b border-white/5 px-6 py-4"
            style={{ background: "linear-gradient(90deg, rgba(var(--page-accent-rgb),0.12), transparent)" }}
          >
            <div className="flex items-center gap-4">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold text-slate-950 shadow-lg"
                style={{ background: "linear-gradient(135deg, var(--page-accent-2), var(--page-accent))" }}
              >
                {(user?.name || "U")[0].toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-white">{user?.name}</p>
                <p className="text-xs text-slate-500">{user?.email}</p>
                <span
                  className="mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                  style={{
                    background: "rgba(var(--page-accent-rgb),0.15)",
                    color: "var(--page-accent)",
                    boxShadow: "inset 0 0 0 1px rgba(var(--page-accent-rgb),0.3)",
                  }}
                >
                  {planLabel}
                </span>
              </div>
            </div>
          </div>
          <div className="space-y-4 p-6">
            <SectionHeading icon={User}>{tr("profile")}</SectionHeading>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  {tr("name")}
                </label>
                <input value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  {tr("email")}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError("");
                  }}
                  className={`${fieldClass} ${emailError ? "border-rose-500/60" : ""}`}
                />
                {emailError && <p className="mt-1 text-xs text-rose-400">{emailError}</p>}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void saveAccount()}
              disabled={savingProfile}
              className="rounded-xl px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-lg disabled:opacity-60"
              style={{ background: "var(--page-accent)" }}
            >
              {savingProfile ? (lang === "ru" ? "Сохраняю…" : "Saving…") : tr("save")}
            </button>
          </div>
        </TiltCard>
      </FadeItem>

      <FadeItem>
        <TelegramCard />
      </FadeItem>

      {/* Password */}
      <SettingsCard>
        <SectionHeading icon={Lock}>{lang === "ru" ? "Смена пароля" : "Change password"}</SectionHeading>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-slate-500">
              {lang === "ru" ? "Текущий пароль" : "Current password"}
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={fieldClass}
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-slate-500">
              {lang === "ru" ? "Новый пароль" : "New password"}
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={fieldClass}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-slate-500">
              {lang === "ru" ? "Повтори пароль" : "Confirm password"}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={fieldClass}
              autoComplete="new-password"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => void savePassword()}
          disabled={savingPassword || !currentPassword || !newPassword}
          className="rounded-xl px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-lg disabled:opacity-50"
          style={{ background: "var(--page-accent)" }}
        >
          {savingPassword ? (lang === "ru" ? "Сохраняю…" : "Saving…") : lang === "ru" ? "Обновить пароль" : "Update password"}
        </button>
      </SettingsCard>

      {/* Finance */}
      <SettingsCard>
        <SectionHeading icon={Target}>{lang === "ru" ? "Финансовые цели" : "Financial goals"}</SectionHeading>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-slate-500">
              {tr("incomeGoal")}
            </label>
            <input
              type="number"
              value={incomeGoal}
              onChange={(e) => setIncomeGoal(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-slate-500">
              {tr("savingsTarget")}
            </label>
            <input
              type="number"
              value={savings}
              onChange={(e) => setSavings(e.target.value)}
              min="0"
              max="100"
              className={fieldClass}
            />
          </div>
        </div>
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-slate-500">{tr("currency")}</p>
          <div className="flex flex-wrap gap-2">
            {CURRENCIES.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => setCurrency(c.code)}
                className={
                  currency === c.code
                    ? "rounded-xl px-3 py-2 text-sm font-semibold transition"
                    : "rounded-xl bg-white/5 px-3 py-2 text-sm font-semibold text-slate-400 ring-1 ring-white/10 transition hover:text-white"
                }
                style={
                  currency === c.code
                    ? {
                        background: "rgba(var(--page-accent-rgb),0.2)",
                        color: "var(--page-accent)",
                        boxShadow: "inset 0 0 0 1px rgba(var(--page-accent-rgb),0.3)",
                      }
                    : undefined
                }
              >
                {c.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500">
            {lang === "ru" ? "Нажми «Сохранить», чтобы применить валюту и цели вместе" : "Hit Save to apply the currency and goals together"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void saveFinance()}
          disabled={savingFinance}
          className="rounded-xl px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-lg disabled:opacity-60"
          style={{ background: "var(--page-accent)" }}
        >
          {savingFinance ? (lang === "ru" ? "Сохраняю…" : "Saving…") : tr("save")}
        </button>
      </SettingsCard>

      {/* Appearance */}
      <SettingsCard>
        <SectionHeading icon={Palette}>{tr("appearance")}</SectionHeading>

        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-slate-500">{tr("language")}</p>
          <div className="flex gap-2">
            {(
              [
                { id: "ru" as const, label: "Русский" },
                { id: "en" as const, label: "English" },
              ] as const
            ).map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setLang(l.id)}
                className="rounded-xl px-5 py-2.5 text-sm font-semibold transition"
                style={
                  lang === l.id
                    ? {
                        background: "rgba(var(--page-accent-rgb),0.2)",
                        color: "var(--page-accent)",
                        boxShadow: "inset 0 0 0 1px rgba(var(--page-accent-rgb),0.3)",
                      }
                    : { background: "rgba(255,255,255,0.05)", color: "#94a3b8", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.1)" }
                }
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-slate-500">{tr("theme")}</p>
          <div className="flex gap-2">
            {(["dark", "light"] as const).map((th) => (
              <button
                key={th}
                type="button"
                onClick={() => {
                  setTheme(th);
                  void updateSettings({ theme: th });
                }}
                className="rounded-xl px-5 py-2.5 text-sm font-semibold transition"
                style={
                  theme === th
                    ? {
                        background: "rgba(var(--page-accent-rgb),0.2)",
                        color: "var(--page-accent)",
                        boxShadow: "inset 0 0 0 1px rgba(var(--page-accent-rgb),0.3)",
                      }
                    : { background: "rgba(255,255,255,0.05)", color: "#94a3b8", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.1)" }
                }
              >
                {th === "dark" ? tr("dark") : tr("light")}
              </button>
            ))}
          </div>
        </div>
      </SettingsCard>

      {/* Categories */}
      <SettingsCard>
        <SectionHeading icon={Tags}>{tr("customCategories")}</SectionHeading>
        <p className="text-xs text-slate-500">
          {lang === "ru" ? "Например «Питомцы», «Спорт» — появятся в формах расходов" : "e.g. Pets, Sports — show up in expense forms"}
        </p>
        <div className="flex gap-2">
          <input
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            placeholder={tr("name")}
            className={`flex-1 ${fieldClass}`}
          />
          <button
            type="button"
            onClick={() => {
              const n = newCat.trim();
              if (!n) return;
              const list = Array.from(new Set([...(data.settings.customCategories || []), n]));
              updateSettings({ customCategories: list }).then(() => {
                setNewCat("");
                toast(tr("saved"));
                refresh();
              });
            }}
            className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium hover:bg-white/15"
          >
            +
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(data.settings.customCategories || []).map((c) => (
            <span
              key={c}
              className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-300 ring-1 ring-white/10"
            >
              {c}
              <button
                type="button"
                className="text-slate-500 hover:text-rose-400"
                onClick={() => {
                  const list = (data.settings.customCategories || []).filter((x) => x !== c);
                  updateSettings({ customCategories: list }).then(() => refresh());
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </SettingsCard>

      {/* Notifications */}
      <SettingsCard>
        <SectionHeading icon={Bell}>{tr("notifications")}</SectionHeading>
        <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
          <span className="text-slate-300">{tr("rememberDay")}</span>
          <input
            type="checkbox"
            checked={!!data.settings.notifications}
            onChange={async (e) => {
              const on = e.target.checked;
              if (on) {
                const { enableBrowserNotifications } = await import("@/lib/notifications");
                const ok = await enableBrowserNotifications();
                if (!ok) {
                  toast(lang === "ru" ? "Разреши уведомления в браузере" : "Allow browser notifications", "err");
                  return;
                }
              }
              await updateSettings({ notifications: on });
              toast(tr("saved"));
              refresh();
            }}
            className="h-4 w-4 rounded border-white/20"
          />
        </label>
      </SettingsCard>

      {/* Data */}
      <SettingsCard>
        <SectionHeading icon={Database}>{tr("dataSection")}</SectionHeading>
        <CsvImport onDone={refresh} />
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-slate-500">{tr("export")}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => exportJSON(data)}
              className="rounded-xl bg-white/[0.05] px-4 py-2.5 text-sm ring-1 ring-white/10 hover:bg-white/10"
            >
              JSON
            </button>
            <button
              type="button"
              onClick={() => exportCSV(data)}
              className="rounded-xl bg-white/[0.05] px-4 py-2.5 text-sm ring-1 ring-white/10 hover:bg-white/10"
            >
              CSV
            </button>
          </div>
        </div>
      </SettingsCard>

      {/* Security + logout */}
      <SettingsCard>
        <SectionHeading icon={ShieldCheck}>{tr("security")}</SectionHeading>
        <ul className="space-y-1.5 text-xs leading-relaxed text-slate-500">
          <li>• {lang === "ru" ? "Пароли: scrypt, в cookie только JWT" : "Passwords: scrypt, JWT cookie only"}</li>
          <li>• {lang === "ru" ? "Данные изолированы по user_id" : "Data isolated by user_id"}</li>
          <li>• {lang === "ru" ? "Сессия до 1 года при «Запомнить»" : "Session up to 1 year with Remember"}</li>
        </ul>
        <button
          type="button"
          onClick={logout}
          className="w-full rounded-xl bg-rose-500/15 py-3 text-sm font-semibold text-rose-300 ring-1 ring-rose-500/25 hover:bg-rose-500/25"
        >
          {tr("logout")}
        </button>
      </SettingsCard>

      {/* Danger zone — delete account */}
      <SettingsCard className="border border-rose-500/20">
        <SectionHeading icon={Trash2}>{lang === "ru" ? "Опасная зона" : "Danger zone"}</SectionHeading>
        {!deleteOpen ? (
          <>
            <p className="text-xs text-slate-500">
              {lang === "ru"
                ? "Удаление аккаунта необратимо — все транзакции, цели, бюджеты и счета будут удалены навсегда."
                : "Deleting your account is permanent — all transactions, goals, budgets and accounts are erased forever."}
            </p>
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="rounded-xl bg-rose-500/15 px-6 py-2.5 text-sm font-semibold text-rose-300 ring-1 ring-rose-500/25 hover:bg-rose-500/25"
            >
              {lang === "ru" ? "Удалить аккаунт" : "Delete account"}
            </button>
          </>
        ) : (
          <div className="space-y-3 rounded-xl border border-rose-500/25 bg-rose-500/5 p-4">
            <div className="flex items-start gap-2 text-xs text-rose-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                {lang === "ru"
                  ? 'Это нельзя отменить. Введи пароль и напиши "DELETE", чтобы подтвердить.'
                  : 'This cannot be undone. Enter your password and type "DELETE" to confirm.'}
              </p>
            </div>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder={lang === "ru" ? "Пароль (если есть)" : "Password (if you have one)"}
              className={fieldClass}
              autoComplete="current-password"
            />
            <input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className={fieldClass}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteOpen(false);
                  setDeletePassword("");
                  setDeleteConfirmText("");
                }}
                className="flex-1 rounded-xl bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-300 ring-1 ring-white/10 hover:bg-white/10"
              >
                {lang === "ru" ? "Отмена" : "Cancel"}
              </button>
              <button
                type="button"
                disabled={deleteConfirmText !== "DELETE" || deleting}
                onClick={() => void deleteAccount()}
                className="flex-1 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-500/20 hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {deleting
                  ? lang === "ru"
                    ? "Удаляю…"
                    : "Deleting…"
                  : lang === "ru"
                    ? "Удалить навсегда"
                    : "Delete forever"}
              </button>
            </div>
          </div>
        )}
      </SettingsCard>

      {/* Support */}
      <FadeItem>
        <TiltCard className="mp-card flex items-center justify-between gap-4 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{
                background: "rgba(var(--page-accent-rgb),0.15)",
                color: "var(--page-accent)",
                boxShadow: "inset 0 0 0 1px rgba(var(--page-accent-rgb),0.25)",
              }}
            >
              <MessageCircle className="h-5 w-5" strokeWidth={2.2} />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">{lang === "ru" ? "Остались вопросы?" : "Have questions?"}</p>
              <p className="text-xs text-slate-500">
                {lang === "ru" ? "Напиши напрямую в Telegram" : "Message us directly on Telegram"}
              </p>
            </div>
          </div>
          <a
            href="https://t.me/eQuvilCe"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold"
            style={{
              background: "rgba(var(--page-accent-rgb),0.15)",
              color: "var(--page-accent)",
              boxShadow: "inset 0 0 0 1px rgba(var(--page-accent-rgb),0.25)",
            }}
          >
            {lang === "ru" ? "Написать" : "Message"}
          </a>
        </TiltCard>
      </FadeItem>
    </PageShell>
  );
}
