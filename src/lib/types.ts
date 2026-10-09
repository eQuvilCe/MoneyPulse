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

/** Largest single amount the app accepts (1 quadrillion) — keeps Float math exact and layouts sane. */
export const MAX_AMOUNT = 1e15;

function withCurrency(formatted: string, sign: string, currency: string): string {
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

/**
 * From here up a number is always shown abbreviated. Two reasons: a double cannot hold every
 * integer above ~9e15 anyway, and a 300-digit string stretches a page to thousands of pixels,
 * which makes the blurred cards and 3D layers behind it grind the browser to a halt.
 */
const FULL_DIGITS_LIMIT = 1e15;

/** Bare signed number, safe for any magnitude: exact below FULL_DIGITS_LIMIT, abbreviated above, "∞" if it overflowed. */
export function formatNumber(amount: number, lang: "ru" | "en" = "ru"): string {
  if (Number.isNaN(amount)) return "0";
  if (!Number.isFinite(amount)) return amount < 0 ? "−∞" : "∞";
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "−" : "";
  if (abs >= FULL_DIGITS_LIMIT) return sign + compactNumber(abs, lang);
  return sign + abs.toLocaleString(lang === "en" ? "en-US" : "ru-RU", { maximumFractionDigits: 2 });
}

export function formatMoney(amount: number, currency = "₽"): string {
  return withCurrency(formatNumber(Math.abs(amount)), amount < 0 ? "−" : "", currency);
}

/**
 * Reads an amount typed by the user. Returns null when it is not a positive number,
 * "too-big" when it exceeds MAX_AMOUNT (the server would reject it as well).
 */
export function readAmount(raw: string | number): number | "too-big" | null {
  const n = typeof raw === "number" ? raw : parseFloat(String(raw).replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(n)) return Number.isNaN(n) ? null : "too-big";
  if (n <= 0) return null;
  return n > MAX_AMOUNT ? "too-big" : n;
}

const COMPACT_UNITS: Record<"ru" | "en", string[]> = {
  ru: ["", " тыс", " млн", " млрд", " трлн", " квдрлн"],
  en: ["", "K", "M", "B", "T", "Q"],
};

/** "1 234 567 890" → "1,23 млрд". Numbers under 1 000 stay as they are. No currency. */
export function compactNumber(amount: number, lang: "ru" | "en" = "ru"): string {
  if (Number.isNaN(amount)) return "0";
  if (!Number.isFinite(amount)) return "∞";
  const abs = Math.abs(amount);
  const locale = lang === "en" ? "en-US" : "ru-RU";
  if (abs < 1000) return abs.toLocaleString(locale, { maximumFractionDigits: 2 });
  const units = COMPACT_UNITS[lang];
  let tier = Math.min(units.length - 1, Math.floor(Math.log10(abs) / 3));
  // log10 rounds up just below a power of 1000 (999 999 999 999 999 → 15) — step back so it reads "999 трлн", not "0,99 квдрлн"
  if (abs < Math.pow(1000, tier)) tier -= 1;
  const scaled = abs / Math.pow(1000, tier);
  // beyond the last named unit the mantissa itself gets long — fall back to exponent form
  if (scaled >= 1000) return abs.toExponential(2).replace("e+", "e");
  const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
  // floor, not round: "999,99 млн" must never display as "1000 млн"
  const f = Math.pow(10, digits);
  return (Math.floor(scaled * f) / f).toLocaleString(locale, { maximumFractionDigits: digits }) + units[tier];
}

export function formatMoneyCompact(amount: number, currency = "₽", lang: "ru" | "en" = "ru"): string {
  return withCurrency(compactNumber(amount, lang), amount < 0 ? "−" : "", currency);
}

/** Full number while it is short enough to read, compact ("12,5 млн") once it reaches `compactFrom`. */
export function formatMoneySmart(amount: number, currency = "₽", lang: "ru" | "en" = "ru", compactFrom = 1e9): string {
  return Math.abs(amount) >= compactFrom ? formatMoneyCompact(amount, currency, lang) : formatMoney(amount, currency);
}

/**
 * YYYY-MM-DD of the calendar day a moment falls on, as the user sees it. In the browser
 * that is the device's time zone; on the server (UTC machines) it is APP_TZ, Tashkent by
 * default. Never use toISOString().slice(0, 10) for this: it is the UTC day, so anything
 * logged between midnight and 05:00 in Tashkent would land on yesterday.
 */
export function dateKey(d: Date = new Date()): string {
  if (typeof window !== "undefined") {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.APP_TZ || "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}
