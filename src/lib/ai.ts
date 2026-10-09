import { formatNumber, dateKey } from "./types";
import { formatMoney, allExpenseCategories, allIncomeCategories } from "./types";
import { FinanceData } from "./types";

export interface AIAdvice {
  id: string;
  title: string;
  message: string;
  type: "positive" | "warning" | "tip" | "critical" | "insight";
  icon: string;
  action?: string;
  priority: number;
  /** Human explanation of the data behind the advice */
  why?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

export interface DailyBriefing {
  health: number;
  headline: string;
  lines: string[];
  focus: string;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dateKey(d);
}

function todayKey() {
  return dateKey();
}

function calcStats(data: FinanceData, days?: number) {
  let txs = data.transactions;
  if (days) {
    const cut = daysAgo(days);
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
  return { income, expense, balance, savingsRate, byCategory, txCount: txs.length, txs };
}

function budgetStatus(data: FinanceData) {
  const monthStart = daysAgo(30);
  const monthTxs = data.transactions.filter((t) => t.type === "expense" && t.date >= monthStart);
  return data.budgets.map((b) => {
    const spent = monthTxs.filter((t) => t.category === b.category).reduce((s, t) => s + t.amount, 0);
    const percent = b.limit > 0 ? Math.round((spent / b.limit) * 100) : 0;
    return { ...b, spent, remaining: Math.max(0, b.limit - spent), percent, over: spent > b.limit };
  });
}

function topCategories(byCategory: Record<string, number>, n = 3) {
  return Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, n);
}

/** Breakdown of the money pulse (0–100). Transparent so users understand the number. */
export function getHealthBreakdown(data: FinanceData) {
  const stats = calcStats(data);
  const budgets = budgetStatus(data);
  const target = data.settings?.savingsTargetPercent ?? 20;

  // Balance: 0–30
  let balancePts = 0;
  if (stats.balance < 0) balancePts = Math.max(0, 10 + Math.min(0, stats.savingsRate));
  else if (stats.income <= 0) balancePts = 15;
  else balancePts = 20 + Math.min(10, Math.round((stats.balance / Math.max(stats.expense, 1)) * 5));

  // Savings rate vs target: 0–30
  let savingsPts = 0;
  if (stats.income > 0) {
    const ratio = Math.min(1.5, stats.savingsRate / Math.max(target, 1));
    savingsPts = Math.round(Math.min(30, ratio * 20));
  }

  // Budgets: 0–20 (if none set, give neutral 10 so score isn't stuck low)
  let budgetPts = 10;
  if (budgets.length > 0) {
    const ok = budgets.filter((b) => !b.over).length;
    budgetPts = Math.round((ok / budgets.length) * 20);
  }

  // Goals progress: 0–15
  let goalPts = 0;
  if (data.goals.length > 0) {
    const avg = data.goals.reduce((s, g) => {
      const p = g.targetAmount > 0 ? g.currentAmount / g.targetAmount : 0;
      return s + Math.min(1, Math.max(0, p));
    }, 0) / data.goals.length;
    goalPts = Math.round(avg * 15);
  } else {
    goalPts = 5; // neutral if no goals yet
  }

  // Logging streak: 0–5
  const streak = data.settings?.streak || 0;
  const streakPts = Math.min(5, streak >= 7 ? 5 : streak >= 3 ? 3 : streak >= 1 ? 1 : 0);

  const total = Math.min(100, Math.max(5, balancePts + savingsPts + budgetPts + goalPts + streakPts));
  return {
    total: Math.round(total),
    parts: {
      balance: balancePts,
      savings: savingsPts,
      budgets: budgetPts,
      goals: goalPts,
      streak: streakPts,
    },
  };
}

export function getHealthScore(data: FinanceData): number {
  return getHealthBreakdown(data).total;
}

export function generateAIAnalysis(data: FinanceData): AIAdvice[] {
  const C = data.settings?.currency || "₽";
  const m = (n: number) => formatMoney(n, C);

  const stats = calcStats(data);
  const stats7 = calcStats(data, 7);
  const budgets = budgetStatus(data);
  const advices: AIAdvice[] = [];
  let n = 0;
  const add = (a: Omit<AIAdvice, "id">) => advices.push({ ...a, id: String(++n) });

  if (stats.balance < 0) {
    add({
      title: "Критический минус",
      message: `Расходы выше доходов на ${m(Math.abs(stats.balance))}. Сократи топ-категорию на 20%.`,
      type: "critical", icon: "🚨", priority: 100,
    });
  } else if (stats.balance < 15000) {
    add({
      title: "Тонкий запас",
      message: `Баланс ${m(stats.balance)}. Цель — подушка на 1–2 месяца расходов.`,
      type: "warning", icon: "⚠️", priority: 80,
    });
  }

  if (stats.savingsRate >= 25) {
    add({
      title: "Сильные сбережения",
      message: `${stats.savingsRate}% дохода остаётся. Можно часть направить в инвестиции.`,
      type: "positive", icon: "🏆", priority: 40,
    });
  } else if (stats.income > 0 && stats.savingsRate < data.settings.savingsTargetPercent) {
    const need = Math.round(stats.income * ((data.settings.savingsTargetPercent - stats.savingsRate) / 100));
    add({
      title: "Сбережения ниже цели",
      message: `${stats.savingsRate}% при цели ${data.settings.savingsTargetPercent}%. Нужно ещё ~${m(need)}/мес.`,
      type: "tip", icon: "💡", priority: 70,
    });
  }

  const sorted = topCategories(stats.byCategory, 1);
  if (sorted[0]) {
    const [topCat, topAmt] = sorted[0];
    const pct = stats.expense > 0 ? Math.round((topAmt / stats.expense) * 100) : 0;
    if (pct >= 30) {
      add({
        title: `«${topCat}» — ${pct}% расходов`,
        message: `${m(topAmt)}. −15% = +${m(Math.round(topAmt * 0.15))} к балансу.`,
        type: pct >= 40 ? "warning" : "insight", icon: "📊", priority: 65,
      });
    }
  }

  if (stats7.expense > 0 && stats.expense > 0) {
    const weekPace = stats7.expense * 4;
    if (weekPace > stats.expense * 1.3) {
      add({
        title: "Траты ускорились",
        message: `За 7 дней ${m(stats7.expense)}. Темп месяца ~${m(Math.round(weekPace))}.`,
        type: "warning", icon: "⏱️", priority: 75,
      });
    }
  }

  budgets.forEach((b) => {
    if (b.over) {
      add({
        title: `Бюджет «${b.category}» превышен`,
        message: `${m(b.spent)} из ${m(b.limit)} (${b.percent}%).`,
        type: "critical", icon: "🔴", priority: 95,
      });
    } else if (b.percent >= 85) {
      add({
        title: `«${b.category}» почти на лимите`,
        message: `${b.percent}%. Осталось ${m(b.remaining)}.`,
        type: "warning", icon: "🟡", priority: 60,
      });
    }
  });

  data.goals.forEach((g) => {
    const progress = Math.round((g.currentAmount / g.targetAmount) * 100);
    if (progress >= 90) {
      add({ title: `«${g.title}» почти готова`, message: `${progress}% ${g.emoji}`, type: "positive", icon: "🎯", priority: 30 });
    } else if (g.deadline && progress < 40) {
      const days = Math.ceil((new Date(g.deadline).getTime() - Date.now()) / 86400000);
      if (days > 0 && days < 150) {
        const need = Math.ceil((g.targetAmount - g.currentAmount) / Math.max(1, Math.ceil(days / 30)));
        add({
          title: `Цель «${g.title}» отстаёт`,
          message: `${progress}%, ~${days} дн. Нужно ~${m(need)}/мес.`,
          type: "warning", icon: "⏳", priority: 55,
        });
      }
    }
  });

  if (data.transactions.length < 5) {
    add({ title: "Мало данных", message: "Добавь операции — советы станут точнее.", type: "tip", icon: "📝", priority: 20 });
  }

  if (!advices.length) {
    add({
      title: "Всё под контролем",
      message: `Пульс ~${getHealthScore(data)}/100. MoneyPulse на связи.`,
      type: "positive", icon: "💚", priority: 10,
    });
  }

  const tx30 = data.transactions.filter((t) => t.date >= daysAgo(30));
  const exp30 = tx30.filter((t) => t.type === "expense");
  for (const a of advices) {
    if (a.why) continue;
    a.why = [
      `Основано на ${data.transactions.length} операциях (из них ${exp30.length} расходов за 30 дней).`,
      `Доход: ${formatNumber(stats.income)}, расход: ${formatNumber(stats.expense)}, баланс: ${formatNumber(stats.balance)}.`,
      stats.byCategory && Object.keys(stats.byCategory).length
        ? `Категории расходов: ${Object.entries(stats.byCategory)
            .sort((x, y) => y[1] - x[1])
            .slice(0, 3)
            .map(([c, v]) => `${c} ${formatNumber(v)}`)
            .join("; ")}.`
        : "Категорий расходов пока нет.",
      budgets.length
        ? `Бюджеты: ${budgets.map((b) => `${b.category} ${b.percent}%`).join(", ")}.`
        : "Бюджеты не заданы.",
    ].join(" ");
  }
  return advices.sort((a, b) => b.priority - a.priority).slice(0, 8);
}

export function getDoctorGreeting(data: FinanceData): string {
  const C = data.settings?.currency || "₽";
  const m = (n: number) => formatMoney(n, C);
  const stats = calcStats(data);
  const health = getHealthScore(data);
  const name = data.settings.name && data.settings.name !== "Пользователь" ? data.settings.name : "друг";
  if (stats.balance < 0)
    return `${name}, пульс ${health}/100 — в минусе на ${m(Math.abs(stats.balance))}. Спроси «совет» или «топ расходов» — разберём.`;
  if (stats.savingsRate >= 20)
    return `${name}, сильный ритм! Пульс ${health}/100, сбережения ${stats.savingsRate}%. Могу дать полный отчёт или прогноз.`;
  if (stats.txCount === 0)
    return `Привет, ${name}! Я AI MoneyPulse. Добавь первую операцию на Пульсе или вставь SMS в Банках — я сразу в теме.`;
  return `Привет, ${name}! Пульс ${health}/100 · баланс ${m(stats.balance)}. Спроси: «отчёт», «сегодня», «прогноз», «совет».`;
}

/** Full daily briefing for WOW modal */
export function generateDailyBriefing(data: FinanceData): DailyBriefing {
  const C = data.settings?.currency || "₽";
  const m = (n: number) => formatMoney(n, C);
  const stats = calcStats(data);
  const s7 = calcStats(data, 7);
  const today = todayKey();
  const dayTx = data.transactions.filter((t) => t.date === today);
  const dayEx = dayTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const dayIn = dayTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const health = getHealthScore(data);
  const budgets = budgetStatus(data);
  const over = budgets.filter((b) => b.over);
  const top = topCategories(stats.byCategory, 1)[0];
  const advice = generateAIAnalysis(data)[0];

  let headline = "День под контролем";
  if (health < 40) headline = "Нужно внимание к финансам";
  else if (health >= 75) headline = "Сильный финансовый пульс";

  const lines: string[] = [
    `Баланс ${m(stats.balance)} · сбережения ${stats.savingsRate}%`,
    dayTx.length
      ? `Сегодня: +${formatNumber(dayIn)} / −${m(dayEx)} (${dayTx.length} опер.)`
      : "Сегодня записей пока нет — самое время добавить первую",
    `Неделя: доход +${formatNumber(s7.income)} · расход −${m(s7.expense)}`,
  ];
  if (top) lines.push(`Топ-трата: «${top[0]}» — ${m(top[1])}`);
  if (over.length) lines.push(`⚠ Превышены бюджеты: ${over.map((b) => b.category).join(", ")}`);
  if (data.goals.length) {
    const g = data.goals[0];
    const p = Math.round((g.currentAmount / g.targetAmount) * 100);
    lines.push(`Цель «${g.title}»: ${p}%`);
  }

  return {
    health,
    headline,
    lines,
    focus: advice ? `${advice.title}: ${advice.message}` : "Продолжай вести учёт.",
  };
}

export function answerAIChat(question: string, data: FinanceData): string {
  const C = data.settings?.currency || "₽";
  const m = (n: number) => formatMoney(n, C);
  const q = question.toLowerCase().trim();
  const stats = calcStats(data);
  const stats7 = calcStats(data, 7);
  const stats30 = calcStats(data, 30);
  const budgets = budgetStatus(data);
  const sorted = topCategories(stats.byCategory, 5);
  const today = todayKey();
  const dayTx = data.transactions.filter((t) => t.date === today);

  // full report
  if (/отчёт|отчет|сводка|брифинг|обзор|всё сразу|все сразу|full|report|status/.test(q)) {
    const b = generateDailyBriefing(data);
    return `📋 ${b.headline} (${b.health}/100)\n\n${b.lines.join("\n")}\n\n→ ${b.focus}`;
  }

  if (/сегодня|today|за день|дневн/.test(q)) {
    const dayIn = dayTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const dayEx = dayTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    if (!dayTx.length) return "Сегодня пока пусто. Добавь доход или расход на дашборде — я сразу учту.";
    const lines = dayTx
      .slice(0, 8)
      .map((t) => `• ${t.type === "income" ? "+" : "−"}${m(t.amount)} · ${t.category} · ${t.description}`)
      .join("\n");
    return `Сегодня:\n• Доход +${m(dayIn)}\n• Расход −${m(dayEx)}\n• Итого ${m((dayIn - dayEx))}\n\n${lines}`;
  }

  if (/баланс|остат|сколько.*остал|на счету/.test(q)) {
    return `Баланс: ${m(stats.balance)}\n• Доходы: +${m(stats.income)}\n• Расходы: −${m(stats.expense)}\n• Сбережения: ${stats.savingsRate}%\n• Операций: ${stats.txCount}`;
  }

  if (/прогноз|хватит|до конца месяца|forecast|когда кончат/.test(q)) {
    const dayOfMonth = new Date().getDate();
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const dailyBurn = dayOfMonth > 0 ? stats30.expense / Math.max(1, dayOfMonth) : 0;
    const left = daysInMonth - dayOfMonth;
    const projected = Math.round(stats30.expense + dailyBurn * left);
    const projBal = stats30.income - projected;
    return `Прогноз до конца месяца:\n• Сейчас расходов: ${m(stats30.expense)}\n• Средний темп: ~${m(Math.round(dailyBurn))}/день\n• Прогноз расходов: ~${m(projected)}\n• Прогноз баланса: ~${m(projBal)}\n${projBal < 0 ? "⚠ При текущем темпе уйдёшь в минус." : "Темп терпимый, но следи за топ-категориями."}`;
  }

  if (/самая больш|крупн|дорог.*(операц|покупк)|максимальн/.test(q)) {
    const list = data.transactions.filter((t) => t.type === "expense");
    if (!list.length) return "Расходов пока нет.";
    const biggest = [...list].sort((a, b) => b.amount - a.amount)[0];
    return `Самый крупный расход: ${m(biggest.amount)} · ${biggest.category} · «${biggest.description}» (${biggest.date})`;
  }

  if (/средн.*чек|средн.*сумм|средн.*операц|средн.*расход/.test(q)) {
    const list = data.transactions.filter((t) => t.type === "expense");
    if (!list.length) return "Расходов пока нет.";
    const avg = list.reduce((s, t) => s + t.amount, 0) / list.length;
    return `Средний чек: ${m(Math.round(avg))} (по ${list.length} операциям).`;
  }

  if (/последн|недавн|истори|список|транзак|операц/.test(q)) {
    const list = data.transactions.slice(0, 8);
    if (!list.length) return "Операций пока нет.";
    return (
      "Последние операции:\n" +
      list
        .map(
          (t) =>
            `• ${t.date} ${t.type === "income" ? "+" : "−"}${m(t.amount)} · ${t.category} · ${t.description}`
        )
        .join("\n")
    );
  }

  if (/сравн|недел.*месяц|месяц.*недел/.test(q)) {
    return `Сравнение:\n• 7 дней: +${formatNumber(stats7.income)} / −${formatNumber(stats7.expense)} (баланс ${formatNumber(stats7.balance)})\n• 30 дней: +${formatNumber(stats30.income)} / −${formatNumber(stats30.expense)} (баланс ${formatNumber(stats30.balance)})\n• Всё время: +${formatNumber(stats.income)} / −${formatNumber(stats.expense)}`;
  }

  if (/сбереж|отклад|копить|накоп/.test(q)) {
    const gap = data.settings.savingsTargetPercent - stats.savingsRate;
    return `Сбережения: ${stats.savingsRate}% (цель ${data.settings.savingsTargetPercent}%).\n${
      gap > 0
        ? `Не хватает ~${gap} п.п. ≈ ${m(Math.round((stats.income * gap) / 100))} при текущем доходе.`
        : "Ты на цели или выше 💚"
    }`;
  }

  if (/бюджет|лимит/.test(q)) {
    if (!budgets.length) return "Бюджеты не заданы. Создай лимиты во вкладке «Бюджеты».";
    return (
      "Бюджеты:\n" +
      budgets
        .map((b) => {
          const flag = b.over ? "🔴" : b.percent >= 85 ? "🟡" : "🟢";
          return `${flag} ${b.category}: ${formatNumber(b.spent)}/${m(b.limit)} (${b.percent}%)`;
        })
        .join("\n")
    );
  }

  if (/еда|продукт|ресторан|доставк|кофе/.test(q)) {
    const food = stats.byCategory["еда"] || 0;
    return `Еда: ${m(food)}.\n${
      food > 15000 ? "Выше комфорта. План меню + меньше доставки ≈ −20–30%." : "Уровень нормальный."
    }`;
  }

  if (/развлеч|досуг|кино|бар/.test(q)) {
    const fun = stats.byCategory["развлечения"] || 0;
    const pct = stats.expense > 0 ? Math.round((fun / stats.expense) * 100) : 0;
    return `Развлечения: ${m(fun)} (${pct}% расходов).`;
  }

  if (/транспорт|такси|метро|бензин/.test(q)) {
    const v = stats.byCategory["транспорт"] || 0;
    return `Транспорт: ${m(v)}.`;
  }

  if (/подписк|netflix|spotify/.test(q)) {
    const v = stats.byCategory["подписки"] || 0;
    return `Подписки: ${m(v)}. Раз в месяц сверяй, что реально используешь.`;
  }

  if (/цель|мечт/.test(q)) {
    if (!data.goals.length) return "Целей нет. Создай первую — посчитаю нужный темп.";
    return data.goals
      .map((g) => {
        const p = Math.round((g.currentAmount / g.targetAmount) * 100);
        const left = g.targetAmount - g.currentAmount;
        return `${g.emoji} «${g.title}» — ${p}% (ещё ${m(left)})`;
      })
      .join("\n");
  }

  if (/совет|что делать|рекоменд|как улучшить|помоги|сэкономить|экономи/.test(q)) {
    const all = generateAIAnalysis(data).slice(0, 3);
    return all.map((a, i) => `${i + 1}. ${a.icon} ${a.title}\n${a.message}`).join("\n\n");
  }

  if (/доход|зарплат|заработ/.test(q)) {
    const goal = data.settings.monthlyIncomeGoal;
    return `Доходы: ${m(stats.income)}${
      goal ? `\nЦель: ${m(goal)} (${Math.round((stats.income / goal) * 100)}%)` : ""
    }`;
  }

  if (/расход|трат|куда уход|топ/.test(q)) {
    if (!sorted[0]) return "Расходов пока нет.";
    const top3 = sorted.map(([c, a], i) => `${i + 1}. ${c} — ${m(a)}`).join("\n");
    return `Всего расходов: ${m(stats.expense)}\nТоп:\n${top3}`;
  }

  if (/недел|7 дн|за неделю/.test(q)) {
    return `За 7 дней:\n• Доход +${m(stats7.income)}\n• Расход −${m(stats7.expense)}\n• Баланс ${m(stats7.balance)}\n• Операций: ${stats7.txCount}`;
  }

  if (/финансов.*здоров|пульс|оценка|score|health/.test(q)) {
    const score = getHealthScore(data);
    return `Финансовый пульс: ${score}/100\nБаланс ${stats.balance >= 0 ? "положительный" : "отрицательный"}, сбережения ${stats.savingsRate}%, бюджеты OK: ${budgets.filter((b) => !b.over).length}/${budgets.length || 0}.`;
  }


  // Dynamic per-category lookup — any known category (default or custom), not just the common ones above.
  {
    const allCats = Array.from(
      new Set([...allExpenseCategories(data.settings), ...allIncomeCategories(data.settings)])
    );
    const hit = allCats.find((c) => q.includes(c.toLowerCase()));
    if (hit) {
      const spentExp = stats.byCategory[hit] || 0;
      const spentInc = stats.txs
        .filter((t) => t.type === "income" && t.category === hit)
        .reduce((s, t) => s + t.amount, 0);
      if (spentExp > 0) {
        const pct = stats.expense > 0 ? Math.round((spentExp / stats.expense) * 100) : 0;
        const b = budgets.find((x) => x.category === hit);
        return (
          `«${hit}»: ${m(spentExp)} (${pct}% всех расходов).` +
          (b ? `\nБюджет: ${m(b.spent)}/${m(b.limit)} (${b.percent}%)${b.over ? " 🔴 превышен" : ""}` : "")
        );
      }
      if (spentInc > 0) return `«${hit}»: доход ${m(spentInc)}.`;
      return `По «${hit}» пока нет операций.`;
    }
  }

  if (/что ты умеешь|команды|help|помощь|доступ/.test(q)) {
    return `Я вижу ВСЕ твои данные MoneyPulse:\n• баланс, доходы, расходы\n• сегодня / неделя / месяц\n• бюджеты и лимиты\n• цели и прогресс\n• топ-категории, любая категория по имени\n• самая крупная операция, средний чек\n• прогноз до конца месяца\n• последние операции\n\nСпроси: отчёт · сегодня · прогноз · бюджеты · топ · цели · совет · неделя · любая категория (напр. «еда» или «такси»)`;
  }

  if (/привет|здравств|hello|hi/.test(q)) {
    return getDoctorGreeting(data);
  }

  // default rich context
  return `Я в контексте твоих финансов:\n• баланс ${m(stats.balance)}\n• сбережения ${stats.savingsRate}%\n• ${data.goals.length} целей · ${data.budgets.length} бюджетов · ${stats.txCount} операций\n\nСпроси: «отчёт», «сегодня», «прогноз», «бюджеты», «совет», «топ», «цели» — отвечу по цифрам.`;
}

export function getQuickInsights(data: FinanceData): string[] {
  const C = data.settings?.currency || "₽";
  const m = (n: number) => formatMoney(n, C);
  const stats = calcStats(data);
  const budgets = budgetStatus(data);
  const out: string[] = [];
  if (stats.income > 0) out.push(`Сбережения ${stats.savingsRate}%`);
  const over = budgets.filter((b) => b.over);
  if (over.length) out.push(`${over.length} бюджет превышен`);
  else if (budgets.length) out.push("Бюджеты OK");
  const top = topCategories(stats.byCategory, 1)[0];
  if (top) out.push(`Топ: ${top[0]}`);
  return out.slice(0, 3);
}
