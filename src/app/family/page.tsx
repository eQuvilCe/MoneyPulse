"use client";

import { useCallback, useEffect, useState } from "react";
import { PageShell, FadeItem, Skeleton } from "@/components/motion/PageShell";
import TiltCard from "@/components/motion/TiltCard";
import { LetterReveal, MagneticButton } from "@/components/motion/Reveal";
import { useApp } from "@/components/AppProvider";
import { useToast } from "@/components/Toast";
import { useRealtimeData } from "@/hooks/useRealtimeData";
import { CATEGORY_ICONS, formatMoney, formatMoneySmart, allExpenseCategories, MAX_AMOUNT, formatMoneyCompact, readAmount } from "@/lib/types";
import FitText from "@/components/FitText";
import type {
  FamilyMemberPublic,
  FamilyMemberStat,
  FamilyPublic,
  FamilyTransactionRow,
  FamilyBudgetPublic,
  FamilyGoalPublic,
  FamilyAlert,
} from "@/lib/db";
import Confetti from "@/components/fx/Confetti";
import FamilyChat from "@/components/FamilyChat";
import { emitCelebrate } from "@/lib/events";

const FAMILY_MAX_MEMBERS = 7;

async function api<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; data: T | null; error?: string }> {
  try {
    const res = await fetch(url, {
      credentials: "include",
      headers: init?.body ? { "Content-Type": "application/json" } : undefined,
      ...init,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, data: null, error: json.error || "Error" };
    return { ok: true, data: json };
  } catch {
    return { ok: false, data: null, error: "Network error" };
  }
}

export default function FamilyPage() {
  const { tr, user, lang } = useApp();
  const toast = useToast();
  const { data } = useRealtimeData(0);
  const cur = data?.settings.currency || "₽";
  const [loading, setLoading] = useState(true);
  const [family, setFamily] = useState<FamilyPublic | null>(null);
  const [stats, setStats] = useState<FamilyMemberStat[]>([]);
  const [transactions, setTransactions] = useState<FamilyTransactionRow[]>([]);
  const [familyBudgets, setFamilyBudgets] = useState<FamilyBudgetPublic[]>([]);
  const [familyGoals, setFamilyGoals] = useState<FamilyGoalPublic[]>([]);
  const [familyAlerts, setFamilyAlerts] = useState<FamilyAlert[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [confettiFire, setConfettiFire] = useState(0);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [budgetCat, setBudgetCat] = useState("еда");
  const [budgetLimit, setBudgetLimit] = useState("");

  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalEmoji, setGoalEmoji] = useState("🎯");

  const load = useCallback(async () => {
    const res = await api<{
      family: FamilyPublic | null;
      overview?: {
        stats: FamilyMemberStat[];
        transactions: FamilyTransactionRow[];
        familyBudgets: FamilyBudgetPublic[];
        familyGoals: FamilyGoalPublic[];
        familyAlerts: FamilyAlert[];
      };
    }>("/api/family");
    if (res.ok && res.data) {
      setFamily(res.data.family);
      setStats(res.data.overview?.stats || []);
      setTransactions(res.data.overview?.transactions || []);
      setFamilyBudgets(res.data.overview?.familyBudgets || []);
      setFamilyGoals(res.data.overview?.familyGoals || []);
      setFamilyAlerts(res.data.overview?.familyAlerts || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const create = async () => {
    if (busy) return;
    setBusy(true);
    const res = await api<{ family: FamilyPublic }>("/api/family/create", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    setBusy(false);
    if (!res.ok) return toast(res.error || "Error", "err");
    toast(tr("saved"));
    setName("");
    void load();
  };

  const join = async () => {
    if (busy || !code.trim()) return;
    setBusy(true);
    const res = await api<{ family: FamilyPublic }>("/api/family/join", {
      method: "POST",
      body: JSON.stringify({ code: code.trim() }),
    });
    setBusy(false);
    if (!res.ok) return toast(res.error || "Error", "err");
    toast(tr("saved"));
    setCode("");
    void load();
  };

  const leave = async () => {
    if (busy) return;
    setBusy(true);
    const res = await api("/api/family/leave", { method: "POST" });
    setBusy(false);
    setConfirmLeave(false);
    if (!res.ok) return toast(res.error || "Error", "err");
    toast(tr("saved"));
    setFamily(null);
    void load();
  };

  const removeMember = async (userId: string) => {
    if (busy) return;
    setBusy(true);
    const res = await api("/api/family/remove-member", {
      method: "POST",
      body: JSON.stringify({ userId }),
    });
    setBusy(false);
    setConfirmRemove(null);
    if (!res.ok) return toast(res.error || "Error", "err");
    toast(tr("saved"));
    void load();
  };

  const rotateCode = async () => {
    if (busy) return;
    setBusy(true);
    const res = await api<{ inviteCode: string }>("/api/family/rotate-code", { method: "POST" });
    setBusy(false);
    if (!res.ok) return toast(res.error || "Error", "err");
    toast(tr("saved"));
    void load();
  };

  const saveBudget = async () => {
    const num = readAmount(budgetLimit);
    if (num === "too-big") return toast(tr("amountTooBig", { max: formatMoneyCompact(MAX_AMOUNT, cur) }), "err");
    if (!num || busy) return;
    setBusy(true);
    const res = await api("/api/family/budget", {
      method: "POST",
      body: JSON.stringify({ category: budgetCat, limit: num, period: "month" }),
    });
    setBusy(false);
    if (!res.ok) return toast(res.error || "Error", "err");
    toast(tr("saved"));
    setBudgetLimit("");
    setShowBudgetForm(false);
    void load();
  };

  const removeBudget = async (id: string) => {
    if (busy) return;
    setBusy(true);
    const res = await api("/api/family/budget", { method: "DELETE", body: JSON.stringify({ id }) });
    setBusy(false);
    if (!res.ok) return toast(res.error || "Error", "err");
    void load();
  };

  const saveGoal = async () => {
    const num = readAmount(goalTarget);
    if (num === "too-big") return toast(tr("amountTooBig", { max: formatMoneyCompact(MAX_AMOUNT, cur) }), "err");
    if (!goalTitle.trim() || !num || busy) return;
    setBusy(true);
    const res = await api("/api/family/goal", {
      method: "POST",
      body: JSON.stringify({ title: goalTitle.trim(), targetAmount: num, emoji: goalEmoji }),
    });
    setBusy(false);
    if (!res.ok) return toast(res.error || "Error", "err");
    toast(tr("saved"));
    setGoalTitle("");
    setGoalTarget("");
    setGoalEmoji("🎯");
    setShowGoalForm(false);
    void load();
  };

  const contributeToGoal = async (g: FamilyGoalPublic, amount: number) => {
    if (busy) return;
    const next = Math.min(g.targetAmount, g.currentAmount + amount);
    setBusy(true);
    const res = await api("/api/family/goal", {
      method: "PATCH",
      body: JSON.stringify({ id: g.id, currentAmount: next }),
    });
    setBusy(false);
    if (!res.ok) return toast(res.error || "Error", "err");
    if (next >= g.targetAmount && g.currentAmount < g.targetAmount) {
      toast(tr("goalAchieved", { title: g.title }));
      setConfettiFire((f) => f + 1);
      emitCelebrate();
    } else {
      toast(`+${formatMoney(amount, cur)} → ${g.title}`);
    }
    void load();
  };

  const removeGoal = async (id: string) => {
    if (busy) return;
    setBusy(true);
    const res = await api("/api/family/goal", { method: "DELETE", body: JSON.stringify({ id }) });
    setBusy(false);
    if (!res.ok) return toast(res.error || "Error", "err");
    void load();
  };

  const copyCode = async () => {
    if (!family) return;
    try {
      await navigator.clipboard.writeText(family.inviteCode);
      toast(tr("familyCodeCopied"));
    } catch {
      toast(family.inviteCode);
    }
  };

  const isOwner = !!(family && user && family.ownerId === user.id);
  const expenseCats = allExpenseCategories(data?.settings);

  return (
    <PageShell className="page-accent-emerald">
      <Confetti fire={confettiFire} />
      <FadeItem>
        <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--page-accent)" }}>
          MoneyPulse
        </p>
        <h1 className="mt-1 text-3xl font-bold">
          <LetterReveal text={tr("family")} />
        </h1>
        <p className="mt-1 text-sm text-slate-400">{tr("familyHint")}</p>
      </FadeItem>

      {loading ? (
        <FadeItem className="space-y-3">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </FadeItem>
      ) : !family ? (
        <>
          <FadeItem className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: "🔑", text: tr("familyFeatureInvite") },
              { icon: "👀", text: tr("familyFeatureVisibility") },
              { icon: "📒", text: tr("familyFeatureFeed") },
              { icon: "💬", text: tr("familyFeatureChat") },
            ].map((f) => (
              <div
                key={f.text}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 ring-1 ring-white/10"
                style={{ background: "rgba(var(--page-accent-rgb), 0.06)" }}
              >
                <span className="text-xl">{f.icon}</span>
                <p className="text-xs text-slate-300">{f.text}</p>
              </div>
            ))}
          </FadeItem>

          <FadeItem className="grid gap-4 sm:grid-cols-2">
          <TiltCard className="mp-card rounded-2xl p-5">
            <div className="space-y-3">
              <h2 className="text-sm font-bold">{tr("familyCreateTitle")}</h2>
              <p className="text-xs text-slate-500">{tr("familyCreateHint")}</p>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={tr("familyNamePlaceholder")}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm"
              />
              <MagneticButton onClick={() => void create()} primary className="w-full">
                {tr("familyCreateBtn")}
              </MagneticButton>
            </div>
          </TiltCard>

          <TiltCard className="mp-card rounded-2xl p-5">
            <div className="space-y-3">
              <h2 className="text-sm font-bold">{tr("familyJoinTitle")}</h2>
              <p className="text-xs text-slate-500">{tr("familyJoinHint")}</p>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder={tr("familyCodePlaceholder")}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm uppercase tracking-widest"
                maxLength={8}
              />
              <MagneticButton onClick={() => void join()} className="w-full">
                {tr("familyJoinBtn")}
              </MagneticButton>
            </div>
          </TiltCard>
          </FadeItem>
        </>
      ) : (
        <>
          <FadeItem>
            <TiltCard className="mp-card rounded-2xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-bold">{family.name}</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {family.members.length}/{FAMILY_MAX_MEMBERS} · {tr("familyMembers").toLowerCase()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">{tr("familyInviteCode")}</p>
                    <p className="font-display text-lg font-bold tabular-nums tracking-[0.2em]" style={{ color: "var(--page-accent)" }}>
                      {family.inviteCode}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void copyCode()}
                    className="rounded-xl px-3 py-2 text-xs font-semibold ring-1 ring-white/10 transition hover:bg-white/5"
                    title={tr("familyCopyCode")}
                  >
                    ⧉
                  </button>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                {tr("familyInviteHint", { n: FAMILY_MAX_MEMBERS - family.members.length })}
              </p>
            </TiltCard>
          </FadeItem>

          {familyAlerts.length > 0 && (
            <FadeItem>
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-rose-300">
                  {tr("familyAlertsTitle")}
                </p>
                <ul className="space-y-1">
                  {familyAlerts.map((a) => (
                    <li key={a.category} className="text-sm text-rose-100">
                      {tr("familyAlertOverBy", {
                        category: a.category,
                        spent: formatMoney(a.spent, cur),
                        limit: formatMoney(a.limit, cur),
                        overBy: formatMoney(a.overBy, cur),
                      })}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeItem>
          )}

          <FadeItem className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {family.members.map((m: FamilyMemberPublic) => {
              const stat = stats.find((s) => s.userId === m.userId);
              const isMe = user?.id === m.userId;
              return (
                <TiltCard key={m.id} className="mp-card min-w-0 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                        style={{ background: "rgba(var(--page-accent-rgb), 0.18)", color: "var(--page-accent)" }}
                      >
                        {(m.name || "?").slice(0, 1).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {m.name} {isMe && <span className="text-slate-500">{tr("familyYou")}</span>}
                        </p>
                        <p className="text-[10px] uppercase tracking-wider text-slate-500">
                          {m.role === "owner" ? tr("familyOwner") : tr("familyMember")}
                        </p>
                      </div>
                    </div>
                    {isOwner && !isMe && (
                      <button
                        type="button"
                        onClick={() =>
                          confirmRemove === m.userId ? void removeMember(m.userId) : setConfirmRemove(m.userId)
                        }
                        className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-semibold ring-1 transition ${
                          confirmRemove === m.userId
                            ? "bg-rose-500/20 text-rose-300 ring-rose-500/30"
                            : "text-slate-500 ring-white/10 hover:text-rose-400"
                        }`}
                      >
                        {confirmRemove === m.userId ? tr("familyRemoveConfirm") : tr("familyRemoveMember")}
                      </button>
                    )}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-slate-500">{tr("income")}</p>
                      <p className="font-display text-sm font-semibold tabular-nums text-emerald-400">
                        <FitText title={formatMoney(stat?.income || 0, cur)}>
                          +{formatMoneySmart(stat?.income || 0, cur, lang === "en" ? "en" : "ru")}
                        </FitText>
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-slate-500">{tr("expenses")}</p>
                      <p className="font-display text-sm font-semibold tabular-nums text-rose-400">
                        <FitText title={formatMoney(stat?.expense || 0, cur)}>
                          −{formatMoneySmart(stat?.expense || 0, cur, lang === "en" ? "en" : "ru")}
                        </FitText>
                      </p>
                    </div>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-600">{tr("familyThisMonth")}</p>
                </TiltCard>
              );
            })}
          </FadeItem>

          <FadeItem>
            <FamilyChat isOwner={isOwner} />
          </FadeItem>

          <FadeItem>
            <TiltCard className="mp-card rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold">{tr("familyBudgetsTitle")}</h2>
                  <p className="mt-0.5 text-xs text-slate-500">{tr("familyBudgetsHint")}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBudgetForm((v) => !v)}
                  className="rounded-xl px-3 py-2 text-xs font-semibold ring-1 ring-white/10 hover:bg-white/5"
                >
                  {tr("familyAddBudgetBtn")}
                </button>
              </div>
              {showBudgetForm && (
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <select
                    value={budgetCat}
                    onChange={(e) => setBudgetCat(e.target.value)}
                    className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm"
                  >
                    {expenseCats.map((c) => (
                      <option key={c} value={c}>
                        {CATEGORY_ICONS[c] || "📦"} {c}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={budgetLimit}
                    onChange={(e) => setBudgetLimit(e.target.value)}
                    placeholder={tr("familyNewBudget")}
                    min="1"
                    className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => void saveBudget()}
                    className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
                    style={{ background: "linear-gradient(135deg, var(--page-accent), var(--page-accent-2))" }}
                  >
                    {tr("save")}
                  </button>
                </div>
              )}
              {familyBudgets.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">{tr("familyNoBudgets")}</p>
              ) : (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {familyBudgets.map((b) => {
                    const alert = familyAlerts.find((a) => a.category === b.category);
                    return (
                      <div
                        key={b.id}
                        className={`flex items-center justify-between rounded-xl px-3 py-2.5 ring-1 ${
                          alert ? "ring-rose-500/30 bg-rose-500/5" : "ring-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{CATEGORY_ICONS[b.category] || "📦"}</span>
                          <div>
                            <p className="text-sm font-medium capitalize">{b.category}</p>
                            <p className="text-[11px] text-slate-500">
                              {formatMoney(alert?.spent ?? 0, cur)} / {formatMoney(b.limit, cur)}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => void removeBudget(b.id)}
                          className="rounded-lg p-1 text-slate-600 hover:text-rose-400"
                          aria-label={tr("remove")}
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </TiltCard>
          </FadeItem>

          <FadeItem>
            <TiltCard className="mp-card rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold">{tr("familyGoalsTitle")}</h2>
                  <p className="mt-0.5 text-xs text-slate-500">{tr("familyGoalsHint")}</p>
                </div>
                <MagneticButton onClick={() => setShowGoalForm((v) => !v)} primary>
                  {tr("familyAddGoalBtn")}
                </MagneticButton>
              </div>
              {showGoalForm && (
                <div className="mt-3 grid gap-2 sm:grid-cols-4">
                  <input
                    value={goalTitle}
                    onChange={(e) => setGoalTitle(e.target.value)}
                    placeholder={tr("goalTitleLabel")}
                    className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm sm:col-span-2"
                  />
                  <input
                    type="number"
                    value={goalTarget}
                    onChange={(e) => setGoalTarget(e.target.value)}
                    placeholder={tr("goalAmountLabel", { cur })}
                    min="1"
                    className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm"
                  />
                  <input
                    value={goalEmoji}
                    onChange={(e) => setGoalEmoji(e.target.value)}
                    placeholder={tr("emoji")}
                    className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => void saveGoal()}
                    className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white sm:col-span-4"
                    style={{ background: "linear-gradient(135deg, var(--page-accent), var(--page-accent-2))" }}
                  >
                    {tr("save")}
                  </button>
                </div>
              )}
              {familyGoals.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">{tr("familyNoGoals")}</p>
              ) : (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {familyGoals.map((g) => {
                    const progress = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));
                    const left = g.targetAmount - g.currentAmount;
                    const creator = family.members.find((m) => m.userId === g.createdBy)?.name;
                    return (
                      <div key={g.id} className="rounded-xl p-3 ring-1 ring-white/10">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{g.emoji}</span>
                            <div>
                              <p className="text-sm font-semibold">{g.title}</p>
                              {creator && (
                                <p className="text-[10px] text-slate-500">
                                  {tr("familyCreatedBy")} {creator}
                                </p>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => void removeGoal(g.id)}
                            className="rounded-lg p-1 text-slate-600 hover:text-rose-400"
                            aria-label={tr("remove")}
                          >
                            ✕
                          </button>
                        </div>
                        <div className="mt-2.5">
                          <div className="mb-1 flex justify-between text-xs">
                            <span style={{ color: "var(--page-accent)" }}>{formatMoney(g.currentAmount, cur)}</span>
                            <span className="text-slate-500">{formatMoney(g.targetAmount, cur)}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                            <div
                              className="h-full rounded-full transition-[width] duration-500"
                              style={{
                                width: `${progress}%`,
                                background: "linear-gradient(90deg, var(--page-accent), var(--page-accent-2))",
                              }}
                            />
                          </div>
                        </div>
                        {left > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {[1000, 5000, 10000].map((amt) => (
                              <button
                                key={amt}
                                type="button"
                                onClick={() => void contributeToGoal(g, amt)}
                                className="rounded-lg px-2 py-1 text-[11px] transition hover:brightness-110"
                                style={{
                                  background: "rgba(var(--page-accent-rgb),0.1)",
                                  color: "var(--page-accent)",
                                  boxShadow: "inset 0 0 0 1px rgba(var(--page-accent-rgb),0.2)",
                                }}
                              >
                                +{formatMoney(amt, cur)}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-center text-xs text-emerald-400">{tr("doneCheckmark")}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </TiltCard>
          </FadeItem>

          <FadeItem>
            <TiltCard className="mp-card rounded-2xl p-5">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                {tr("familyFeed")}
              </h2>
              {transactions.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">{tr("familyNoTx")}</p>
              ) : (
                <div className="space-y-1">
                  {transactions.slice(0, 40).map((t: FamilyTransactionRow) => (
                    <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 text-sm hover:bg-white/[0.03]">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="text-lg">{CATEGORY_ICONS[t.category] || "📦"}</span>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{t.description || t.category}</p>
                          <p className="truncate text-[11px] text-slate-500">
                            {t.memberName} · {t.date}
                          </p>
                        </div>
                      </div>
                      <p
                        className={`shrink-0 font-display text-sm font-semibold tabular-nums ${
                          t.type === "income" ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {t.type === "income" ? "+" : "−"}
                        {formatMoney(t.amount, cur)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </TiltCard>
          </FadeItem>

          <FadeItem>
            <TiltCard className="mp-card rounded-2xl border border-rose-500/10 p-5">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-rose-400/80">
                {tr("familyDangerZone")}
              </h2>
              <div className="space-y-3">
                {isOwner && (
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{tr("familyRotateCode")}</p>
                      <p className="text-xs text-slate-500">{tr("familyRotateHint")}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void rotateCode()}
                      className="shrink-0 rounded-xl px-3 py-2 text-xs font-semibold ring-1 ring-white/10 hover:bg-white/5"
                    >
                      {tr("familyRotateCode")}
                    </button>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{tr("familyLeave")}</p>
                  <button
                    type="button"
                    onClick={() => (confirmLeave ? void leave() : setConfirmLeave(true))}
                    className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold ring-1 transition ${
                      confirmLeave
                        ? "bg-rose-500/20 text-rose-300 ring-rose-500/30"
                        : "text-slate-400 ring-white/10 hover:text-rose-400"
                    }`}
                  >
                    {confirmLeave ? tr("familyLeaveConfirm") : tr("familyLeave")}
                  </button>
                </div>
              </div>
            </TiltCard>
          </FadeItem>
        </>
      )}
    </PageShell>
  );
}
