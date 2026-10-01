"use client";

import { useEffect, useState } from "react";
import { loadDataAsync, updateSettings, exportJSON, exportCSV } from "@/lib/storage";
import { FinanceData } from "@/lib/types";
import { PageShell, FadeItem } from "@/components/motion/PageShell";
import TiltCard from "@/components/motion/TiltCard";
import { useApp } from "@/components/AppProvider";
import { useToast } from "@/components/Toast";
import CsvImport from "@/components/CsvImport";
import StreakBadge from "@/components/StreakBadge";
import { User, Target, Palette, Tags, Bell, Database, ShieldCheck, type LucideIcon } from "lucide-react";

function SectionHeading({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10">
        <Icon className="h-3.5 w-3.5 text-emerald-400/80" strokeWidth={2.2} />
      </span>
      {children}
    </h2>
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

export default function SettingsPage() {
  const { tr, user, updateProfile, lang, setLang, logout, theme, setTheme } = useApp();
  const toast = useToast();
  const [data, setData] = useState<FinanceData | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [incomeGoal, setIncomeGoal] = useState("");
  const [savings, setSavings] = useState("20");
  const [currency, setCurrency] = useState("₽");
  const [newCat, setNewCat] = useState("");

  const refresh = () => loadDataAsync().then(setData);

  useEffect(() => {
    loadDataAsync().then((d) => {
      setData(d);
      setIncomeGoal(d.settings.monthlyIncomeGoal?.toString() || "");
      setSavings(String(d.settings.savingsTargetPercent));
      setCurrency(d.settings.currency || "₽");
    });
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  const saveAccount = async () => {
    setSavingProfile(true);
    const res = await updateProfile({ name, email });
    setSavingProfile(false);
    if (!res.ok) {
      toast(res.error || (lang === "ru" ? "Не удалось сохранить профиль" : "Could not save profile"), "err");
      return;
    }
    toast(tr("saved"));
  };

  const saveFinance = async () => {
    await updateSettings({
      monthlyIncomeGoal: incomeGoal ? parseFloat(incomeGoal) : undefined,
      savingsTargetPercent: parseInt(savings) || 20,
    });
    toast(tr("saved"));
    refresh();
  };

  if (!data) return <div className="py-20 text-center text-slate-500">{tr("loading")}</div>;

  const planLabel =
    lang === "ru"
      ? { free: "Бесплатный", pro: "Pro", demo: "Демо" }[user?.plan || "free"]
      : { free: "Free plan", pro: "Pro", demo: "Demo" }[user?.plan || "free"];

  return (
    <PageShell>
      <FadeItem>
        <p className="text-xs font-medium uppercase tracking-widest text-emerald-400/80">MoneyPulse</p>
        <h1 className="mt-1 text-3xl font-bold">{tr("settings")}</h1>
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
          <div className="border-b border-white/5 bg-gradient-to-r from-emerald-500/10 to-transparent px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-xl font-bold text-slate-950 shadow-lg shadow-emerald-500/20">
                {(user?.name || "U")[0].toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-white">{user?.name}</p>
                <p className="text-xs text-slate-500">{user?.email}</p>
                <span className="mt-1 inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-500/25">
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
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-2.5 text-sm outline-none focus:border-emerald-500/40"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  {tr("email")}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-2.5 text-sm outline-none focus:border-emerald-500/40"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => void saveAccount()}
              disabled={savingProfile}
              className="rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 disabled:opacity-60"
            >
              {savingProfile ? (lang === "ru" ? "Сохраняю…" : "Saving…") : tr("save")}
            </button>
          </div>
        </TiltCard>
      </FadeItem>

      {/* Finance */}
      <FadeItem className="mp-card space-y-4 rounded-2xl p-6">
        <SectionHeading icon={Target}>
          {lang === "ru" ? "Финансовые цели" : "Financial goals"}
        </SectionHeading>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-slate-500">
              {tr("incomeGoal")}
            </label>
            <input
              type="number"
              value={incomeGoal}
              onChange={(e) => setIncomeGoal(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-2.5 text-sm outline-none focus:border-emerald-500/40"
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
              className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-2.5 text-sm outline-none focus:border-emerald-500/40"
            />
          </div>
        </div>
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-slate-500">
            {tr("currency")}
          </p>
          <div className="flex flex-wrap gap-2">
            {CURRENCIES.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => {
                  setCurrency(c.code);
                  void updateSettings({ currency: c.code }).then(() => {
                    toast(`${tr("currency")}: ${c.label}`);
                    refresh();
                  });
                }}
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  currency === c.code
                    ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30"
                    : "bg-white/5 text-slate-400 ring-1 ring-white/10 hover:text-white"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => void saveFinance()}
          className="rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-400"
        >
          {tr("save")}
        </button>
      </FadeItem>

      {/* Appearance */}
      <FadeItem className="mp-card space-y-5 rounded-2xl p-6">
        <SectionHeading icon={Palette}>{tr("appearance")}</SectionHeading>

        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-slate-500">
            {tr("language")}
          </p>
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
                className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                  lang === l.id
                    ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30"
                    : "bg-white/5 text-slate-400 ring-1 ring-white/10 hover:text-white"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-slate-500">
            {tr("theme")}
          </p>
          <div className="flex gap-2">
            {(["dark", "light"] as const).map((th) => (
              <button
                key={th}
                type="button"
                onClick={() => {
                  setTheme(th);
                  void updateSettings({ theme: th });
                }}
                className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                  theme === th
                    ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30"
                    : "bg-white/5 text-slate-400 ring-1 ring-white/10 hover:text-white"
                }`}
              >
                {th === "dark" ? tr("dark") : tr("light")}
              </button>
            ))}
          </div>
        </div>
      </FadeItem>

      {/* Categories */}
      <FadeItem className="mp-card space-y-3 rounded-2xl p-6">
        <SectionHeading icon={Tags}>{tr("customCategories")}</SectionHeading>
        <p className="text-xs text-slate-500">
          {lang === "ru"
            ? "Например «Питомцы», «Спорт» — появятся в формах расходов"
            : "e.g. Pets, Sports — show up in expense forms"}
        </p>
        <div className="flex gap-2">
          <input
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            placeholder={tr("name")}
            className="flex-1 rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm outline-none focus:border-emerald-500/40"
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
      </FadeItem>

      {/* Notifications */}
      <FadeItem className="mp-card space-y-3 rounded-2xl p-6">
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
      </FadeItem>

      {/* Data */}
      <FadeItem className="mp-card space-y-4 rounded-2xl p-6">
        <SectionHeading icon={Database}>{tr("dataSection")}</SectionHeading>
        <CsvImport onDone={refresh} />
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-slate-500">
            {tr("export")}
          </p>
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
      </FadeItem>

      {/* Security + logout */}
      <FadeItem className="mp-card space-y-4 rounded-2xl p-6">
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
      </FadeItem>
    </PageShell>
  );
}
