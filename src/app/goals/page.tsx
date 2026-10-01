"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { loadDataAsync, addGoal, updateGoal, deleteGoal } from "@/lib/storage";
import { FinanceData, Goal, formatMoney } from "@/lib/types";
import { PageShell, FadeItem } from "@/components/motion/PageShell";
import TiltCard from "@/components/motion/TiltCard";
import { useToast } from "@/components/Toast";
import AIInsightBar from "@/components/AIInsightBar";

export default function GoalsPage() {
  const [data, setData] = useState<FinanceData | null>(null);
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
      toast("Цель обновлена");
    } else {
      await addGoal({
        title: title.trim(),
        targetAmount: num,
        currentAmount: 0,
        emoji,
        deadline: deadline || undefined,
      });
      toast("Цель создана");
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
      toast(`🎉 Цель «${g.title}» достигнута!`);
    } else {
      toast(`+${formatMoney(amount, cur)} → ${g.title}`);
    }
    refresh();
  };

  if (!data) return <div className="py-20 text-center text-slate-500">Загрузка...</div>;

  return (
    <PageShell>
      <FadeItem>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-emerald-400/80">MoneyPulse</p>
            <h1 className="mt-1 text-3xl font-bold">Цели</h1>
            <p className="mt-1 text-sm text-slate-400">Редактируй · копи · достигай</p>
          </div>
          <button
            onClick={() => {
              setEditId(null);
              setTitle("");
              setTarget("");
              setDeadline("");
              setEmoji("🎯");
              setShow(!show);
            }}
            className="rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2.5 text-sm font-semibold text-white"
          >
            + Цель
          </button>
        </div>
      </FadeItem>
      <FadeItem>
        <AIInsightBar data={data} />
      </FadeItem>
      {show && (
        <FadeItem>
          <form onSubmit={handleSave} className="mp-card space-y-3 rounded-2xl p-5">
            <p className="text-sm font-medium">{editId ? "Редактировать цель" : "Новая цель"}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Название"
                required
                className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm"
              />
              <input
                type="number"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder={`Сумма ${cur}`}
                required
                min="1"
                className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm"
              />
              <input
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                placeholder="Эмодзи"
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
                Сохранить
              </button>
              <button
                type="button"
                onClick={() => {
                  setShow(false);
                  setEditId(null);
                }}
                className="rounded-xl bg-white/5 px-4 py-2.5 text-sm text-slate-400"
              >
                Отмена
              </button>
            </div>
          </form>
        </FadeItem>
      )}
      {data.goals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center text-slate-500">
          Нет целей
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
                          до {new Date(g.deadline).toLocaleDateString("ru-RU")}
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
                    <span className="text-violet-300">{formatMoney(g.currentAmount, cur)}</span>
                    <span className="text-slate-500">{formatMoney(g.targetAmount, cur)}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.9 }}
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                    />
                  </div>
                  <p className="mt-1 text-right text-xs text-violet-400">{progress}%</p>
                </div>
                {left > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {[1000, 5000, 10000, 25000].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => addTo(g.id, amt)}
                        className="rounded-lg bg-violet-500/10 px-2.5 py-1 text-[11px] text-violet-300 ring-1 ring-violet-500/20 hover:bg-violet-500/20"
                      >
                        +{formatMoney(amt, cur)}
                      </button>
                    ))}
                  </div>
                )}
                {progress >= 100 && (
                  <p className="mt-2 text-center text-sm text-emerald-400">Готово ✓</p>
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
