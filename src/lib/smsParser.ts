import { MAX_AMOUNT } from "./types";
/** Parse bank SMS / push notification text → transaction fields */

export type ParsedSms = {
  amount: number;
  type: "income" | "expense";
  merchant: string;
  balance?: number;
  cardLast4?: string;
  currency?: string;
  raw: string;
  confidence: number;
};

const MERCHANT_CATEGORY: [RegExp, string][] = [
  [/korzinka|magnum|continente|perekrestok|magnit|pyateroch|grocery|супермаркет|продукты/i, "еда"],
  [/coffee|cafe|starbucks|кофе|ресторан|yandex.?eda|glovo/i, "еда"],
  [/yandex.?go|uber|bolt|taxi|метро|benzin|fuel|азс/i, "транспорт"],
  [/netflix|spotify|apple|google|icloud|подписк/i, "подписки"],
  [/apteka|pharmacy|clinic|больниц|аптек/i, "здоровье"],
  [/cinema|kino|steam|playstation|развлеч/i, "развлечения"],
  [/rent|arenda|жкх|kommunal|ипотек/i, "жильё"],
];

export function guessCategory(merchant: string): string {
  for (const [re, cat] of MERCHANT_CATEGORY) {
    if (re.test(merchant)) return cat;
  }
  return "другое";
}

function parseAmount(s: string): number | null {
  // 45,000 or 45.000 or 45 000 or 45000.50
  const m = s.match(
    /(\d{1,3}(?:[\s,.\u00a0]\d{3})*(?:[.,]\d{1,2})?|\d+[.,]\d{1,2}|\d+)/
  );
  if (!m) return null;
  let n = m[1].replace(/[\s\u00a0]/g, "");
  // if both . and , assume European: 1.234,56
  if (n.includes(",") && n.includes(".")) {
    if (n.lastIndexOf(",") > n.lastIndexOf(".")) {
      n = n.replace(/\./g, "").replace(",", ".");
    } else {
      n = n.replace(/,/g, "");
    }
  } else if (n.includes(",")) {
    // 45,000 → thousands OR 45,50 decimal
    const parts = n.split(",");
    if (parts[1]?.length === 3 && parts.length === 2) n = parts.join("");
    else n = n.replace(",", ".");
  }
  const val = parseFloat(n);
  return Number.isFinite(val) && val <= MAX_AMOUNT ? val : null;
}

export function parseBankSms(text: string): ParsedSms | null {
  const raw = text.trim();
  if (raw.length < 8) return null;

  const lower = raw.toLowerCase();

  // type
  let type: "income" | "expense" = "expense";
  if (
    /zachislen|popolnen|приход|зачислен|пополнен|incoming|credit|поступлен/i.test(
      raw
    )
  ) {
    type = "income";
  }
  if (/oplata|spisanie|покупка|оплата|списан|purchase|payment|debit|снят/i.test(raw)) {
    type = "expense";
  }

  // amount near keywords
  let amount: number | null = null;
  const amountPatterns = [
    /(?:oplata|оплата|spisanie|списан[оие]*|purchase|payment|summa|сумма)[:\s]*([0-9\s.,\u00a0]+)\s*(?:uzs|usd|eur|rub|₽|\$|сум)?/i,
    /(?:na\s+summu|на\s+сумму)[:\s]*([0-9\s.,\u00a0]+)/i,
    /([0-9\s.,\u00a0]+)\s*(?:uzs|usd|eur|rub|₽|сум)/i,
  ];
  for (const re of amountPatterns) {
    const m = raw.match(re);
    if (m) {
      amount = parseAmount(m[1]);
      if (amount) break;
    }
  }
  if (!amount) {
    // fallback first big number
    const all = [...raw.matchAll(/(\d{1,3}(?:[\s,]\d{3})+|\d{4,})/g)];
    if (all[0]) amount = parseAmount(all[0][1]);
  }
  if (!amount || amount <= 0) return null;

  // merchant
  let merchant = "Банк";
  const merchPatterns = [
    /(?:v\s+|в\s+|pos\s+|u\s+|у\s+)([A-Za-zА-Яа-яЁё0-9 .&_-]{2,40}?)(?:\.|,|\s+Ostatok|\s+Баланс|\s+ostatok|$)/i,
    /(?:magazin|merchant|точка)[:\s]+([^\n.,]{2,40})/i,
  ];
  for (const re of merchPatterns) {
    const m = raw.match(re);
    if (m?.[1]) {
      merchant = m[1].trim().replace(/\s+/g, " ");
      break;
    }
  }
  // Korzinka-style without prefix
  const known = raw.match(
    /\b(Korzinka|Magnum|Uzum|Click|Payme|Yandex|Glovo|Starbucks|Wildberries|Ozon)[A-Za-z0-9 ]*/i
  );
  if (known) merchant = known[0].trim();

  // balance
  let balance: number | undefined;
  const bal = raw.match(
    /(?:ostatok|баланс|available|доступно)[:\s]*([0-9\s.,\u00a0]+)/i
  );
  if (bal) {
    const b = parseAmount(bal[1]);
    if (b) balance = b;
  }

  // card last4
  let cardLast4: string | undefined;
  const card = raw.match(/(?:\*{2,}|…|xxxx)?(\d{4})(?:\s|:|$)/i);
  if (card) cardLast4 = card[1];

  let currency = "₽";
  if (/uzs|сум/i.test(raw)) currency = "сум";
  else if (/usd|\$/i.test(raw)) currency = "$";
  else if (/eur|€/i.test(raw)) currency = "€";
  else if (/kzt|тенге|₸/i.test(raw)) currency = "₸";
  else if (/uah|грн|₴/i.test(raw)) currency = "₴";

  return {
    amount,
    type,
    merchant,
    balance,
    cardLast4,
    currency,
    raw,
    confidence: merchant !== "Банк" ? 0.85 : 0.55,
  };
}
