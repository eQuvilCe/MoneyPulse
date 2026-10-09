import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { parseBankSms, guessCategory } from "@/lib/smsParser";
import { addTransactionForUser, deleteTransactionForUser, updateTransactionForUser, freeTransactionCount } from "@/lib/db";
import { getPrisma } from "@/lib/prisma";
import { formatMoney, MAX_AMOUNT, DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES, CATEGORY_ICONS } from "@/lib/types";
import { rateLimit } from "@/lib/server-auth";
import { parseQuickEntry, looksLikeBankSms } from "@/lib/telegramParse";
import { tg, sendMessage, esc, tashkentToday, budgetAlertFor } from "@/lib/telegram";

/**
 * Telegram bot webhook.
 *   "кофе 25 000" / "25к такси" / "+5 млн зарплата"  → saved instantly, with Undo and category buttons
 *   forwarded bank SMS                              → parsed and saved (income too)
 *   /menu                                           → every app tab as a button that opens it inside Telegram
 *   /balance /today /week /budgets /undo /notify /unlink /help (the first five are also menu buttons)
 *   /start <code>                                   → links this chat to a MoneyPulse account (code from the app's Telegram button)
 * Always answers 200: Telegram retries anything else for hours.
 */

type LinkedUser = { id: string; name: string; plan: string; tgNotify: boolean };

const MENU = {
  keyboard: [
    [{ text: "💰 Баланс" }, { text: "📅 Сегодня" }],
    [{ text: "📊 Неделя" }, { text: "🎯 Бюджеты" }],
    [{ text: "↩️ Отменить" }, { text: "❓ Помощь" }],
    [{ text: "📱 Разделы" }],
  ],
  resize_keyboard: true,
  is_persistent: true,
  input_field_placeholder: "кофе 25 000",
};

// The app's own tabs, opened inside Telegram; /tg signs the user in and forwards to `to`.
const SECTIONS: [string, string][] = [
  ["◈ Пульс", "/"],
  ["↑ Доходы", "/income"],
  ["↓ Расходы", "/expenses"],
  ["📷 Сканер чека", "/scan"],
  ["🎯 Бюджеты", "/budgets"],
  ["🏁 Цели", "/goals"],
  ["🔁 Подписки", "/subscriptions"],
  ["👪 Семья", "/family"],
  ["🏦 Банки", "/banks"],
  ["📅 Календарь", "/calendar"],
  ["📊 Аналитика", "/analytics"],
  ["📈 Прогноз", "/forecast"],
  ["✦ AI Pulse", "/ai"],
  ["⚙️ Настройки", "/settings"],
];

function sectionsKeyboard(origin: string) {
  const rows: { text: string; web_app: { url: string } }[][] = [];
  SECTIONS.forEach(([text, path], i) => {
    if (i % 2 === 0) rows.push([]);
    rows[rows.length - 1].push({ text, web_app: { url: `${origin}/tg?to=${encodeURIComponent(path)}` } });
  });
  return { inline_keyboard: rows };
}

const HELP =
  "<b>Как записывать</b>\n" +
  "Просто напишите сумму и на что:\n" +
  "• <code>кофе 25 000</code>\n" +
  "• <code>25к такси</code>\n" +
  "• <code>1.5 млн аренда</code>\n" +
  "• <code>+5 000 000 зарплата</code> — доход (со знаком +)\n" +
  "Или перешлите SMS от банка — разберу сам.\n\n" +
  "<b>Команды</b>\n" +
  "/balance — баланс и месяц\n" +
  "/today — операции за сегодня\n" +
  "/week — расходы за 7 дней\n" +
  "/budgets — бюджеты и остаток\n" +
  "/menu — все разделы приложения\n" +
  "/undo — отменить последнюю запись\n" +
  "/notify — включить или выключить уведомления\n" +
  "/unlink — отвязать этот чат";

const NOT_LINKED =
  "Этот чат пока не привязан к аккаунту MoneyPulse.\n\n" +
  "Откройте MoneyPulse и нажмите <b>«Бот в Telegram»</b> в меню: бот откроется сам и всё подключит.";

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

function txKeyboard(txId: string) {
  return {
    inline_keyboard: [
      [
        { text: "↩️ Отменить", callback_data: `undo:${txId}` },
        { text: "🏷 Категория", callback_data: `cat:${txId}` },
      ],
    ],
  };
}

/** Ten-cell progress bar; the last cell turns red once the limit is passed. */
function bar(ratio: number): string {
  const filled = Math.max(0, Math.min(10, Math.round(ratio * 10)));
  return "▰".repeat(filled) + "▱".repeat(10 - filled) + (ratio > 1 ? " 🔴" : "");
}

/** The logo with a short greeting and a button into the app — sent on /start. */
async function sendWelcome(chatId: number, origin: string, linked: boolean, name?: string) {
  const caption = linked
    ? `<b>MoneyPulse</b>\n${name ? `${esc(name)}, всё` : "Всё"} готово — пишите траты прямо сюда.`
    : "<b>MoneyPulse</b> — учёт денег прямо в Telegram.\nЗаписывайте траты одной строкой и следите за бюджетом.";
  // web_app buttons need https, which is also the only way Telegram can fetch the logo
  if (!origin.startsWith("https://")) return sendMessage(chatId, caption);
  const reply_markup = {
    inline_keyboard: [
      [linked ? { text: "📱 Открыть MoneyPulse", web_app: { url: `${origin}/tg` } } : { text: "🔗 Открыть MoneyPulse и привязать", url: origin }],
    ],
  };
  const res = await tg("sendPhoto", { chat_id: chatId, photo: `${origin}/icons/bot-avatar.jpg`, caption, parse_mode: "HTML", reply_markup });
  if (!res?.ok) await sendMessage(chatId, caption, { reply_markup });
}

async function currencyOf(userId: string): Promise<string> {
  const s = await getPrisma()!.userSettings.findUnique({ where: { userId }, select: { currency: true } });
  return s?.currency || "сум";
}

async function monthLine(userId: string, cur: string): Promise<string> {
  const prisma = getPrisma()!;
  const monthStart = tashkentToday().slice(0, 8) + "01";
  const rows = await prisma.transaction.groupBy({ by: ["type"], _sum: { amount: true }, where: { userId, date: { gte: monthStart } } });
  const income = rows.find((r) => r.type === "income")?._sum.amount || 0;
  const expense = rows.find((r) => r.type === "expense")?._sum.amount || 0;
  return `За месяц: +${formatMoney(income, cur)} / −${formatMoney(expense, cur)}\nБаланс месяца: <b>${formatMoney(income - expense, cur)}</b>`;
}

async function save(user: LinkedUser, entry: { type: "income" | "expense"; amount: number; category: string; description: string }) {
  if (user.plan === "free" && (await freeTransactionCount(user.id)) >= 200) {
    return { text: "На бесплатном тарифе лимит 200 операций — он исчерпан. Удалите старые записи в приложении или дождитесь Pro.", extra: {} };
  }
  const tx = await addTransactionForUser(user.id, { ...entry, date: tashkentToday() });
  const cur = await currencyOf(user.id);
  const sign = entry.type === "income" ? "+" : "−";
  let text =
    `✅ <b>${sign}${formatMoney(entry.amount, cur)}</b> · ${CATEGORY_ICONS[entry.category] || "📦"} ${esc(entry.category)}\n` +
    `${esc(entry.description)}\n\n${await monthLine(user.id, cur)}`;
  if (entry.type === "expense") {
    const alert = await budgetAlertFor(user.id, entry.category, entry.amount);
    if (alert) text += `\n\n${alert}`;
  }
  return { text, extra: { reply_markup: txKeyboard(tx.id) } };
}

export async function POST(req: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) {
    // Refuse to run unauthenticated — without a shared secret anyone could POST fabricated
    // "Telegram updates" and inject transactions into a linked user's account.
    console.error("[telegram webhook] TELEGRAM_WEBHOOK_SECRET is not set — rejecting webhook");
    return NextResponse.json({ error: "Telegram webhook not configured" }, { status: 503 });
  }
  if (!safeEqual(req.headers.get("x-telegram-bot-api-secret-token") || "", secret)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const prisma = getPrisma();
  if (!process.env.TELEGRAM_BOT_TOKEN || !prisma) return NextResponse.json({ ok: true });

  let update: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- untyped Telegram payload
  try {
    update = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const cb = update.callback_query;
  const message = update.message || update.edited_message;
  const from = cb?.from || message?.from;
  const fromId = from?.id ? String(from.id) : null;
  // Only private chats: in a group, anyone could read the balance the bot replies with.
  const chat = cb?.message?.chat || message?.chat;
  if (!fromId || !chat || chat.type !== "private") return NextResponse.json({ ok: true });

  // Per-sender limit (the shared secret already proves the request comes from Telegram).
  if (!rateLimit(`tg:${fromId}`, 40, 60_000)) return NextResponse.json({ ok: true });

  const chatId = chat.id;
  const origin = req.nextUrl.origin;

  try {
    const user = (await prisma.user.findUnique({
      where: { telegramId: fromId },
      select: { id: true, name: true, plan: true, tgNotify: true },
    })) as LinkedUser | null;

    // ——— inline buttons ———
    if (cb) {
      const [action, txId, arg] = String(cb.data || "").split(":");
      const msgId = cb.message?.message_id;
      let toast = "";
      if (!user) {
        toast = "Чат не привязан к аккаунту";
      } else if (action === "undo" && txId) {
        const owned = await prisma.transaction.findFirst({ where: { id: txId, userId: user.id } });
        if (owned) {
          await deleteTransactionForUser(user.id, txId);
          toast = "Отменено";
          await tg("editMessageText", { chat_id: chatId, message_id: msgId, text: `↩️ Запись отменена: ${owned.type === "income" ? "+" : "−"}${formatMoney(owned.amount, await currencyOf(user.id))} · ${owned.description}` });
        } else {
          toast = "Запись уже удалена";
          await tg("editMessageReplyMarkup", { chat_id: chatId, message_id: msgId, reply_markup: { inline_keyboard: [] } });
        }
      } else if (action === "cat" && txId) {
        const owned = await prisma.transaction.findFirst({ where: { id: txId, userId: user.id } });
        if (!owned) toast = "Запись не найдена";
        else {
          const cats = owned.type === "income" ? DEFAULT_INCOME_CATEGORIES : DEFAULT_EXPENSE_CATEGORIES;
          const rows: { text: string; callback_data: string }[][] = [];
          cats.forEach((c, i) => {
            if (i % 3 === 0) rows.push([]);
            rows[rows.length - 1].push({ text: `${CATEGORY_ICONS[c] || ""} ${c}`, callback_data: `setcat:${txId}:${i}` });
          });
          await tg("editMessageReplyMarkup", { chat_id: chatId, message_id: msgId, reply_markup: { inline_keyboard: rows } });
        }
      } else if (action === "setcat" && txId) {
        const owned = await prisma.transaction.findFirst({ where: { id: txId, userId: user.id } });
        const cats = owned?.type === "income" ? DEFAULT_INCOME_CATEGORIES : DEFAULT_EXPENSE_CATEGORIES;
        const category = cats[Number(arg)];
        if (!owned || !category) toast = "Запись не найдена";
        else {
          await updateTransactionForUser(user.id, txId, { category });
          const cur = await currencyOf(user.id);
          toast = `Категория: ${category}`;
          await tg("editMessageText", {
            chat_id: chatId,
            message_id: msgId,
            parse_mode: "HTML",
            text: `✅ <b>${owned.type === "income" ? "+" : "−"}${formatMoney(owned.amount, cur)}</b> · ${CATEGORY_ICONS[category] || "📦"} ${esc(category)}\n${esc(owned.description)}`,
            reply_markup: txKeyboard(txId),
          });
        }
      }
      await tg("answerCallbackQuery", { callback_query_id: cb.id, text: toast });
      return NextResponse.json({ ok: true });
    }

    if (!message) return NextResponse.json({ ok: true });
    const text = message.text ? String(message.text).trim().slice(0, 1000) : "";
    const cmd = text.startsWith("/") ? text.split(/[\s@]/)[0].toLowerCase() : "";
    let reply = "";
    let extra: Record<string, unknown> = { reply_markup: MENU };

    // ——— linking ———
    if (cmd === "/start") {
      const code = text.split(/\s+/)[1]?.trim().toUpperCase();
      if (code) {
        if (!rateLimit(`tg-link:${fromId}`, 6, 10 * 60_000)) {
          reply = "Слишком много попыток. Попробуйте через 10 минут.";
        } else {
          const row = await prisma.telegramLinkCode.findUnique({ where: { code } });
          if (!row || row.expiresAt < new Date()) {
            reply = "Код привязки не найден или устарел. Нажмите «Бот в Telegram» в приложении ещё раз — придёт новый.";
          } else {
            await prisma.$transaction([
              // this Telegram account may have been linked to another MoneyPulse account before
              prisma.user.updateMany({ where: { telegramId: fromId, NOT: { id: row.userId } }, data: { telegramId: null, telegramLinkedAt: null } }),
              prisma.user.update({ where: { id: row.userId }, data: { telegramId: fromId, telegramLinkedAt: new Date() } }),
              prisma.telegramLinkCode.deleteMany({ where: { userId: row.userId } }),
            ]);
            const linked = await prisma.user.findUnique({ where: { id: row.userId }, select: { name: true } });
            await sendWelcome(chatId, origin, true, linked?.name.split(" ")[0]);
            reply = `✅ Аккаунт ${esc(linked?.name || "")} привязан.\n\n${HELP}`;
          }
        }
      } else {
        await sendWelcome(chatId, origin, Boolean(user), user?.name.split(" ")[0]);
        reply = user ? HELP : NOT_LINKED;
      }
    } else if (cmd === "/help" || text === "❓ Помощь") {
      reply = user ? HELP : `${NOT_LINKED}\n\n${HELP}`;
    } else if (!user) {
      reply = NOT_LINKED;
    } else if (cmd === "/balance" || text === "💰 Баланс") {
      const cur = await currencyOf(user.id);
      const all = await prisma.transaction.groupBy({ by: ["type"], _sum: { amount: true }, where: { userId: user.id } });
      const total = (all.find((r) => r.type === "income")?._sum.amount || 0) - (all.find((r) => r.type === "expense")?._sum.amount || 0);
      reply = `💰 Всего: <b>${formatMoney(total, cur)}</b>\n\n${await monthLine(user.id, cur)}`;
    } else if (cmd === "/today" || text === "📅 Сегодня") {
      const cur = await currencyOf(user.id);
      const rows = await prisma.transaction.findMany({ where: { userId: user.id, date: tashkentToday() }, orderBy: { createdAt: "desc" }, take: 30 });
      if (rows.length === 0) reply = "Сегодня записей ещё нет. Напишите, например: <code>обед 45 000</code>";
      else {
        const spent = rows.filter((r) => r.type === "expense").reduce((s, r) => s + r.amount, 0);
        const got = rows.filter((r) => r.type === "income").reduce((s, r) => s + r.amount, 0);
        reply =
          `📅 <b>Сегодня</b>: −${formatMoney(spent, cur)}${got ? ` / +${formatMoney(got, cur)}` : ""}\n\n` +
          rows.map((r) => `${CATEGORY_ICONS[r.category] || "📦"} ${esc(r.description.slice(0, 40))} — ${r.type === "income" ? "+" : "−"}${formatMoney(r.amount, cur)}`).join("\n");
      }
    } else if (cmd === "/week" || text === "📊 Неделя") {
      const cur = await currencyOf(user.id);
      const rows = await prisma.transaction.groupBy({
        by: ["category"],
        _sum: { amount: true },
        where: { userId: user.id, type: "expense", date: { gte: tashkentToday(-6) } },
      });
      const sorted = rows.map((r) => ({ c: r.category, v: r._sum.amount || 0 })).sort((a, b) => b.v - a.v);
      const total = sorted.reduce((s, r) => s + r.v, 0);
      reply = total
        ? `📊 <b>Расходы за 7 дней</b>: ${formatMoney(total, cur)}\n\n` +
          sorted.slice(0, 8).map((r) => `${CATEGORY_ICONS[r.c] || "📦"} ${esc(r.c)} — ${formatMoney(r.v, cur)} (${Math.round((r.v / total) * 100)}%)`).join("\n")
        : "За последние 7 дней расходов нет.";
    } else if (cmd === "/menu" || text === "📱 Разделы") {
      if (origin.startsWith("https://")) {
        reply = "📱 <b>Разделы MoneyPulse</b>\nОткроются прямо здесь, в Telegram.";
        extra = { reply_markup: sectionsKeyboard(origin) };
      } else reply = "Разделы открываются только на опубликованном сайте (нужен https).";
    } else if (cmd === "/budgets" || text === "🎯 Бюджеты") {
      const cur = await currencyOf(user.id);
      const budgets = await prisma.budget.findMany({ where: { userId: user.id, limit: { gt: 0 } } });
      if (budgets.length === 0) reply = "Бюджетов пока нет. Задайте лимиты в приложении: MoneyPulse → Бюджеты.";
      else {
        const spent = await prisma.transaction.groupBy({
          by: ["category"],
          _sum: { amount: true },
          where: { userId: user.id, type: "expense", date: { gte: tashkentToday().slice(0, 8) + "01" }, category: { in: budgets.map((b) => b.category) } },
        });
        const of = (c: string) => spent.find((r) => r.category === c)?._sum.amount || 0;
        reply =
          "🎯 <b>Бюджеты на месяц</b>\n\n" +
          budgets
            .map((b) => ({ b, s: of(b.category) }))
            .sort((x, y) => y.s / y.b.limit - x.s / x.b.limit)
            .map(({ b, s }) => {
              const left = b.limit - s;
              return (
                `${CATEGORY_ICONS[b.category] || "📦"} <b>${esc(b.category)}</b> · ${Math.round((s / b.limit) * 100)}%\n` +
                `${bar(s / b.limit)}\n` +
                `${formatMoney(s, cur)} из ${formatMoney(b.limit, cur)} — ${left >= 0 ? `осталось ${formatMoney(left, cur)}` : `перерасход ${formatMoney(-left, cur)}`}`
              );
            })
            .join("\n\n");
      }
    } else if (cmd === "/undo" || text === "↩️ Отменить") {
      // only something recorded in the last day — /undo must never eat an old entry by surprise
      const last = await prisma.transaction.findFirst({
        where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 86_400_000) } },
        orderBy: { createdAt: "desc" },
      });
      if (!last) reply = "За последние сутки записей нет — отменять нечего.";
      else {
        await deleteTransactionForUser(user.id, last.id);
        reply = `↩️ Отменено: ${last.type === "income" ? "+" : "−"}${formatMoney(last.amount, await currencyOf(user.id))} · ${esc(last.description)}`;
      }
    } else if (cmd === "/notify") {
      const next = !user.tgNotify;
      await prisma.user.update({ where: { id: user.id }, data: { tgNotify: next } });
      reply = next
        ? "🔔 Уведомления включены: бюджеты, семейный чат и вечерний итог."
        : "🔕 Уведомления выключены. Включить снова — /notify";
    } else if (cmd === "/unlink") {
      await prisma.user.update({ where: { id: user.id }, data: { telegramId: null, telegramLinkedAt: null } });
      reply = "Чат отвязан. Данные в MoneyPulse остались на месте. Привязать снова — кнопка «Бот в Telegram» в приложении.";
      extra = { reply_markup: { remove_keyboard: true } };
    } else if (cmd === "/expense" || cmd === "/income") {
      const entry = parseQuickEntry((cmd === "/income" ? "+" : "") + text.replace(/^\/\w+\s*/, ""));
      if (!entry) reply = "Формат: <code>/expense 25000 кофе</code>";
      else ({ text: reply, extra } = await save(user, entry));
    } else if (cmd) {
      reply = `Не знаю такую команду.\n\n${HELP}`;
    } else if (message.photo || message.document) {
      reply = "📷 Фото чеков распознаются в приложении: MoneyPulse → Сканер. Сюда можно прислать сумму текстом или переслать SMS банка.";
    } else if (!text) {
      reply = "Напишите сумму и на что, например: <code>кофе 25 000</code>";
    } else if (looksLikeBankSms(text)) {
      const p = parseBankSms(text);
      if (!p || !(p.amount > 0) || p.amount > MAX_AMOUNT) {
        reply = "Похоже на SMS банка, но сумму разобрать не получилось. Напишите вручную: <code>кофе 25 000</code>";
      } else {
        ({ text: reply, extra } = await save(user, {
          type: p.type === "income" ? "income" : "expense",
          amount: p.amount,
          category: p.type === "income" ? "другое" : guessCategory(p.merchant),
          description: p.merchant.slice(0, 120),
        }));
      }
    } else {
      const entry = parseQuickEntry(text);
      if (!entry) reply = "Не вижу суммы. Напишите, например: <code>кофе 25 000</code> или <code>+5 млн зарплата</code>";
      else ({ text: reply, extra } = await save(user, entry));
    }

    if (reply) await sendMessage(chatId, reply, extra);
  } catch (e) {
    console.error("[telegram webhook]", e instanceof Error ? e.message : e);
    await sendMessage(chatId, "Техническая заминка — попробуйте ещё раз через минуту.");
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ service: "MoneyPulse Telegram", configured: Boolean(process.env.TELEGRAM_BOT_TOKEN) });
}
