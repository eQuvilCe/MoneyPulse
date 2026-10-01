export type TransactionType = "income" | "expense";

export interface Account {
  id: string;
  name: string;
  type: "cash" | "bank" | "card" | "savings" | "other";
  balance: number;
  emoji?: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: string;
  tags?: string[];
  /** true = repeats monthly on the same day-of-month */
  recurring?: boolean;
  accountId?: string;
}

export interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  emoji: string;
  color?: string;
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
  period: "month" | "week";
}

export interface Settings {
  currency: string;
  monthlyIncomeGoal?: number;
  savingsTargetPercent: number;
  name: string;
  notifications: boolean;
  theme?: "dark" | "light";
  streak?: number;
  bestStreak?: number;
  lastLogDate?: string;
  badges?: string[];
  /** User-defined category names (merged with defaults) */
  customCategories?: string[];
}

export interface FinanceData {
  transactions: Transaction[];
  goals: Goal[];
  budgets: Budget[];
  settings: Settings;
  accounts?: Account[];
}

export const DEFAULT_EXPENSE_CATEGORIES = [
  "развлечения",
  "еда",
  "транспорт",
  "жильё",
  "здоровье",
  "одежда",
  "образование",
  "подписки",
  "другое",
] as const;

export const DEFAULT_INCOME_CATEGORIES = [
  "зарплата",
  "фриланс",
  "инвестиции",
  "подарок",
  "другое",
] as const;

/** @deprecated use DEFAULT_* + settings.customCategories */
export type ExpenseCategory = string;
export type IncomeCategory = string;
export const EXPENSE_CATEGORIES: string[] = [...DEFAULT_EXPENSE_CATEGORIES];
export const INCOME_CATEGORIES: string[] = [...DEFAULT_INCOME_CATEGORIES];

export function allExpenseCategories(settings?: Settings): string[] {
  const custom = (settings?.customCategories || []).filter(Boolean);
  return Array.from(new Set([...DEFAULT_EXPENSE_CATEGORIES, ...custom]));
}

export function allIncomeCategories(settings?: Settings): string[] {
  const custom = (settings?.customCategories || []).filter(Boolean);
  return Array.from(new Set([...DEFAULT_INCOME_CATEGORIES, ...custom]));
}

export const CATEGORY_ICONS: Record<string, string> = {
  развлечения: "🎮",
  еда: "🍕",
  транспорт: "🚗",
  жильё: "🏠",
  здоровье: "💊",
  одежда: "👕",
  образование: "📚",
  подписки: "📱",
  другое: "📦",
  зарплата: "💰",
  фриланс: "💻",
  инвестиции: "📈",
  подарок: "🎁",
};

export const CATEGORY_COLORS: Record<string, string> = {
  развлечения: "#a78bfa",
  еда: "#fb7185",
  транспорт: "#38bdf8",
  жильё: "#34d399",
  здоровье: "#f472b6",
  одежда: "#fbbf24",
  образование: "#818cf8",
  подписки: "#2dd4bf",
  другое: "#94a3b8",
  зарплата: "#4ade80",
  фриланс: "#22d3ee",
  инвестиции: "#c084fc",
  подарок: "#f9a8d4",
};

export function formatMoney(amount: number, currency = "₽"): string {
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString("ru-RU");
  const sign = amount < 0 ? "−" : "";
  const cur = currency || "₽";
  if (["$", "€", "£"].includes(cur)) {
    return `${sign}${cur}${formatted}`;
  }
  // UZS / сум after number
  if (cur === "UZS" || cur === "сум" || cur === "so'm") {
    return `${sign}${formatted} сум`;
  }
  return `${sign}${formatted} ${cur}`;
}
