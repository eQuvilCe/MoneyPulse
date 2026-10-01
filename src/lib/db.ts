import { promises as fs } from "fs";
import path from "path";
import { FinanceData } from "./types";

const DATA_DIR = path.join(process.cwd(), "data", "users");

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

function userPath(userId: string) {
  const safe = userId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "anonymous";
  return path.join(DATA_DIR, `${safe}.json`);
}

export async function readStore(userId: string): Promise<FinanceData> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const file = userPath(userId);
    const raw = await fs.readFile(file, "utf-8");
    const data = JSON.parse(raw) as FinanceData;
    if (!data.settings) data.settings = emptySettings();
    if (!data.budgets) data.budgets = [];
    if (!data.goals) data.goals = [];
    if (!data.transactions) data.transactions = [];
    return data;
  } catch {
    // No file yet — empty account (not demo)
    const empty = getEmptyData();
    await writeStore(userId, empty);
    return empty;
  }
}

export async function writeStore(userId: string, data: FinanceData): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(userPath(userId), JSON.stringify(data, null, 2), "utf-8");
}
