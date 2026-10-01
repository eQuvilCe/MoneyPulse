"use client";

import { useCallback, useEffect, useState } from "react";
import { PageShell, FadeItem, Skeleton } from "@/components/motion/PageShell";
import TiltCard from "@/components/motion/TiltCard";
import { LetterReveal, MagneticButton } from "@/components/motion/Reveal";
import { useApp } from "@/components/AppProvider";
import { useToast } from "@/components/Toast";
import { useRealtimeData } from "@/hooks/useRealtimeData";
import { CATEGORY_ICONS, formatMoney } from "@/lib/types";
import type { FamilyMemberPublic, FamilyMemberStat, FamilyPublic, FamilyTransactionRow } from "@/lib/db";

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
  const { tr, user } = useApp();
  const toast = useToast();
  const { data } = useRealtimeData(0);
  const cur = data?.settings.currency || "₽";
  const [loading, setLoading] = useState(true);
  const [family, setFamily] = useState<FamilyPublic | null>(null);
  const [stats, setStats] = useState<FamilyMemberStat[]>([]);
  const [transactions, setTransactions] = useState<FamilyTransactionRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const load = useCallback(async () => {
    const res = await api<{ family: FamilyPublic | null; overview?: { stats: FamilyMemberStat[]; transactions: FamilyTransactionRow[] } }>(
      "/api/family"
    );
    if (res.ok && res.data) {
      setFamily(res.data.family);
      setStats(res.data.overview?.stats || []);
      setTransactions(res.data.overview?.transactions || []);
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

  return (
    <PageShell className="page-accent-emerald">
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
          <FadeItem className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: "🔑", text: tr("familyFeatureInvite") },
              { icon: "👀", text: tr("familyFeatureVisibility") },
              { icon: "📒", text: tr("familyFeatureFeed") },
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
                <div>
                  <h2 className="text-lg font-bold">{family.name}</h2>
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

          <FadeItem className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {family.members.map((m: FamilyMemberPublic) => {
              const stat = stats.find((s) => s.userId === m.userId);
              const isMe = user?.id === m.userId;
              return (
                <TiltCard key={m.id} className="mp-card rounded-2xl p-4">
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
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500">{tr("income")}</p>
                      <p className="font-display text-sm font-semibold tabular-nums text-emerald-400">
                        +{formatMoney(stat?.income || 0, cur)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500">{tr("expenses")}</p>
                      <p className="font-display text-sm font-semibold tabular-nums text-rose-400">
                        −{formatMoney(stat?.expense || 0, cur)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-600">{tr("familyThisMonth")}</p>
                </TiltCard>
              );
            })}
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
