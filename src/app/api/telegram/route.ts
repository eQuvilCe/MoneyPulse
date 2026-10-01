import { NextRequest, NextResponse } from "next/server";
import { parseBankSms, guessCategory } from "@/lib/smsParser";
import { addTransactionForUser, readStore } from "@/lib/db";
import { getPrisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/types";

/**
 * Telegram Bot webhook
 * - Forward bank SMS text → auto-parse → saved straight to the linked MoneyPulse account
 * - /expense 500 coffee → same
 * - Photo receipts → tell user to use WebApp /scan (OCR needs the image, not available here)
 * - Unlinked chats get pointed at /tg to link their account first
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
  const fromId = message.from?.id ? String(message.from.id) : null;
  const text = message.text ? String(message.text).trim() : "";
  let reply = "";

  let linkedUser: Awaited<ReturnType<NonNullable<ReturnType<typeof getPrisma>>["user"]["findUnique"]>> = null;
  try {
    const prisma = getPrisma();
    linkedUser = prisma && fromId ? await prisma.user.findUnique({ where: { telegramId: fromId } }) : null;
  } catch (e) {
    console.error("[telegram webhook]", e);
  }

  const LINK_HINT =
    "\n\nАккаунт не привязан — открой WebApp (кнопка у бота) и зайди в MoneyPulse, чтобы операции сохранялись.";

  async function saveExpense(amount: number, category: string, description: string) {
    if (!linkedUser) return null;
    await addTransactionForUser(linkedUser.id, {
      type: "expense",
      amount,
      category,
      description,
      date: new Date().toISOString().slice(0, 10),
    });
    const data = await readStore(linkedUser.id);
    const income = data.transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = data.transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    return formatMoney(income - expense, data.settings.currency);
  }

  try {
    if (message.photo) {
      reply =
        "📷 Чек получен. Открой WebApp → Сканер для авто-распознавания.\n" +
        "Быстрее: перешли SMS от банка текстом — разберу сумму сам.";
    } else if (text.startsWith("/start")) {
      reply =
        "MoneyPulse Bot 💚\n\n" +
        "• Перешли SMS от банка — запишу расход\n" +
        "• /expense 250 кофе — ручная запись\n" +
        "• WebApp кнопка внизу — полный интерфейс" +
        (linkedUser ? "\n\n✅ Аккаунт привязан — всё, что пришлёшь, сохраняется." : LINK_HINT);
    } else if (text.startsWith("/expense")) {
      const parts = text.replace(/^\/expense\s*/i, "").trim().split(/\s+/);
      const amount = parseFloat(parts[0]);
      const desc = parts.slice(1).join(" ") || "Telegram";
      if (!amount) {
        reply = "Формат: /expense 500 кофе";
      } else if (!linkedUser) {
        reply = `Черновик: −${amount} «${desc}».${LINK_HINT}`;
      } else {
        const balance = await saveExpense(amount, "другое", desc);
        reply = `✅ Записано: −${amount} «${desc}». Баланс: ${balance}`;
      }
    } else if (text.length > 12) {
      const p = parseBankSms(text);
      if (!p) {
        reply =
          "Не похоже на SMS банка. Пример:\n" +
          "Karta ****1234: oplata 45,000 UZS, Korzinka. Ostatok: 1,200,000";
      } else {
        const cat = guessCategory(p.merchant);
        const header =
          `Распознал:\n` +
          `${p.type === "expense" ? "Расход" : "Доход"} ${p.amount} ${p.currency || ""}\n` +
          `${p.merchant} · ${cat}\n` +
          `confidence ${Math.round(p.confidence * 100)}%`;
        if (!linkedUser) {
          reply = `${header}${LINK_HINT}`;
        } else if (p.type === "expense") {
          const balance = await saveExpense(p.amount, cat, p.merchant);
          reply = `${header}\n\n✅ Сохранено. Баланс: ${balance}`;
        } else {
          reply = `${header}\n\nДоходы пока подтверди в WebApp / Банки.`;
        }
      }
    } else {
      reply = "Перешли SMS банка или /expense 100 кофе";
    }
  } catch (e) {
    console.error("[telegram webhook]", e);
    reply = "Техническая заминка — попробуй ещё раз через минуту.";
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
