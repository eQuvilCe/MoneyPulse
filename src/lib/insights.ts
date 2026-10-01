import { FinanceData, formatMoney } from "./types";

function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(key: string, delta: number) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return monthKey(d);
}

export function periodRange(period: "this" | "last" | "3m" | "1y") {
  const now = new Date();
  const end = now.toISOString().slice(0, 10);
  if (period === "this") {
    return { start: monthKey() + "-01", end, label: "Этот месяц" };
  }
  if (period === "last") {
    const k = shiftMonth(monthKey(), -1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    return { start: k + "-01", end: `${k}-${lastDay}`, label: "Прошлый месяц" };
  }
  if (period === "3m") {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return { start: d.toISOString().slice(0, 10), end, label: "3 месяца" };
  }
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return { start: d.toISOString().slice(0, 10), end, label: "Год" };
}

export function statsInRange(data: FinanceData, start: string, end: string) {
  const txs = data.transactions.filter((t) => t.date >= start && t.date <= end);
  const income = txs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = txs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const byCategory: Record<string, number> = {};
  txs.filter((t) => t.type === "expense").forEach((t) => {
    byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
  });
  return {
    income,
    expense,
    balance: income - expense,
    savings: income - expense,
    byCategory,
    count: txs.length,
  };
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 6) return "Доброй ночи";
  if (h < 12) return "Доброе утро";
  if (h < 18) return "Добрый день";
  return "Добрый вечер";
}

export type SmartLine = { icon: string; text: string; tone: "warn" | "tip" | "goal" | "ok" };

/** Short executive summary for dashboard */
export function buildSmartSummary(data: FinanceData): {
  greeting: string;
  name: string;
  thisMonth: ReturnType<typeof statsInRange>;
  lastMonth: ReturnType<typeof statsInRange>;
  lines: SmartLine[];
  currency: string;
} {
  const cur = data.settings.currency || "₽";
  const thisR = periodRange("this");
  const lastR = periodRange("last");
  const thisMonth = statsInRange(data, thisR.start, thisR.end);
  const lastMonth = statsInRange(data, lastR.start, lastR.end);
  const lines: SmartLine[] = [];

  // category vs last month
  const cats = new Set([
    ...Object.keys(thisMonth.byCategory),
    ...Object.keys(lastMonth.byCategory),
  ]);
  let worst: { cat: string; pct: number } | null = null;
  for (const c of cats) {
    const a = thisMonth.byCategory[c] || 0;
    const b = lastMonth.byCategory[c] || 0;
    if (b > 0 && a > b) {
      const pct = Math.round(((a - b) / b) * 100);
      if (!worst || pct > worst.pct) worst = { cat: c, pct };
    }
  }
  if (worst && worst.pct >= 10) {
    lines.push({
      icon: "⚠️",
      text: `«${worst.cat}» на ${worst.pct}% выше, чем в прошлом месяце`,
      tone: "warn",
    });
  }

  // save opportunity: top category 15%
  const top = Object.entries(thisMonth.byCategory).sort((a, b) => b[1] - a[1])[0];
  if (top) {
    const save = Math.round(top[1] * 0.15);
    lines.push({
      icon: "💡",
      text: `Если срезать «${top[0]}» на 15% — ~${formatMoney(save, cur)} в этом месяце`,
      tone: "tip",
    });
  }

  // goals
  const g = data.goals[0];
  if (g) {
    const p = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));
    lines.push({
      icon: "🎯",
      text: `Цель «${g.title}»: ${p}% (${formatMoney(g.currentAmount, cur)} / ${formatMoney(g.targetAmount, cur)})`,
      tone: "goal",
    });
  }

  if (!lines.length) {
    lines.push({
      icon: "✅",
      text:
        thisMonth.count === 0
          ? "Пока нет данных за месяц — добавь первую операцию"
          : "Пока без критичных отклонений — так держать",
      tone: "ok",
    });
  }

  return {
    greeting: greeting(),
    name: data.settings.name || "друг",
    thisMonth,
    lastMonth,
    lines: lines.slice(0, 4),
    currency: cur,
  };
}

export function categoryComparison(data: FinanceData) {
  const thisR = periodRange("this");
  const lastR = periodRange("last");
  const a = statsInRange(data, thisR.start, thisR.end);
  const b = statsInRange(data, lastR.start, lastR.end);
  const cats = Array.from(
    new Set([...Object.keys(a.byCategory), ...Object.keys(b.byCategory)])
  );
  return cats
    .map((cat) => {
      const cur = a.byCategory[cat] || 0;
      const prev = b.byCategory[cat] || 0;
      let pct = 0;
      let dir: "up" | "down" | "flat" = "flat";
      if (prev === 0 && cur > 0) {
        pct = 100;
        dir = "up";
      } else if (prev > 0) {
        pct = Math.round(((cur - prev) / prev) * 100);
        dir = pct > 2 ? "up" : pct < -2 ? "down" : "flat";
      }
      return { cat, cur, prev, pct: Math.abs(pct), dir };
    })
    .filter((x) => x.cur > 0 || x.prev > 0)
    .sort((x, y) => y.cur - x.cur);
}

/** Recurring + category подписки */
export function getSubscriptions(data: FinanceData) {
  const map = new Map<string, { name: string; amount: number; category: string }>();
  for (const t of data.transactions) {
    if (t.type !== "expense") continue;
    if (!t.recurring && t.category !== "подписки") continue;
    const key = `${t.description}|${t.amount}|${t.category}`;
    if (!map.has(key)) {
      map.set(key, { name: t.description, amount: t.amount, category: t.category });
    }
  }
  const list = Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  const monthly = list.reduce((s, x) => s + x.amount, 0);
  return { list, monthly, yearly: monthly * 12 };
}

export type SmartAlert = {
  id: string;
  icon: string;
  title: string;
  body: string;
  tone: "warn" | "info" | "goal" | "streak";
};

export function buildSmartAlerts(data: FinanceData): SmartAlert[] {
  const alerts: SmartAlert[] = [];
  const thisR = periodRange("this");
  const lastR = periodRange("last");
  const thisM = statsInRange(data, thisR.start, thisR.end);
  const lastM = statsInRange(data, lastR.start, lastR.end);
  const cur = data.settings.currency || "₽";

  // budgets
  const monthStart = thisR.start;
  for (const b of data.budgets) {
    const spent = data.transactions
      .filter((t) => t.type === "expense" && t.category === b.category && t.date >= monthStart)
      .reduce((s, t) => s + t.amount, 0);
    const pct = b.limit > 0 ? Math.round((spent / b.limit) * 100) : 0;
    if (pct >= 80) {
      alerts.push({
        id: `b-${b.id}`,
        icon: "⚠️",
        title: "Budget Alert",
        body: `«${b.category}» — ${pct}% лимита (${formatMoney(spent, cur)} / ${formatMoney(b.limit, cur)})`,
        tone: "warn",
      });
    }
  }

  // spending spike
  for (const [cat, amt] of Object.entries(thisM.byCategory)) {
    const prev = lastM.byCategory[cat] || 0;
    if (prev > 0 && amt > prev * 1.35) {
      const pct = Math.round(((amt - prev) / prev) * 100);
      alerts.push({
        id: `s-${cat}`,
        icon: "📈",
        title: "Spending Alert",
        body: `«${cat}» на ${pct}% выше обычного`,
        tone: "warn",
      });
    }
  }

  // goals
  for (const g of data.goals) {
    const left = g.targetAmount - g.currentAmount;
    if (left > 0 && left <= g.targetAmount * 0.15) {
      alerts.push({
        id: `g-${g.id}`,
        icon: "🎯",
        title: "Goal Update",
        body: `До «${g.title}» осталось ${formatMoney(left, cur)}`,
        tone: "goal",
      });
    }
  }

  // streak
  const streak = data.settings.streak || 0;
  if (streak >= 3) {
    alerts.push({
      id: "streak",
      icon: "🔥",
      title: "Streak",
      body: `${streak} дн. подряд с записями`,
      tone: "streak",
    });
  }

  return alerts.slice(0, 6);
}

/** Full AI-style analysis package */
export function fullAnalysis(data: FinanceData) {
  const thisR = periodRange("this");
  const lastR = periodRange("last");
  const thisM = statsInRange(data, thisR.start, thisR.end);
  const lastM = statsInRange(data, lastR.start, lastR.end);
  const cur = data.settings.currency || "₽";
  const cmp = categoryComparison(data);

  const problems: string[] = [];
  if (thisM.balance < 0) {
    problems.push(`Месяц в минусе на ${formatMoney(Math.abs(thisM.balance), cur)}`);
  }
  for (const c of cmp.filter((x) => x.dir === "up").slice(0, 2)) {
    problems.push(`Рост «${c.cat}»: +${c.pct}% к прошлому месяцу`);
  }
  if (!problems.length) problems.push("Критических проблем не видно");

  const opportunities: string[] = [];
  for (const c of cmp.slice(0, 3)) {
    if (c.cur > 0) {
      const save = Math.round(c.cur * 0.2);
      opportunities.push(
        `«${c.cat}» ${formatMoney(c.cur, cur)} → −20% = +${formatMoney(save, cur)}/мес`
      );
    }
  }
  if (!opportunities.length) opportunities.push("Добавь расходы — найдём, где срезать");

  // unusual: days with expense > 2x average daily
  const byDay: Record<string, number> = {};
  data.transactions
    .filter((t) => t.type === "expense" && t.date >= thisR.start)
    .forEach((t) => {
      byDay[t.date] = (byDay[t.date] || 0) + t.amount;
    });
  const days = Object.values(byDay);
  const avg = days.length ? days.reduce((a, b) => a + b, 0) / days.length : 0;
  const unusual = Object.entries(byDay)
    .filter(([, v]) => avg > 0 && v > avg * 2)
    .map(([d, v]) => `${d}: ${formatMoney(v, cur)} (выше среднего дня)`)
    .slice(0, 3);

  const expDelta =
    lastM.expense > 0
      ? Math.round(((thisM.expense - lastM.expense) / lastM.expense) * 100)
      : 0;

  const dayOfMonth = new Date().getDate();
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const daily = dayOfMonth > 0 ? thisM.expense / dayOfMonth : 0;
  const projected = Math.round(thisM.expense + daily * (daysInMonth - dayOfMonth));

  const plan = [
    opportunities[0] ? `1. ${opportunities[0]}` : "1. Заведи бюджет на топ-категорию",
    "2. Включи recurring для аренды/подписок — не забудешь",
    data.goals.length
      ? `3. Отложи на «${data.goals[0].title}» сегодня`
      : "3. Создай первую цель накопления",
  ];

  return {
    problems: problems.slice(0, 3),
    opportunities: opportunities.slice(0, 3),
    unusual: unusual.length ? unusual : ["Необычных всплесков за месяц нет"],
    comparison: {
      thisExpense: thisM.expense,
      lastExpense: lastM.expense,
      deltaPct: expDelta,
      thisIncome: thisM.income,
      lastIncome: lastM.income,
    },
    forecast: projected,
    plan,
    categories: cmp.slice(0, 8),
    currency: cur,
  };
}
