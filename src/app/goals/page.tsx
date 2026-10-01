"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { loadDataAsync, addGoal, updateGoal, deleteGoal } from "@/lib/storage";
import { FinanceData, Goal, formatMoney } from "@/lib/types";
import { PageShell, FadeItem, Skeleton } from "@/components/motion/PageShell";
import TiltCard from "@/components/motion/TiltCard";
import { LetterReveal, MagneticButton } from "@/components/motion/Reveal";
import { useToast } from "@/components/Toast";
import AIInsightBar from "@/components/AIInsightBar";
import Confetti from "@/components/fx/Confetti";
import { useApp } from "@/components/AppProvider";

export default function GoalsPage() {
  const { tr, lang } = useApp();
  const [data, setData] = useState<FinanceData | null>(null);
  const [confettiFire, setConfettiFire] = useState(0);
  const [show, setShow] = useState(false);
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [emoji, setEmoji] = useState("🎯");
  const [deadline, setDeadline] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const toast = useToast();
  const refresh = () => loadDataAsync().then(setData);

  useEffect(() => {
    refresh();
  }, []);

  const cur = data?.settings.currency || "₽";

  const openEdit = (g: Goal) => {
    setEditId(g.id);
    setTitle(g.title);
    setTarget(String(g.targetAmount));
    setEmoji(g.emoji);
    setDeadline(g.deadline || "");
    setShow(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(target);
    if (!title.trim() || !num) return;
    if (editId) {
      await updateGoal(editId, {
        title: title.trim(),
        targetAmount: num,
        emoji,
        deadline: deadline || undefined,
      });
      toast(tr("goalUpdated"));
    } else {
      await addGoal({
        title: title.trim(),
        targetAmount: num,
        currentAmount: 0,
        emoji,
        deadline: deadline || undefined,
      });
      toast(tr("goalCreated"));
    }
    setShow(false);
    setEditId(null);
    setTitle("");
    setTarget("");
    setDeadline("");
    refresh();
  };

  const addTo = async (id: string, amount: number) => {
    const g = data?.goals.find((x) => x.id === id);
    if (!g) return;
    const next = Math.min(g.targetAmount, g.currentAmount + amount);
    await updateGoal(id, { currentAmount: next });
    if (next >= g.targetAmount && g.currentAmount < g.targetAmount) {
      toast(tr("goalAchieved", { title: g.title }));
      setConfettiFire((f) => f + 1);
    } else {
      toast(`+${formatMoney(amount, cur)} → ${g.title}`);
    }
    refresh();
  };

  if (!data) {
    return (
      <PageShell className="page-accent-violet">
        <FadeItem>
          <Skeleton className="h-16 w-full" />
        </FadeItem>
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell className="page-accent-violet">
      <Confetti fire={confettiFire} />
      <FadeItem>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--page-accent)" }}>
              MoneyPulse
            </p>
            <h1 className="mt-1 text-3xl font-bold">
              <LetterReveal text={tr("goalsHeroTitle")} />
            </h1>
            <p className="mt-1 text-sm text-slate-400">{tr("goalsHeroSubtitle")}</p>
          </div>
          <MagneticButton
            primary
            onClick={() => {
              setEditId(null);
              setTitle("");
              setTarget("");
              setDeadline("");
              setEmoji("🎯");
              setShow(!show);
            }}
          >
            {tr("addGoalButton")}
          </MagneticButton>
        </div>
      </FadeItem>
      <FadeItem>
        <AIInsightBar data={data} />
      </FadeItem>
      {show && (
        <FadeItem>
          <form onSubmit={handleSave} className="mp-card space-y-3 rounded-2xl p-5">
            <p className="text-sm font-medium">{editId ? tr("editGoal") : tr("newGoal")}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={tr("goalTitleLabel")}
                required
                className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm"
              />
              <input
                type="number"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder={tr("goalAmountLabel", { cur })}
                required
                min="1"
                className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm"
              />
              <input
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                placeholder={tr("emoji")}
                className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm"
              />
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white">
                {tr("save")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShow(false);
                  setEditId(null);
                }}
                className="rounded-xl bg-white/5 px-4 py-2.5 text-sm text-slate-400"
              >
                {tr("cancel")}
              </button>
            </div>
          </form>
        </FadeItem>
      )}
      {data.goals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center text-slate-500">
          {tr("noGoals")}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.goals.map((g, i) => {
            const progress = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));
            const left = g.targetAmount - g.currentAmount;
            return (
              <motion.div
                key={g.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
              <TiltCard className="mp-card rounded-2xl p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{g.emoji}</span>
                    <div>
                      <h3 className="font-semibold">{g.title}</h3>
                      {g.deadline && (
                        <p className="text-[11px] text-slate-500">
                          {tr("goalDeadlinePrefix")} {new Date(g.deadline).toLocaleDateString(lang === "en" ? "en-US" : "ru-RU")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(g)}
                      className="rounded-lg p-1 text-slate-500 hover:text-cyan-400"
                    >
                      ✎
                    </button>
                    <button
                      onClick={async () => {
                        await deleteGoal(g.id);
                        refresh();
                      }}
                      className="rounded-lg p-1 text-slate-600 hover:text-rose-400"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-sm">
                    <span style={{ color: "var(--page-accent)" }}>{formatMoney(g.currentAmount, cur)}</span>
                    <span className="text-slate-500">{formatMoney(g.targetAmount, cur)}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.9 }}
                      className="h-full rounded-full"
                      style={{ background: "linear-gradient(90deg, var(--page-accent), var(--page-accent-2))" }}
                    />
                  </div>
                  <p className="mt-1 text-right text-xs" style={{ color: "var(--page-accent)" }}>
                    {progress}%
                  </p>
                </div>
                {left > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {[1000, 5000, 10000, 25000].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => addTo(g.id, amt)}
                        className="rounded-lg px-2.5 py-1 text-[11px] transition hover:brightness-110"
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
                )}
                {progress >= 100 && (
                  <p className="mt-2 text-center text-sm text-emerald-400">{tr("doneCheckmark")}</p>
                )}
              </TiltCard>
              </motion.div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
