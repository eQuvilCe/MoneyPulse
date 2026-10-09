import { MAX_AMOUNT } from "@/lib/types";

/**
 * Free-text → transaction, for the Telegram bot. Pure functions, no I/O:
 *   "кофе 25 000"  "25к такси"  "1.5 млн аренда"  "+5 000 000 зарплата"  "obed 45000"
 */

export type QuickEntry = {
  type: "income" | "expense";
  amount: number;
  category: string;
  description: string;
};

const EXPENSE_WORDS: Record<string, string[]> = {
  еда: ["еда", "обед", "ужин", "завтрак", "кофе", "чай", "продукт", "магазин", "korzinka", "корзинка", "makro", "макро", "havas", "ресторан", "кафе", "фастфуд", "бургер", "пицца", "суши", "плов", "самса", "шаурма", "хлеб", "молоко", "мясо", "базар", "bozor", "ovqat", "tushlik", "non", "food", "lunch", "dinner", "coffee", "grocer", "evos", "kfc", "oqtepa"],
  транспорт: ["такси", "taxi", "yandex", "яндекс", "бензин", "заправк", "метро", "автобус", "парковк", "проезд", "мойка", "шиномонтаж", "benzin", "avtobus", "uber", "mytaxi", "fuel", "bus", "metro"],
  жильё: ["аренд", "квартир", "ипотек", "коммунал", "свет", "газ", "вода", "электр", "ремонт", "мебель", "ijara", "kvartira", "kommunal", "rent", "utilities"],
  здоровье: ["аптек", "лекарств", "врач", "клиник", "стоматолог", "анализ", "больниц", "dorixona", "shifokor", "pharmacy", "doctor", "спортзал", "фитнес", "gym"],
  одежда: ["одежд", "обувь", "кроссовк", "куртк", "футболк", "джинс", "kiyim", "poyabzal", "clothes", "shoes", "zara", "lcwaikiki"],
  образование: ["курс", "учеб", "книг", "школ", "универ", "репетитор", "контракт", "kitob", "maktab", "course", "book", "tuition"],
  подписки: ["подписк", "netflix", "spotify", "youtube", "интернет", "связь", "beeline", "ucell", "mobiuz", "uztelecom", "icloud", "chatgpt", "телефон", "тариф", "internet", "subscription"],
  развлечения: ["кино", "игр", "бар", "клуб", "концерт", "боулинг", "кальян", "отдых", "путешеств", "билет", "steam", "playstation", "cinema", "game", "party"],
};

const INCOME_WORDS: Record<string, string[]> = {
  зарплата: ["зарплат", "зп", "аванс", "оклад", "преми", "oylik", "maosh", "salary", "wage", "bonus"],
  фриланс: ["фриланс", "заказ", "проект", "клиент", "подработк", "freelance", "upwork", "client"],
  инвестиции: ["дивиденд", "инвест", "процент", "вклад", "депозит", "dividend", "interest"],
  подарок: ["подар", "подарил", "sovg", "gift"],
};

/** Words that make an entry an income even without a leading "+". */
const INCOME_HINTS = ["получил", "получила", "пришл", "доход", "вернул", "вернули", "возврат", "кэшбэк", "кешбэк", "cashback", "income", "kirim", "tushdi"];

const MULTIPLIERS: [RegExp, number][] = [
  [/^(млрд|mlrd|b)$/i, 1e9],
  [/^(млн|mln|м|m|лям|ляма|лямов)$/i, 1e6],
  [/^(тыс|тыщ|ming|к|k|т)$/i, 1e3],
];

function parseNumber(raw: string, hasMultiplier: boolean): number {
  const s = raw.replace(/[\s\u00a0]/g, "");
  // "25,000" / "1.250.000" are thousands separators; "1,5" / "2.75" are decimals
  if (!hasMultiplier && /^\d{1,3}([.,]\d{3})+$/.test(s)) return Number(s.replace(/[.,]/g, ""));
  return Number(s.replace(",", "."));
}

function pickCategory(text: string, table: Record<string, string[]>): string | null {
  const t = text.toLowerCase();
  for (const [cat, words] of Object.entries(table)) {
    if (words.some((w) => t.includes(w))) return cat;
  }
  return null;
}

/**
 * `forceType` is set when the user already said what the entry is (the bot's "Расход" /
 * "Доход" buttons): the wording then only decides the category, never the type — so
 * "зарплата няне 500 000" entered as an expense stays an expense.
 */
export function parseQuickEntry(input: string, forceType?: "income" | "expense"): QuickEntry | null {
  const text = input.replace(/\s+/g, " ").trim();
  if (!text) return null;

  // number, optionally followed by a multiplier that is a whole word ("25к такси", not "25 кофе")
  // Word multipliers may follow a space ("12 тыс"); single letters must touch the number ("25к"),
  // otherwise "25000 м" (metres? a typo?) would silently become 25 billion.
  const m = text.match(/(\d[\d\s\u00a0.,]*\d|\d)(?:\s*(млрд|mlrd|млн|mln|лямов|ляма|лям|тыс|тыщ|ming)|([кkтмmb]))?(?![a-zа-яё0-9])/i);
  if (!m || m.index === undefined) return null;

  const unit = m[2] || m[3];
  const mult = unit ? MULTIPLIERS.find(([re]) => re.test(unit))?.[1] ?? 1 : 1;
  const amount = Math.round(parseNumber(m[1], mult !== 1) * mult * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) return null;

  const before = text.slice(0, m.index);
  const after = text.slice(m.index + m[0].length);
  const plus = /\+\s*$/.test(before) || /^\s*\+/.test(text);
  const rest = `${before} ${after}`
    .replace(/(^|\s)[a-zа-яё](?=\s|$)/gi, " ") // stray single letters left over from "25000 м"
    .replace(/[+\-−–—]/g, " ")
    .replace(/\b(сум|сумов|сўм|so'm|som|uzs|руб|rub|usd|\$|₽)\b\.?/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const lower = rest.toLowerCase();
  const incomeCat = pickCategory(lower, INCOME_WORDS);
  const isIncome = forceType ? forceType === "income" : plus || !!incomeCat || INCOME_HINTS.some((w) => lower.includes(w));

  const category = isIncome ? incomeCat ?? "другое" : pickCategory(lower, EXPENSE_WORDS) ?? "другое";
  const description = (rest || category).slice(0, 120);

  return { type: isIncome ? "income" : "expense", amount, category, description: description.charAt(0).toUpperCase() + description.slice(1) };
}

/** A forwarded bank notification rather than something the user typed themselves. */
export function looksLikeBankSms(text: string): boolean {
  return /(oplata|pokupka|spisanie|popolnenie|ostatok|karta\s*\*|\*{2,}\d{4}|списани|пополнени|покупка|оплата[:\s].*(uzs|сум)|остаток|доступно|humo|uzcard)/i.test(text) && text.length > 20;
}

/** Just the amount from a line like "500 000" or "1.5 млн" — for steps where only a number is expected. */
export function parseAmountOnly(input: string): number | null {
  return parseQuickEntry(input, "expense")?.amount ?? null;
}
