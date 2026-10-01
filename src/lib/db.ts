import { FinanceData, Transaction, Goal, Budget, Account, Settings } from "./types";
import { getPrisma } from "./prisma";
import type { Prisma } from "@prisma/client";

function requirePrisma() {
  const prisma = getPrisma();
  if (!prisma) {
    throw new Error(
      "DATABASE_URL is not set — MoneyPulse requires Postgres (Neon recommended). See PRODUCTION.md."
    );
  }
  return prisma;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function monthsAhead(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
}

const emptySettings = (): FinanceData["settings"] => ({
  currency: "сум",
  monthlyIncomeGoal: undefined,
  savingsTargetPercent: 20,
  name: "Пользователь",
  notifications: true,
  theme: "dark",
  streak: 0,
  bestStreak: 0,
  lastLogDate: "",
  badges: [],
  customCategories: [],
});

/** Real new accounts start at zero — no fake sky income */
export function getEmptyData(): FinanceData {
  return {
    transactions: [],
    goals: [],
    budgets: [],
    accounts: [],
    settings: emptySettings(),
  };
}

/** Demo / showcase only */
export function getDemoData(): FinanceData {
  return {
    transactions: [
      { id: "1", type: "income", amount: 120000, category: "зарплата", description: "Зарплата — сентябрь", date: daysAgo(2) },
      { id: "2", type: "income", amount: 18000, category: "фриланс", description: "Проект для клиента", date: daysAgo(5) },
      { id: "3", type: "income", amount: 4500, category: "инвестиции", description: "Дивиденды", date: daysAgo(10) },
      { id: "4", type: "expense", amount: 28000, category: "жильё", description: "Аренда квартиры", date: daysAgo(1), recurring: true },
      { id: "t0", type: "expense", amount: 890, category: "еда", description: "Кофе и обед", date: daysAgo(0) },
      { id: "5", type: "expense", amount: 12500, category: "еда", description: "Продукты + рестораны", date: daysAgo(1) },
      { id: "6", type: "expense", amount: 4200, category: "транспорт", description: "Метро, такси, бензин", date: daysAgo(2) },
      { id: "7", type: "expense", amount: 6800, category: "развлечения", description: "Кино, бары, Netflix", date: daysAgo(3) },
      { id: "8", type: "expense", amount: 3200, category: "подписки", description: "Spotify, iCloud, ChatGPT", date: daysAgo(4), recurring: true },
      { id: "9", type: "expense", amount: 8900, category: "одежда", description: "Куртка и кроссовки", date: daysAgo(7) },
      { id: "10", type: "expense", amount: 2500, category: "здоровье", description: "Аптека + витамины", date: daysAgo(8) },
      { id: "11", type: "expense", amount: 5500, category: "еда", description: "Доставка еды", date: daysAgo(6) },
      { id: "12", type: "expense", amount: 1500, category: "транспорт", description: "Такси вечером", date: daysAgo(9) },
      { id: "13", type: "expense", amount: 4000, category: "образование", description: "Курс по инвестициям", date: daysAgo(12) },
      { id: "14", type: "expense", amount: 2100, category: "развлечения", description: "Концерт", date: daysAgo(14) },
    ],
    goals: [
      { id: "g1", title: "Отпуск в Бали", targetAmount: 25000000, currentAmount: 8700000, deadline: monthsAhead(8), emoji: "🏖️", color: "#22d3ee" },
      { id: "g2", title: "MacBook Pro", targetAmount: 18000000, currentAmount: 6500000, deadline: monthsAhead(4), emoji: "💻", color: "#a78bfa" },
      { id: "g3", title: "Подушка безопасности", targetAmount: 30000000, currentAmount: 12000000, deadline: monthsAhead(12), emoji: "🛡️", color: "#34d399" },
    ],
    budgets: [
      { id: "b1", category: "еда", limit: 25000, period: "month" },
      { id: "b2", category: "развлечения", limit: 8000, period: "month" },
      { id: "b3", category: "транспорт", limit: 6000, period: "month" },
      { id: "b4", category: "подписки", limit: 4000, period: "month" },
    ],
    accounts: [
      { id: "a1", name: "Наличные", type: "cash", balance: 450000, emoji: "💵" },
      { id: "a2", name: "Uzcard · Humo", type: "card", balance: 3200000, emoji: "💳" },
      { id: "a3", name: "Накопления", type: "savings", balance: 8500000, emoji: "📈" },
    ],
    settings: {
      ...emptySettings(),
      monthlyIncomeGoal: 150000,
      name: "Demo",
      notifications: true,
    },
  };
}

/** @deprecated use getEmptyData / getDemoData */
export function getDefaultData(): FinanceData {
  return getEmptyData();
}

// ——— Prisma row <-> app-shape mapping ———

type TransactionRow = {
  id: string;
  type: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  recurring: boolean;
  accountId: string | null;
  tagsJson: string;
};

function fromRowTransaction(r: TransactionRow): Transaction {
  return {
    id: r.id,
    type: r.type as Transaction["type"],
    amount: r.amount,
    category: r.category,
    description: r.description,
    date: r.date,
    recurring: r.recurring,
    accountId: r.accountId ?? undefined,
    tags: safeParseArray(r.tagsJson),
  };
}

function safeParseArray(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function toRowTransaction(userId: string, t: Omit<Transaction, "id"> & { id?: string }) {
  return {
    ...(t.id ? { id: t.id } : {}),
    userId,
    type: t.type,
    amount: t.amount,
    category: t.category,
    description: t.description,
    date: t.date,
    recurring: !!t.recurring,
    accountId: t.accountId ?? null,
    tagsJson: JSON.stringify(t.tags ?? []),
  };
}

function fromRowGoal(g: {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string | null;
  emoji: string;
  color: string | null;
}): Goal {
  return {
    id: g.id,
    title: g.title,
    targetAmount: g.targetAmount,
    currentAmount: g.currentAmount,
    deadline: g.deadline ?? undefined,
    emoji: g.emoji,
    color: g.color ?? undefined,
  };
}

function fromRowBudget(b: { id: string; category: string; limit: number; period: string }): Budget {
  return { id: b.id, category: b.category, limit: b.limit, period: b.period as Budget["period"] };
}

function fromRowAccount(a: {
  id: string;
  name: string;
  type: string;
  balance: number;
  emoji: string | null;
}): Account {
  return { id: a.id, name: a.name, type: a.type as Account["type"], balance: a.balance, emoji: a.emoji ?? undefined };
}

function settingsFromRow(
  row: {
    currency: string;
    monthlyIncomeGoal: number | null;
    savingsTargetPercent: number;
    notifications: boolean;
    theme: string;
    streak: number;
    bestStreak: number;
    lastLogDate: string;
    badgesJson: string;
    customCategoriesJson: string;
  },
  userName: string
): Settings {
  return {
    currency: row.currency,
    monthlyIncomeGoal: row.monthlyIncomeGoal ?? undefined,
    savingsTargetPercent: row.savingsTargetPercent,
    name: userName,
    notifications: row.notifications,
    theme: row.theme as Settings["theme"],
    streak: row.streak,
    bestStreak: row.bestStreak,
    lastLogDate: row.lastLogDate,
    badges: safeParseArray(row.badgesJson),
    customCategories: safeParseArray(row.customCategoriesJson),
  };
}

/** Settings fields that persist as real UserSettings columns — `name` lives on User, not here. */
function settingsToRow(s: Partial<Settings>) {
  const row: Record<string, unknown> = {};
  if (s.currency !== undefined) row.currency = s.currency;
  if (s.monthlyIncomeGoal !== undefined) row.monthlyIncomeGoal = s.monthlyIncomeGoal ?? null;
  if (s.savingsTargetPercent !== undefined) row.savingsTargetPercent = s.savingsTargetPercent;
  if (s.notifications !== undefined) row.notifications = s.notifications;
  if (s.theme !== undefined) row.theme = s.theme;
  if (s.streak !== undefined) row.streak = s.streak;
  if (s.bestStreak !== undefined) row.bestStreak = s.bestStreak;
  if (s.lastLogDate !== undefined) row.lastLogDate = s.lastLogDate;
  if (s.badges !== undefined) row.badgesJson = JSON.stringify(s.badges);
  if (s.customCategories !== undefined) row.customCategoriesJson = JSON.stringify(s.customCategories);
  return row;
}

async function ensureSettingsRow(userId: string) {
  const prisma = requirePrisma();
  return prisma.userSettings.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

export async function readStore(userId: string): Promise<FinanceData> {
  const prisma = requirePrisma();
  const [user, transactions, goals, budgets, accounts, settingsRow] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    prisma.transaction.findMany({ where: { userId }, orderBy: { date: "desc" } }),
    prisma.goal.findMany({ where: { userId } }),
    prisma.budget.findMany({ where: { userId } }),
    prisma.account.findMany({ where: { userId } }),
    ensureSettingsRow(userId),
  ]);

  return {
    transactions: transactions.map(fromRowTransaction),
    goals: goals.map(fromRowGoal),
    budgets: budgets.map(fromRowBudget),
    accounts: accounts.map(fromRowAccount),
    settings: settingsFromRow(settingsRow, user?.name || "Пользователь"),
  };
}

/** Full-dataset replace (CSV import "replace", reset, and the client's legacy saveData()). */
export async function writeStore(userId: string, data: FinanceData): Promise<void> {
  const prisma = requirePrisma();
  const ops: Prisma.PrismaPromise<unknown>[] = [
    prisma.transaction.deleteMany({ where: { userId } }),
    prisma.goal.deleteMany({ where: { userId } }),
    prisma.budget.deleteMany({ where: { userId } }),
    prisma.account.deleteMany({ where: { userId } }),
  ];
  if (data.transactions.length) {
    ops.push(
      prisma.transaction.createMany({ data: data.transactions.map((t) => toRowTransaction(userId, t)) })
    );
  }
  if (data.goals.length) {
    ops.push(
      prisma.goal.createMany({
        data: data.goals.map((g) => ({
          id: g.id,
          userId,
          title: g.title,
          targetAmount: g.targetAmount,
          currentAmount: g.currentAmount,
          deadline: g.deadline ?? null,
          emoji: g.emoji,
          color: g.color ?? null,
        })),
      })
    );
  }
  if (data.budgets.length) {
    ops.push(
      prisma.budget.createMany({
        data: data.budgets.map((b) => ({ id: b.id, userId, category: b.category, limit: b.limit, period: b.period })),
      })
    );
  }
  if (data.accounts?.length) {
    ops.push(
      prisma.account.createMany({
        data: data.accounts.map((a) => ({
          id: a.id,
          userId,
          name: a.name,
          type: a.type,
          balance: a.balance,
          emoji: a.emoji ?? null,
        })),
      })
    );
  }
  ops.push(
    prisma.userSettings.upsert({
      where: { userId },
      create: { userId, ...settingsToRow(data.settings) },
      update: settingsToRow(data.settings),
    })
  );
  await prisma.$transaction(ops);
}

/** Bump streak/badges after a new transaction is logged "today". Mutates and returns the settings patch applied. */
async function bumpStreak(userId: string) {
  const prisma = requirePrisma();
  const row = await ensureSettingsRow(userId);
  const today = new Date().toISOString().slice(0, 10);
  if (row.lastLogDate === today) return; // already logged today
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yKey = yesterday.toISOString().slice(0, 10);
  const streak = row.lastLogDate === yKey ? row.streak + 1 : 1;
  const bestStreak = Math.max(row.bestStreak, streak);
  const txCount = await prisma.transaction.count({ where: { userId } });
  const badges = new Set(safeParseArray(row.badgesJson));
  if (streak >= 3) badges.add("streak_3");
  if (streak >= 7) badges.add("streak_7");
  if (streak >= 30) badges.add("streak_30");
  if (txCount >= 10) badges.add("ops_10");
  if (txCount >= 50) badges.add("ops_50");
  await prisma.userSettings.update({
    where: { userId },
    data: {
      streak,
      bestStreak,
      lastLogDate: today,
      badgesJson: JSON.stringify(Array.from(badges)),
    },
  });
}

export async function freeTransactionCount(userId: string): Promise<number> {
  const prisma = requirePrisma();
  return prisma.transaction.count({ where: { userId } });
}

export async function addTransactionForUser(
  userId: string,
  payload: Omit<Transaction, "id">
): Promise<Transaction> {
  const prisma = requirePrisma();
  const row = await prisma.transaction.create({ data: toRowTransaction(userId, payload) });
  await bumpStreak(userId);
  return fromRowTransaction(row);
}

export async function deleteTransactionForUser(userId: string, id: string): Promise<void> {
  const prisma = requirePrisma();
  await prisma.transaction.deleteMany({ where: { id, userId } });
}

export async function updateTransactionForUser(
  userId: string,
  id: string,
  updates: Partial<Transaction>
): Promise<void> {
  const prisma = requirePrisma();
  const data: Record<string, unknown> = {};
  if (updates.type !== undefined) data.type = updates.type;
  if (updates.amount !== undefined) data.amount = updates.amount;
  if (updates.category !== undefined) data.category = updates.category;
  if (updates.description !== undefined) data.description = updates.description;
  if (updates.date !== undefined) data.date = updates.date;
  if (updates.recurring !== undefined) data.recurring = updates.recurring;
  if (updates.accountId !== undefined) data.accountId = updates.accountId ?? null;
  if (updates.tags !== undefined) data.tagsJson = JSON.stringify(updates.tags);
  await prisma.transaction.updateMany({ where: { id, userId }, data });
}

export async function addGoalForUser(userId: string, payload: Omit<Goal, "id">): Promise<Goal> {
  const prisma = requirePrisma();
  const row = await prisma.goal.create({
    data: {
      userId,
      title: payload.title,
      targetAmount: payload.targetAmount,
      currentAmount: payload.currentAmount,
      deadline: payload.deadline ?? null,
      emoji: payload.emoji,
      color: payload.color ?? null,
    },
  });
  return fromRowGoal(row);
}

export async function updateGoalForUser(userId: string, id: string, updates: Partial<Goal>): Promise<void> {
  const prisma = requirePrisma();
  const data: Record<string, unknown> = {};
  if (updates.title !== undefined) data.title = updates.title;
  if (updates.targetAmount !== undefined) data.targetAmount = updates.targetAmount;
  if (updates.currentAmount !== undefined) data.currentAmount = updates.currentAmount;
  if (updates.deadline !== undefined) data.deadline = updates.deadline ?? null;
  if (updates.emoji !== undefined) data.emoji = updates.emoji;
  if (updates.color !== undefined) data.color = updates.color ?? null;
  await prisma.goal.updateMany({ where: { id, userId }, data });
}

export async function deleteGoalForUser(userId: string, id: string): Promise<void> {
  const prisma = requirePrisma();
  await prisma.goal.deleteMany({ where: { id, userId } });
}

export async function upsertBudgetForUser(userId: string, payload: Omit<Budget, "id">): Promise<Budget> {
  const prisma = requirePrisma();
  const existing = await prisma.budget.findFirst({ where: { userId, category: payload.category } });
  if (existing) {
    const row = await prisma.budget.update({
      where: { id: existing.id },
      data: { limit: payload.limit, period: payload.period },
    });
    return fromRowBudget(row);
  }
  const row = await prisma.budget.create({
    data: { userId, category: payload.category, limit: payload.limit, period: payload.period },
  });
  return fromRowBudget(row);
}

export async function deleteBudgetForUser(userId: string, id: string): Promise<void> {
  const prisma = requirePrisma();
  await prisma.budget.deleteMany({ where: { id, userId } });
}

export async function updateSettingsForUser(userId: string, updates: Partial<Settings>): Promise<void> {
  const row = settingsToRow(updates); // `name` is silently dropped — lives on User, not UserSettings
  if (Object.keys(row).length === 0) return;
  const prisma = requirePrisma();
  await prisma.userSettings.upsert({
    where: { userId },
    create: { userId, ...row },
    update: row,
  });
}

export async function resetUser(userId: string): Promise<void> {
  await writeStore(userId, getEmptyData());
}

export async function importTransactionsForUser(
  userId: string,
  list: Omit<Transaction, "id">[]
): Promise<void> {
  const prisma = requirePrisma();
  if (list.length) {
    await prisma.transaction.createMany({ data: list.map((t) => toRowTransaction(userId, t)) });
  }
  await bumpStreak(userId);
}

/** Auto-create this month's copies of recurring transaction templates, if missing. Returns true if anything changed. */
export async function ensureRecurringForUser(userId: string): Promise<boolean> {
  const prisma = requirePrisma();
  const templates = await prisma.transaction.findMany({ where: { userId, recurring: true } });
  if (templates.length === 0) return false;
  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  let changed = false;
  for (const tpl of templates) {
    const has = await prisma.transaction.findFirst({
      where: {
        userId,
        date: { startsWith: monthPrefix },
        type: tpl.type,
        category: tpl.category,
        amount: tpl.amount,
        description: tpl.description,
      },
    });
    if (!has) {
      const day = Math.min(
        parseInt(tpl.date.slice(8, 10), 10) || 1,
        new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      );
      await prisma.transaction.create({
        data: {
          userId,
          type: tpl.type,
          amount: tpl.amount,
          category: tpl.category,
          description: tpl.description,
          date: `${monthPrefix}-${String(day).padStart(2, "0")}`,
          recurring: true,
          tagsJson: tpl.tagsJson,
        },
      });
      changed = true;
    }
  }
  return changed;
}
