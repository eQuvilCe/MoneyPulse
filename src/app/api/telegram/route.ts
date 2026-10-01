import { NextRequest, NextResponse } from "next/server";
import { parseBankSms, guessCategory } from "@/lib/smsParser";

/**
 * Telegram Bot webhook
 * - Forward bank SMS text → auto-parse
 * - /expense 500 coffee
 * - Photo receipts → tell user to use WebApp /scan (or OCR with linked account)
 */
export async function POST(req: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const update = await req.json();
  const message = update.message || update.edited_message;
  if (!message || !token) {
    return NextResponse.json({ ok: true });
  }

  const chatId = message.chat.id;
  const text = message.text ? String(message.text).trim() : "";
  let reply = "";

  if (message.photo) {
    reply =
      "📷 Чек получен. Открой WebApp → Сканер, или привяжи аккаунт для авто-OCR.\n" +
      "Пока быстрее: перешли SMS от банка текстом — разберу сумму сам.";
  } else if (text.startsWith("/start")) {
    reply =
      "MoneyPulse Bot 💚\n\n" +
      "• Перешли SMS от банка — распарсю расход\n" +
      "• /expense 250 кофе — ручная запись\n" +
      "• WebApp кнопка внизу — полный интерфейс\n\n" +
      "Привязка telegram_id → user (Prisma) — для записи в твой аккаунт на проде.";
  } else if (text.startsWith("/expense")) {
    const parts = text.replace(/^\/expense\s*/i, "").trim().split(/\s+/);
    const amount = parseFloat(parts[0]);
    const desc = parts.slice(1).join(" ") || "Telegram";
    reply = !amount
      ? "Формат: /expense 500 кофе"
      : `Черновик: −${amount} «${desc}». После привязки аккаунта уйдёт в MoneyPulse.`;
  } else if (text.length > 12) {
    const p = parseBankSms(text);
    if (p) {
      const cat = guessCategory(p.merchant);
      reply =
        `Распознал:\n` +
        `${p.type === "expense" ? "Расход" : "Доход"} ${p.amount} ${p.currency || ""}\n` +
        `${p.merchant} · ${cat}\n` +
        `confidence ${Math.round(p.confidence * 100)}%\n\n` +
        `На проде с привязкой аккаунта — сразу в базу. Сейчас: подтверди в WebApp / Банки.`;
    } else {
      reply =
        "Не похоже на SMS банка. Пример:\n" +
        "Karta ****1234: oplata 45,000 UZS, Korzinka. Ostatok: 1,200,000";
    }
  } else {
    reply = "Перешли SMS банка или /expense 100 кофе";
  }

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: reply }),
    });
  } catch {
    /* ignore */
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({
    service: "MoneyPulse Telegram",
    configured: Boolean(process.env.TELEGRAM_BOT_TOKEN),
  });
}
