"use client";

import { useState } from "react";
import { useRealtimeData } from "@/hooks/useRealtimeData";
import { PageShell, FadeItem } from "@/components/motion/PageShell";
import TiltCard from "@/components/motion/TiltCard";
import { Account, formatMoney } from "@/lib/types";
import { useToast } from "@/components/Toast";
import { useApp } from "@/components/AppProvider";

const EMOJI: Record<string, string> = {
  cash: "💵",
  bank: "🏦",
  card: "💳",
  savings: "📈",
  other: "◈",
};

const TYPE_KEYS = ["cash", "bank", "card", "savings", "other"] as const;

export default function AccountsPage() {
  const { data, refresh } = useRealtimeData(0);
  const toast = useToast();
  const { tr } = useApp();
  const [name, setName] = useState("");
  const [type, setType] = useState<Account["type"]>("card");
  const [balance, setBalance] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBal, setEditBal] = useState("");

  if (!data) return <div className="py-20 text-center text-slate-500">{tr("loading")}</div>;

  const accounts = data.accounts || [];
  const cur = data.settings.currency || "₽";
  const total = accounts.reduce((s, a) => s + a.balance, 0);

  const typeLabel = (t: Account["type"]) => {
    if (t === "cash") return tr("cash");
    if (t === "bank") return tr("bank");
    if (t === "card") return tr("card");
    if (t === "savings") return tr("savingsAcc");
    return tr("other");
  };

  const persist = async (next: Account[]) => {
    const payload = { ...data, accounts: next };
    await fetch("/api/data", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "replace", payload }),
    });
    refresh();
  };

  const save = async () => {
    const num = parseFloat(balance) || 0;
    if (!name.trim()) return;
    const next: Account = {
      id: crypto.randomUUID(),
      name: name.trim(),
      type,
      balance: num,
      emoji: EMOJI[type],
    };
    await persist([...accounts, next]);
    setName("");
    setBalance("");
    toast(tr("saved"));
  };

  const remove = async (id: string) => {
    await persist(accounts.filter((a) => a.id !== id));
  };

  const applyEdit = async (id: string) => {
    const num = parseFloat(editBal);
    if (Number.isNaN(num)) return;
    await persist(accounts.map((a) => (a.id === id ? { ...a, balance: num } : a)));
    setEditingId(null);
    toast(tr("saved"));
  };

  return (
    <PageShell>
      <FadeItem>
        <p className="text-xs font-medium uppercase tracking-widest text-emerald-400/80">MoneyPulse</p>
        <h1 className="mt-1 text-3xl font-bold">{tr("accounts")}</h1>
        <p className="mt-1 text-sm text-slate-400">{tr("accountsHint")}</p>
      </FadeItem>

      <FadeItem>
        <TiltCard className="mp-card rounded-2xl p-5">
          <p className="text-[11px] uppercase text-slate-500">{tr("total")}</p>
          <p className="mt-1 text-3xl font-bold tabular-nums">{formatMoney(total, cur)}</p>
          <p className="mt-1 text-xs text-slate-500">
            {accounts.length} · {tr("cash")} / {tr("card")} / {tr("bank")} / {tr("savingsAcc")}
          </p>
        </TiltCard>
      </FadeItem>

      <FadeItem className="space-y-2">
        {accounts.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">{tr("noAccounts")}</p>
        )}
        {accounts.map((a) => (
          <div key={a.id} className="mp-card rounded-2xl px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="text-xl">{a.emoji || EMOJI[a.type]}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{a.name}</p>
                  <p className="text-[11px] text-slate-500">{typeLabel(a.type)}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {editingId === a.id ? (
                  <>
                    <input
                      type="number"
                      value={editBal}
                      onChange={(e) => setEditBal(e.target.value)}
                      className="w-28 rounded-lg border border-emerald-500/30 bg-slate-900 px-2 py-1.5 text-sm tabular-nums"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => void applyEdit(a.id)}
                      className="rounded-lg bg-emerald-500 px-2.5 py-1.5 text-xs font-bold text-white"
                    >
                      OK
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="text-xs text-slate-500"
                    >
                      {tr("cancel")}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(a.id);
                        setEditBal(String(a.balance));
                      }}
                      className="text-sm font-bold tabular-nums text-white hover:text-emerald-300"
                      title={tr("updateBalance")}
                    >
                      {formatMoney(a.balance, cur)}
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(a.id)}
                      className="text-slate-600 hover:text-rose-400"
                      aria-label={tr("remove")}
                    >
                      ✕
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </FadeItem>

      <FadeItem className="mp-card space-y-3 rounded-2xl p-5">
        <h2 className="text-xs font-semibold uppercase text-slate-400">{tr("newAccount")}</h2>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={tr("accountName")}
          className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          {TYPE_KEYS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                type === t
                  ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30"
                  : "bg-white/5 text-slate-400 ring-1 ring-white/10"
              }`}
            >
              {EMOJI[t]} {typeLabel(t)}
            </button>
          ))}
        </div>
        <input
          type="number"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          placeholder={`${tr("balance")} ${cur}`}
          className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm"
        />
        <button
          type="button"
          onClick={() => void save()}
          className="w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white"
        >
          {tr("add")}
        </button>
      </FadeItem>
    </PageShell>
  );
}
