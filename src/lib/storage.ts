"use client";

import {
  FinanceData,
  Transaction,
  Goal,
  Budget,
  Settings,
} from "./types";
import { emitDataChange, emitSessionExpired } from "./events";

const BASE_KEY = "money-pulse-v5-cache";

function storageKey(): string {
  // Local mirror only — source of truth is server + JWT cookie
  return BASE_KEY;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const defaultData: FinanceData = {
  transactions: [],
  goals: [],
  budgets: [],
  accounts: [],
  settings: {
    currency: "₽",
    savingsTargetPercent: 20,
    name: "Пользователь",
    notifications: true,
    theme: "dark",
    streak: 0,
    bestStreak: 0,
    lastLogDate: "",
    badges: [],
    customCategories: [],
  },
};


async function apiGet(): Promise<FinanceData | null> {
  try {
    const res = await fetch("/api/data", {
      cache: "no-store",
      credentials: "include",
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 401) emitSessionExpired();
    if (!res.ok) return null;
    return (await res.json()) as FinanceData;
  } catch {
    return null;
  }
}

async function apiPost(body: object): Promise<FinanceData | null> {
  try {
    const res = await fetch("/api/data", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 401) emitSessionExpired();
    if (!res.ok) return null;
    return (await res.json()) as FinanceData;
  } catch {
    return null;
  }
}

function localLoad(): FinanceData {
  if (typeof window === "undefined") return structuredClone(defaultData);
  try {
    const key = storageKey();
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(defaultData));
      return structuredClone(defaultData);
    }
    const parsed = JSON.parse(raw) as FinanceData;
    if (!parsed.budgets) parsed.budgets = defaultData.budgets;
    if (!parsed.settings) parsed.settings = defaultData.settings;
    if (parsed.settings.streak === undefined) parsed.settings.streak = 0;
    if (parsed.settings.badges === undefined) parsed.settings.badges = [];
    return parsed;
  } catch {
    return structuredClone(defaultData);
  }
}

function localSave(data: FinanceData, emit = true) {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(), JSON.stringify(data));
  if (emit) emitDataChange();
}

export async function loadDataAsync(): Promise<FinanceData> {
  // Instant UI from local cache, then refresh from server (stale-while-revalidate)
  const local = localLoad();
  const remote = await apiGet();
  if (remote) {
    localSave(remote, false); // silent — never trigger refresh loop
    return remote;
  }
  return local;
}

export function loadData(): FinanceData {
  return localLoad();
}

export function saveData(data: FinanceData) {
  localSave(data);
  void apiPost({ action: "replace", payload: data });
}

export async function addTransaction(tx: Omit<Transaction, "id">): Promise<Transaction> {
  const remote = await apiPost({ action: "add_transaction", payload: tx });
  if (remote) {
    localSave(remote);
    return remote.transactions[0];
  }
  const data = localLoad();
  const newTx: Transaction = { ...tx, id: crypto.randomUUID() };
  data.transactions.unshift(newTx);
  const today = new Date().toISOString().slice(0, 10);
  const last = data.settings.lastLogDate || "";
  const y = new Date(); y.setDate(y.getDate() - 1);
  const yKey = y.toISOString().slice(0, 10);
  if (last !== today) {
    data.settings.streak = last === yKey ? (data.settings.streak || 0) + 1 : 1;
    data.settings.lastLogDate = today;
    data.settings.bestStreak = Math.max(data.settings.bestStreak || 0, data.settings.streak || 0);
    const badges = new Set(data.settings.badges || []);
    if ((data.settings.streak || 0) >= 3) badges.add("streak_3");
    if ((data.settings.streak || 0) >= 7) badges.add("streak_7");
    if ((data.settings.streak || 0) >= 30) badges.add("streak_30");
    if (data.transactions.length >= 10) badges.add("ops_10");
    if (data.transactions.length >= 50) badges.add("ops_50");
    data.settings.badges = Array.from(badges);
  }
  localSave(data);
  return newTx;
}


export async function updateTransaction(id: string, updates: Partial<Transaction>) {
  const remote = await apiPost({ action: "update_transaction", id, payload: updates });
  if (remote) {
    localSave(remote);
    return;
  }
  const data = localLoad();
  data.transactions = data.transactions.map((tx) =>
    tx.id === id ? { ...tx, ...updates } : tx
  );
  localSave(data);
}

/** Create this-month copies of recurring txs if missing */
export function processRecurring(data: FinanceData): FinanceData {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const monthPrefix = `${y}-${String(m + 1).padStart(2, "0")}`;
  const templates = data.transactions.filter((t) => t.recurring);
  const existingKeys = new Set(
    data.transactions
      .filter((t) => t.date.startsWith(monthPrefix))
      .map((t) => `${t.type}|${t.category}|${t.amount}|${t.description}`)
  );
  let changed = false;
  for (const tpl of templates) {
    const day = Math.min(
      parseInt(tpl.date.slice(8, 10), 10) || 1,
      new Date(y, m + 1, 0).getDate()
    );
    const date = `${monthPrefix}-${String(day).padStart(2, "0")}`;
    const key = `${tpl.type}|${tpl.category}|${tpl.amount}|${tpl.description}`;
    // only auto-add if this month doesn't already have same signature
    const has = data.transactions.some(
      (t) =>
        t.date.startsWith(monthPrefix) &&
        t.type === tpl.type &&
        t.category === tpl.category &&
        t.amount === tpl.amount &&
        t.description === tpl.description
    );
    if (!has && tpl.date.slice(0, 7) !== monthPrefix) {
      data.transactions.unshift({
        ...tpl,
        id: crypto.randomUUID(),
        date,
        recurring: true,
      });
      changed = true;
    }
  }
  return data;
}

export async function deleteTransaction(id: string) {
  const remote = await apiPost({ action: "delete_transaction", id });
  if (remote) {
    localSave(remote);
    return;
  }
  const data = localLoad();
  data.transactions = data.transactions.filter((t) => t.id !== id);
  localSave(data);
}

export async function addGoal(goal: Omit<Goal, "id">): Promise<Goal> {
  const remote = await apiPost({ action: "add_goal", payload: goal });
  if (remote) {
    localSave(remote);
    return remote.goals[remote.goals.length - 1];
  }
  const data = localLoad();
  const g: Goal = { ...goal, id: crypto.randomUUID() };
  data.goals.push(g);
  localSave(data);
  return g;
}

export async function updateGoal(id: string, updates: Partial<Goal>) {
  const remote = await apiPost({ action: "update_goal", id, payload: updates });
  if (remote) {
    localSave(remote);
    return;
  }
  const data = localLoad();
  data.goals = data.goals.map((g) => (g.id === id ? { ...g, ...updates } : g));
  localSave(data);
}

export async function deleteGoal(id: string) {
  const remote = await apiPost({ action: "delete_goal", id });
  if (remote) {
    localSave(remote);
    return;
  }
  const data = localLoad();
  data.goals = data.goals.filter((g) => g.id !== id);
  localSave(data);
}

export async function addBudget(b: Omit<Budget, "id">): Promise<Budget> {
  const remote = await apiPost({ action: "add_budget", payload: b });
  if (remote) {
    localSave(remote);
    const found = remote.budgets.find((x) => x.category === b.category)!;
    return found;
  }
  const data = localLoad();
  const existing = data.budgets.find((x) => x.category === b.category);
  if (existing) {
    existing.limit = b.limit;
    existing.period = b.period;
    localSave(data);
    return existing;
  }
  const nb: Budget = { ...b, id: crypto.randomUUID() };
  data.budgets.push(nb);
  localSave(data);
  return nb;
}

export async function deleteBudget(id: string) {
  const remote = await apiPost({ action: "delete_budget", id });
  if (remote) {
    localSave(remote);
    return;
  }
  const data = localLoad();
  data.budgets = data.budgets.filter((b) => b.id !== id);
  localSave(data);
}

export async function updateSettings(updates: Partial<Settings>) {
  const remote = await apiPost({ action: "update_settings", payload: updates });
  if (remote) {
    localSave(remote);
    return;
  }
  const data = localLoad();
  data.settings = { ...data.settings, ...updates };
  localSave(data);
}

export async function resetToDemo() {
  const remote = await apiPost({ action: "reset" });
  if (remote) {
    localSave(remote);
    return;
  }
  localSave(structuredClone(defaultData));
}


export async function importTransactions(list: Omit<Transaction, "id">[]) {
  const remote = await apiPost({ action: "import_transactions", payload: list });
  if (remote) {
    localSave(remote);
    return remote;
  }
  const data = localLoad();
  for (const tx of list) {
    data.transactions.unshift({ ...tx, id: crypto.randomUUID() });
  }
  // streak
  const today = new Date().toISOString().slice(0, 10);
  const last = data.settings.lastLogDate || "";
  const y = new Date(); y.setDate(y.getDate() - 1);
  const yKey = y.toISOString().slice(0, 10);
  if (last !== today) {
    data.settings.streak = last === yKey ? (data.settings.streak || 0) + 1 : 1;
    data.settings.lastLogDate = today;
    data.settings.bestStreak = Math.max(data.settings.bestStreak || 0, data.settings.streak);
  }
  localSave(data);
  return data;
}

export function getStats(data: FinanceData, days?: number) {
  let txs = data.transactions;
  if (days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cut = cutoff.toISOString().slice(0, 10);
    txs = txs.filter((t) => t.date >= cut);
  }

  const income = txs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = txs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;
  const savingsRate = income > 0 ? Math.round((balance / income) * 100) : 0;

  const byCategory: Record<string, number> = {};
  txs.filter((t) => t.type === "expense").forEach((t) => {
    byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
  });

  const byIncomeCategory: Record<string, number> = {};
  txs.filter((t) => t.type === "income").forEach((t) => {
    byIncomeCategory[t.category] = (byIncomeCategory[t.category] || 0) + t.amount;
  });

  const dailyMap: Record<string, { income: number; expense: number }> = {};
  for (let i = 13; i >= 0; i--) {
    const d = daysAgo(i);
    dailyMap[d] = { income: 0, expense: 0 };
  }
  txs.forEach((t) => {
    if (dailyMap[t.date]) {
      if (t.type === "income") dailyMap[t.date].income += t.amount;
      else dailyMap[t.date].expense += t.amount;
    }
  });
  const dailySeries = Object.entries(dailyMap).map(([date, v]) => ({
    date: date.slice(5),
    income: v.income,
    expense: v.expense,
  }));

  return {
    income,
    expense,
    balance,
    savingsRate,
    byCategory,
    byIncomeCategory,
    dailySeries,
    txCount: txs.length,
  };
}

export function getBudgetStatus(data: FinanceData) {
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const monthTxs = data.transactions.filter((t) => t.type === "expense" && t.date >= monthStart);

  return data.budgets.map((b) => {
    const spent = monthTxs.filter((t) => t.category === b.category).reduce((s, t) => s + t.amount, 0);
    const percent = b.limit > 0 ? Math.round((spent / b.limit) * 100) : 0;
    return {
      ...b,
      spent,
      remaining: Math.max(0, b.limit - spent),
      percent,
      over: spent > b.limit,
    };
  });
}

export function exportJSON(data: FinanceData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `money-pulse-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCSV(data: FinanceData) {
  const header = "id,type,amount,category,description,date\n";
  const rows = data.transactions
    .map((t) => `${t.id},${t.type},${t.amount},"${t.category}","${t.description.replace(/"/g, '""')}",${t.date}`)
    .join("\n");
  const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
