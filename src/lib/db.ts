import { FinanceData, Transaction, Goal, Budget, Account, Settings, dateKey } from "./types";
import { getPrisma } from "./prisma";
import type { Prisma } from "@prisma/client";
import { randomBytes } from "crypto";

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
  return dateKey(d);
}

function monthsAhead(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  return dateKey(d);
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
  // Every demo account gets fresh rows in a shared, globally-keyed table — reusing the
  // same literal ids ("1", "g1", ...) across demo users would collide on the DB's unique
  // constraint after the first one. Suffix each with a per-call random seed instead.
  const seed = crypto.randomUUID().slice(0, 8);
  const uid = (s: string) => `${s}-${seed}`;
  return {
    transactions: [
      { id: uid("1"), type: "income", amount: 120000, category: "зарплата", description: "Зарплата — сентябрь", date: daysAgo(2) },
      { id: uid("2"), type: "income", amount: 18000, category: "фриланс", description: "Проект для клиента", date: daysAgo(5) },
      { id: uid("3"), type: "income", amount: 4500, category: "инвестиции", description: "Дивиденды", date: daysAgo(10) },
      { id: uid("4"), type: "expense", amount: 28000, category: "жильё", description: "Аренда квартиры", date: daysAgo(1), recurring: true },
      { id: uid("t0"), type: "expense", amount: 890, category: "еда", description: "Кофе и обед", date: daysAgo(0) },
      { id: uid("5"), type: "expense", amount: 12500, category: "еда", description: "Продукты + рестораны", date: daysAgo(1) },
      { id: uid("6"), type: "expense", amount: 4200, category: "транспорт", description: "Метро, такси, бензин", date: daysAgo(2) },
      { id: uid("7"), type: "expense", amount: 6800, category: "развлечения", description: "Кино, бары, Netflix", date: daysAgo(3) },
      { id: uid("8"), type: "expense", amount: 3200, category: "подписки", description: "Spotify, iCloud, ChatGPT", date: daysAgo(4), recurring: true },
      { id: uid("9"), type: "expense", amount: 8900, category: "одежда", description: "Куртка и кроссовки", date: daysAgo(7) },
      { id: uid("10"), type: "expense", amount: 2500, category: "здоровье", description: "Аптека + витамины", date: daysAgo(8) },
      { id: uid("11"), type: "expense", amount: 5500, category: "еда", description: "Доставка еды", date: daysAgo(6) },
      { id: uid("12"), type: "expense", amount: 1500, category: "транспорт", description: "Такси вечером", date: daysAgo(9) },
      { id: uid("13"), type: "expense", amount: 4000, category: "образование", description: "Курс по инвестициям", date: daysAgo(12) },
      { id: uid("14"), type: "expense", amount: 2100, category: "развлечения", description: "Концерт", date: daysAgo(14) },
    ],
    goals: [
      { id: uid("g1"), title: "Отпуск в Бали", targetAmount: 25000000, currentAmount: 8700000, deadline: monthsAhead(8), emoji: "🏖️", color: "#22d3ee" },
      { id: uid("g2"), title: "MacBook Pro", targetAmount: 18000000, currentAmount: 6500000, deadline: monthsAhead(4), emoji: "💻", color: "#a78bfa" },
      { id: uid("g3"), title: "Подушка безопасности", targetAmount: 30000000, currentAmount: 12000000, deadline: monthsAhead(12), emoji: "🛡️", color: "#34d399" },
    ],
    budgets: [
      { id: uid("b1"), category: "еда", limit: 25000, period: "month" },
      { id: uid("b2"), category: "развлечения", limit: 8000, period: "month" },
      { id: uid("b3"), category: "транспорт", limit: 6000, period: "month" },
      { id: uid("b4"), category: "подписки", limit: 4000, period: "month" },
    ],
    accounts: [
      { id: uid("a1"), name: "Наличные", type: "cash", balance: 450000, emoji: "💵" },
      { id: uid("a2"), name: "Uzcard · Humo", type: "card", balance: 3200000, emoji: "💳" },
      { id: uid("a3"), name: "Накопления", type: "savings", balance: 8500000, emoji: "📈" },
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

/** Thrown when a request carries a cryptographically-valid JWT for a user that no longer exists in the DB. */
export class UserNotFoundError extends Error {
  constructor() {
    super("User not found");
    this.name = "UserNotFoundError";
  }
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
  // Check existence first, sequentially — a deleted-but-still-JWT-valid user would otherwise
  // make ensureSettingsRow's upsert fail on a foreign key violation instead of a clear signal.
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  if (!user) throw new UserNotFoundError();

  const [transactions, goals, budgets, accounts, settingsRow] = await Promise.all([
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
    settings: settingsFromRow(settingsRow, user.name || "Пользователь"),
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
  const today = dateKey();
  if (row.lastLogDate === today) return; // already logged today
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yKey = dateKey(yesterday);
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
  const row = await prisma.budget.upsert({
    where: { userId_category: { userId, category: payload.category } },
    create: { userId, category: payload.category, limit: payload.limit, period: payload.period },
    update: { limit: payload.limit, period: payload.period },
  });
  return fromRowBudget(row);
}

/** Ownership check before letting a transaction reference an accountId — the FK only proves the row exists, not that it's this user's. */
export async function accountBelongsToUser(userId: string, accountId: string): Promise<boolean> {
  const prisma = requirePrisma();
  const found = await prisma.account.findFirst({ where: { id: accountId, userId }, select: { id: true } });
  return !!found;
}

/** DB-backed monthly AI chat quota for free plan — persists across cold starts, unlike an in-memory counter. */
export async function consumeMonthlyAiQuota(
  userId: string,
  cap: number
): Promise<{ allowed: boolean; used: number; cap: number }> {
  const prisma = requirePrisma();
  const monthKey = new Date().toISOString().slice(0, 7);
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { aiUsedMonth: true, aiMonthKey: true },
    });
    if (!user) throw new UserNotFoundError();
    const used = user.aiMonthKey === monthKey ? user.aiUsedMonth : 0;
    if (used >= cap) {
      if (user.aiMonthKey !== monthKey) {
        await tx.user.update({ where: { id: userId }, data: { aiUsedMonth: 0, aiMonthKey: monthKey } });
      }
      return { allowed: false, used, cap };
    }
    await tx.user.update({ where: { id: userId }, data: { aiUsedMonth: used + 1, aiMonthKey: monthKey } });
    return { allowed: true, used: used + 1, cap };
  });
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

// ——— Family (up to 7 members, invite-code join, full cross-member transaction visibility) ———

const INVITE_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // excludes 0/O/1/I/l look-alikes
const FAMILY_MAX_MEMBERS = 7;

export class FamilyError extends Error {
  code: "ALREADY_IN_FAMILY" | "NOT_IN_FAMILY" | "INVALID_CODE" | "FAMILY_FULL" | "NOT_OWNER" | "NOT_SAME_FAMILY";
  constructor(code: FamilyError["code"], message: string) {
    super(message);
    this.name = "FamilyError";
    this.code = code;
  }
}

const FAMILY_ERROR_STATUS: Record<FamilyError["code"], number> = {
  ALREADY_IN_FAMILY: 409,
  NOT_IN_FAMILY: 404,
  INVALID_CODE: 404,
  FAMILY_FULL: 409,
  NOT_OWNER: 403,
  NOT_SAME_FAMILY: 403,
};

/** Route catch-blocks call this first (alongside validationErrorResponse) to turn a FamilyError into a clean response. */
export function familyErrorResponse(e: unknown) {
  if (e instanceof FamilyError) {
    return { error: e.message, status: FAMILY_ERROR_STATUS[e.code] };
  }
  return null;
}

export type FamilyMemberPublic = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: "owner" | "member";
  joinedAt: string;
};

export type FamilyPublic = {
  id: string;
  name: string;
  inviteCode: string;
  ownerId: string;
  members: FamilyMemberPublic[];
};

function isUniqueConstraintError(e: unknown): boolean {
  return !!e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002";
}

function generateInviteCode(): string {
  let out = "";
  const bytes = randomBytes(8);
  for (let i = 0; i < 8; i++) {
    out += INVITE_CODE_ALPHABET[bytes[i] % INVITE_CODE_ALPHABET.length];
  }
  return out;
}

function toFamilyPublic(
  family: { id: string; name: string; inviteCode: string; ownerId: string },
  members: { id: string; userId: string; role: string; joinedAt: Date; user: { name: string; email: string } }[]
): FamilyPublic {
  return {
    id: family.id,
    name: family.name,
    inviteCode: family.inviteCode,
    ownerId: family.ownerId,
    members: members.map((m) => ({
      id: m.id,
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      role: m.role as "owner" | "member",
      joinedAt: m.joinedAt.toISOString(),
    })),
  };
}

async function familyMembersPublic(prisma: ReturnType<typeof requirePrisma>, familyId: string) {
  return prisma.familyMember.findMany({
    where: { familyId },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { joinedAt: "asc" },
  });
}

export async function createFamily(userId: string, name: string): Promise<FamilyPublic> {
  const prisma = requirePrisma();
  const existing = await prisma.familyMember.findUnique({ where: { userId } });
  if (existing) throw new FamilyError("ALREADY_IN_FAMILY", "Вы уже состоите в семье — сначала покиньте её.");

  for (let attempt = 0; attempt < 5; attempt++) {
    const inviteCode = generateInviteCode();
    try {
      const family = await prisma.$transaction(async (tx) => {
        const fam = await tx.family.create({
          data: { name: name.trim() || "Моя семья", inviteCode, ownerId: userId },
        });
        await tx.familyMember.create({ data: { familyId: fam.id, userId, role: "owner" } });
        return fam;
      });
      const members = await familyMembersPublic(prisma, family.id);
      return toFamilyPublic(family, members);
    } catch (e) {
      if (isUniqueConstraintError(e) && attempt < 4) continue;
      throw e;
    }
  }
  throw new Error("Could not generate a unique invite code");
}

export async function joinFamilyByCode(userId: string, code: string): Promise<FamilyPublic> {
  const prisma = requirePrisma();
  const existing = await prisma.familyMember.findUnique({ where: { userId } });
  if (existing) throw new FamilyError("ALREADY_IN_FAMILY", "Вы уже состоите в семье — сначала покиньте её.");

  const family = await prisma.family.findUnique({ where: { inviteCode: code.trim().toUpperCase() } });
  if (!family) throw new FamilyError("INVALID_CODE", "Код приглашения не найден.");

  const count = await prisma.familyMember.count({ where: { familyId: family.id } });
  if (count >= FAMILY_MAX_MEMBERS) throw new FamilyError("FAMILY_FULL", "В этой семье уже максимум 7 человек.");

  await prisma.familyMember.create({ data: { familyId: family.id, userId, role: "member" } });
  const members = await familyMembersPublic(prisma, family.id);
  return toFamilyPublic(family, members);
}

export async function getMyFamily(userId: string): Promise<FamilyPublic | null> {
  const prisma = requirePrisma();
  const membership = await prisma.familyMember.findUnique({ where: { userId } });
  if (!membership) return null;
  const family = await prisma.family.findUnique({ where: { id: membership.familyId } });
  if (!family) return null;
  const members = await familyMembersPublic(prisma, family.id);
  return toFamilyPublic(family, members);
}

export async function leaveFamily(userId: string): Promise<void> {
  const prisma = requirePrisma();
  const membership = await prisma.familyMember.findUnique({ where: { userId } });
  if (!membership) throw new FamilyError("NOT_IN_FAMILY", "Вы не состоите в семье.");

  const others = await prisma.familyMember.findMany({
    where: { familyId: membership.familyId, userId: { not: userId } },
    orderBy: { joinedAt: "asc" },
  });

  if (others.length === 0) {
    // Last member leaving — cascades to delete their own FamilyMember row too.
    await prisma.family.delete({ where: { id: membership.familyId } });
    return;
  }

  if (membership.role === "owner") {
    const next = others[0];
    await prisma.$transaction([
      prisma.family.update({ where: { id: membership.familyId }, data: { ownerId: next.userId } }),
      prisma.familyMember.update({ where: { userId: next.userId }, data: { role: "owner" } }),
      prisma.familyMember.delete({ where: { userId } }),
    ]);
    return;
  }

  await prisma.familyMember.delete({ where: { userId } });
}

export async function removeFamilyMember(ownerUserId: string, targetUserId: string): Promise<void> {
  if (targetUserId === ownerUserId) {
    throw new FamilyError("NOT_OWNER", "Чтобы покинуть семью самому, используйте выход из семьи.");
  }
  const prisma = requirePrisma();
  const ownerMembership = await prisma.familyMember.findUnique({ where: { userId: ownerUserId } });
  if (!ownerMembership || ownerMembership.role !== "owner") {
    throw new FamilyError("NOT_OWNER", "Только владелец семьи может удалять участников.");
  }
  const targetMembership = await prisma.familyMember.findUnique({ where: { userId: targetUserId } });
  if (!targetMembership || targetMembership.familyId !== ownerMembership.familyId) {
    throw new FamilyError("NOT_SAME_FAMILY", "Этот человек не состоит в вашей семье.");
  }
  await prisma.familyMember.delete({ where: { userId: targetUserId } });
}

export async function rotateInviteCode(ownerUserId: string): Promise<string> {
  const prisma = requirePrisma();
  const membership = await prisma.familyMember.findUnique({ where: { userId: ownerUserId } });
  if (!membership || membership.role !== "owner") {
    throw new FamilyError("NOT_OWNER", "Только владелец семьи может обновить код приглашения.");
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    const inviteCode = generateInviteCode();
    try {
      await prisma.family.update({ where: { id: membership.familyId }, data: { inviteCode } });
      return inviteCode;
    } catch (e) {
      if (isUniqueConstraintError(e) && attempt < 4) continue;
      throw e;
    }
  }
  throw new Error("Could not generate a unique invite code");
}

export type FamilyMemberStat = { userId: string; name: string; income: number; expense: number };
export type FamilyTransactionRow = {
  id: string;
  userId: string;
  memberName: string;
  type: string;
  amount: number;
  category: string;
  description: string;
  date: string;
};
export type FamilyBudgetPublic = { id: string; category: string; limit: number; period: string; createdBy: string };
export type FamilyGoalPublic = {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string | null;
  emoji: string;
  createdBy: string;
};
export type FamilyAlert = { category: string; limit: number; spent: number; overBy: number };

/** Looks up a FamilyBudget and verifies `userId` belongs to its family — throws otherwise. Never trust a client-supplied familyId alone. */
async function requireFamilyBudgetAccess(prisma: ReturnType<typeof requirePrisma>, userId: string, budgetId: string) {
  const budget = await prisma.familyBudget.findUnique({ where: { id: budgetId } });
  if (!budget) throw new FamilyError("NOT_IN_FAMILY", "Бюджет не найден.");
  const membership = await prisma.familyMember.findUnique({ where: { userId } });
  if (!membership || membership.familyId !== budget.familyId) {
    throw new FamilyError("NOT_SAME_FAMILY", "У вас нет доступа к этому бюджету семьи.");
  }
  return budget;
}

/** Looks up a FamilyGoal and verifies `userId` belongs to its family — throws otherwise. */
async function requireFamilyGoalAccess(prisma: ReturnType<typeof requirePrisma>, userId: string, goalId: string) {
  const goal = await prisma.familyGoal.findUnique({ where: { id: goalId } });
  if (!goal) throw new FamilyError("NOT_IN_FAMILY", "Цель не найдена.");
  const membership = await prisma.familyMember.findUnique({ where: { userId } });
  if (!membership || membership.familyId !== goal.familyId) {
    throw new FamilyError("NOT_SAME_FAMILY", "У вас нет доступа к этой цели семьи.");
  }
  return goal;
}

async function requireFamilyMembership(prisma: ReturnType<typeof requirePrisma>, userId: string, familyId: string) {
  const membership = await prisma.familyMember.findUnique({ where: { userId } });
  if (!membership || membership.familyId !== familyId) {
    throw new FamilyError("NOT_SAME_FAMILY", "У вас нет доступа к этой семье.");
  }
}

export async function upsertFamilyBudget(
  userId: string,
  familyId: string,
  category: string,
  limit: number,
  period: string
): Promise<FamilyBudgetPublic> {
  const prisma = requirePrisma();
  await requireFamilyMembership(prisma, userId, familyId);
  const b = await prisma.familyBudget.upsert({
    where: { familyId_category: { familyId, category } },
    create: { familyId, category, limit, period, createdBy: userId },
    update: { limit, period },
  });
  return { id: b.id, category: b.category, limit: b.limit, period: b.period, createdBy: b.createdBy };
}

export async function deleteFamilyBudget(userId: string, budgetId: string): Promise<void> {
  const prisma = requirePrisma();
  await requireFamilyBudgetAccess(prisma, userId, budgetId);
  await prisma.familyBudget.delete({ where: { id: budgetId } });
}

export async function addFamilyGoal(
  userId: string,
  familyId: string,
  title: string,
  targetAmount: number,
  emoji: string,
  deadline?: string
): Promise<FamilyGoalPublic> {
  const prisma = requirePrisma();
  await requireFamilyMembership(prisma, userId, familyId);
  const g = await prisma.familyGoal.create({
    data: { familyId, title, targetAmount, emoji, deadline, createdBy: userId },
  });
  return {
    id: g.id,
    title: g.title,
    targetAmount: g.targetAmount,
    currentAmount: g.currentAmount,
    deadline: g.deadline,
    emoji: g.emoji,
    createdBy: g.createdBy,
  };
}

export async function updateFamilyGoal(
  userId: string,
  goalId: string,
  updates: { currentAmount?: number; title?: string; targetAmount?: number; deadline?: string | null; emoji?: string }
): Promise<FamilyGoalPublic> {
  const prisma = requirePrisma();
  await requireFamilyGoalAccess(prisma, userId, goalId);
  const g = await prisma.familyGoal.update({ where: { id: goalId }, data: updates });
  return {
    id: g.id,
    title: g.title,
    targetAmount: g.targetAmount,
    currentAmount: g.currentAmount,
    deadline: g.deadline,
    emoji: g.emoji,
    createdBy: g.createdBy,
  };
}

export async function deleteFamilyGoal(userId: string, goalId: string): Promise<void> {
  const prisma = requirePrisma();
  await requireFamilyGoalAccess(prisma, userId, goalId);
  await prisma.familyGoal.delete({ where: { id: goalId } });
}

export async function getFamilyOverview(
  familyId: string,
  requestingUserId: string
): Promise<{
  stats: FamilyMemberStat[];
  transactions: FamilyTransactionRow[];
  familyBudgets: FamilyBudgetPublic[];
  familyGoals: FamilyGoalPublic[];
  familyAlerts: FamilyAlert[];
}> {
  const prisma = requirePrisma();
  // Security-critical: never aggregate another user's data without first confirming the
  // requester actually belongs to THIS family — a client-supplied familyId must never be trusted alone.
  const membership = await prisma.familyMember.findUnique({ where: { userId: requestingUserId } });
  if (!membership || membership.familyId !== familyId) {
    throw new FamilyError("NOT_SAME_FAMILY", "У вас нет доступа к этой семье.");
  }

  const members = await prisma.familyMember.findMany({
    where: { familyId },
    include: { user: { select: { id: true, name: true } } },
  });
  const memberIds = members.map((m) => m.userId);
  const nameByUserId = new Map(members.map((m) => [m.userId, m.user.name]));

  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const monthRows = await prisma.transaction.findMany({
    where: { userId: { in: memberIds }, date: { startsWith: monthPrefix } },
    select: { userId: true, type: true, amount: true, category: true },
  });
  const stats: FamilyMemberStat[] = memberIds.map((id) => {
    const rows = monthRows.filter((r) => r.userId === id);
    return {
      userId: id,
      name: nameByUserId.get(id) || "—",
      income: rows.filter((r) => r.type === "income").reduce((s, r) => s + r.amount, 0),
      expense: rows.filter((r) => r.type === "expense").reduce((s, r) => s + r.amount, 0),
    };
  });

  const recent = await prisma.transaction.findMany({
    where: { userId: { in: memberIds } },
    orderBy: { date: "desc" },
    take: 200,
  });
  const transactions: FamilyTransactionRow[] = recent.map((t) => ({
    id: t.id,
    userId: t.userId,
    memberName: nameByUserId.get(t.userId) || "—",
    type: t.type,
    amount: t.amount,
    category: t.category,
    description: t.description,
    date: t.date,
  }));

  const [familyBudgetRows, familyGoalRows] = await Promise.all([
    prisma.familyBudget.findMany({ where: { familyId } }),
    prisma.familyGoal.findMany({ where: { familyId } }),
  ]);
  const familyBudgets: FamilyBudgetPublic[] = familyBudgetRows.map((b) => ({
    id: b.id,
    category: b.category,
    limit: b.limit,
    period: b.period,
    createdBy: b.createdBy,
  }));
  const familyGoals: FamilyGoalPublic[] = familyGoalRows.map((g) => ({
    id: g.id,
    title: g.title,
    targetAmount: g.targetAmount,
    currentAmount: g.currentAmount,
    deadline: g.deadline,
    emoji: g.emoji,
    createdBy: g.createdBy,
  }));

  const familyAlerts: FamilyAlert[] = [];
  for (const b of familyBudgetRows) {
    const spent = monthRows
      .filter((r) => r.type === "expense" && r.category === b.category)
      .reduce((s, r) => s + r.amount, 0);
    if (spent > b.limit) {
      familyAlerts.push({ category: b.category, limit: b.limit, spent, overBy: spent - b.limit });
    }
  }

  return { stats, transactions, familyBudgets, familyGoals, familyAlerts };
}

// ——— Family chat (members only; newest FAMILY_CHAT_PAGE messages, polled by the client) ———

export type FamilyMessagePublic = {
  id: string;
  userId: string;
  authorName: string;
  text: string;
  createdAt: string;
};

const FAMILY_CHAT_PAGE = 60;

function toMessagePublic(m: { id: string; userId: string; authorName: string; text: string; createdAt: Date }): FamilyMessagePublic {
  return { id: m.id, userId: m.userId, authorName: m.authorName, text: m.text, createdAt: m.createdAt.toISOString() };
}

async function requireFamilyId(prisma: ReturnType<typeof requirePrisma>, userId: string): Promise<string> {
  const membership = await prisma.familyMember.findUnique({ where: { userId } });
  if (!membership) throw new FamilyError("NOT_IN_FAMILY", "Вы не состоите в семье.");
  return membership.familyId;
}

/** Without `after`: the latest page, oldest first. With `after` (ISO date): only messages newer than it. */
export async function listFamilyMessages(userId: string, after?: string): Promise<FamilyMessagePublic[]> {
  const prisma = requirePrisma();
  const familyId = await requireFamilyId(prisma, userId);
  const since = after ? new Date(after) : null;
  if (since && !Number.isNaN(since.getTime())) {
    const rows = await prisma.familyMessage.findMany({
      where: { familyId, createdAt: { gt: since } },
      orderBy: { createdAt: "asc" },
      take: FAMILY_CHAT_PAGE,
    });
    return rows.map(toMessagePublic);
  }
  const rows = await prisma.familyMessage.findMany({
    where: { familyId },
    orderBy: { createdAt: "desc" },
    take: FAMILY_CHAT_PAGE,
  });
  return rows.reverse().map(toMessagePublic);
}

export async function addFamilyMessage(userId: string, text: string): Promise<FamilyMessagePublic> {
  const prisma = requirePrisma();
  const familyId = await requireFamilyId(prisma, userId);
  const author = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  const row = await prisma.familyMessage.create({
    data: { familyId, userId, authorName: author?.name || "?", text },
  });
  return toMessagePublic(row);
}

/** Authors delete their own messages; the family owner can delete anyone's. */
export async function deleteFamilyMessage(userId: string, messageId: string): Promise<void> {
  const prisma = requirePrisma();
  const membership = await prisma.familyMember.findUnique({ where: { userId } });
  if (!membership) throw new FamilyError("NOT_IN_FAMILY", "Вы не состоите в семье.");
  const msg = await prisma.familyMessage.findUnique({ where: { id: messageId } });
  if (!msg || msg.familyId !== membership.familyId) {
    throw new FamilyError("NOT_SAME_FAMILY", "Сообщение не найдено.");
  }
  if (msg.userId !== userId && membership.role !== "owner") {
    throw new FamilyError("NOT_OWNER", "Удалить можно только своё сообщение.");
  }
  await prisma.familyMessage.delete({ where: { id: messageId } });
}
