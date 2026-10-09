import { randomBytes } from "node:crypto";
import { getPrisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/types";

/**
 * Server-side Telegram helpers: Bot API calls, per-user notifications and the budget
 * alert that fires when an expense pushes a category across 80% / 100% of its limit.
 * Everything here is best-effort — a Telegram outage must never fail the request that
 * triggered the notification, so nothing throws.
 */

const apiBase = () => (process.env.TELEGRAM_API_BASE || "https://api.telegram.org").replace(/\/$/, "");

export const telegramConfigured = () => Boolean(process.env.TELEGRAM_BOT_TOKEN);

type TgResult = { ok: boolean; result?: unknown; description?: string };

export async function tg(method: string, body: Record<string, unknown>): Promise<TgResult | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(`${apiBase()}/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(6000),
    });
    return (await res.json().catch(() => null)) as TgResult | null;
  } catch (e) {
    console.error("[telegram]", method, e instanceof Error ? e.message : e);
    return null;
  }
}

export function sendMessage(chatId: string | number, text: string, extra: Record<string, unknown> = {}) {
  return tg("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true, ...extra });
}

/** Escape user-supplied text for parse_mode=HTML. */
export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** YYYY-MM-DD in Tashkent (UTC+5) — the bot and the cron run on UTC servers. */
export function tashkentToday(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

let cachedUsername: string | null = null;
export async function botUsername(): Promise<string | null> {
  if (process.env.TELEGRAM_BOT_USERNAME) return process.env.TELEGRAM_BOT_USERNAME.replace(/^@/, "");
  if (cachedUsername) return cachedUsername;
  const me = await tg("getMe", {});
  const name = (me?.result as { username?: string } | undefined)?.username;
  if (name) cachedUsername = name;
  return name ?? null;
}

const LINK_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // no 0/O/1/I look-alikes
export const LINK_CODE_TTL_MS = 10 * 60_000;

/**
 * One-time code for t.me/<bot>?start=<code>. Reuses the user's code while it still has a
 * couple of minutes left, so the sidebar button and the Settings card show the same one.
 */
export async function linkCodeFor(userId: string): Promise<string | null> {
  const prisma = getPrisma();
  if (!prisma) return null;
  await prisma.telegramLinkCode.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  const live = await prisma.telegramLinkCode.findFirst({
    where: { userId, expiresAt: { gt: new Date(Date.now() + 2 * 60_000) } },
    orderBy: { expiresAt: "desc" },
  });
  if (live) return live.code;
  const bytes = randomBytes(10);
  let code = "";
  for (let i = 0; i < 10; i++) code += LINK_ALPHABET[bytes[i] % LINK_ALPHABET.length];
  await prisma.telegramLinkCode.create({ data: { code, userId, expiresAt: new Date(Date.now() + LINK_CODE_TTL_MS) } });
  return code;
}

/** Send a notification to one user, if they linked Telegram and left notifications on. */
export async function notifyUser(userId: string, text: string, extra: Record<string, unknown> = {}): Promise<boolean> {
  if (!telegramConfigured()) return false;
  try {
    const prisma = getPrisma();
    if (!prisma) return false;
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { telegramId: true, tgNotify: true } });
    if (!u?.telegramId || !u.tgNotify) return false;
    const res = await sendMessage(u.telegramId, text, extra);
    return Boolean(res?.ok);
  } catch (e) {
    console.error("[telegram] notifyUser", e instanceof Error ? e.message : e);
    return false;
  }
}

/**
 * Text for a budget alert if `addedAmount` (already saved) just moved this category's
 * monthly spend across 80% or 100% of its limit; null when no threshold was crossed.
 */
export async function budgetAlertFor(userId: string, category: string, addedAmount: number): Promise<string | null> {
  try {
    const prisma = getPrisma();
    if (!prisma) return null;
    const budget = await prisma.budget.findUnique({ where: { userId_category: { userId, category } } });
    if (!budget || budget.limit <= 0) return null;
    const monthStart = tashkentToday().slice(0, 8) + "01";
    const [agg, settings] = await Promise.all([
      prisma.transaction.aggregate({ _sum: { amount: true }, where: { userId, type: "expense", category, date: { gte: monthStart } } }),
      prisma.userSettings.findUnique({ where: { userId }, select: { currency: true } }),
    ]);
    const spent = agg._sum.amount || 0;
    const before = spent - addedAmount;
    const cur = settings?.currency || "сум";
    const line = `${formatMoney(spent, cur)} из ${formatMoney(budget.limit, cur)}`;
    if (before <= budget.limit && spent > budget.limit) {
      return `🚨 <b>Бюджет «${esc(category)}» превышен</b>\n${line} — перерасход ${formatMoney(spent - budget.limit, cur)}.`;
    }
    if (before < budget.limit * 0.8 && spent >= budget.limit * 0.8 && spent <= budget.limit) {
      return `⚠️ <b>Бюджет «${esc(category)}»: ${Math.round((spent / budget.limit) * 100)}%</b>\n${line} — осталось ${formatMoney(budget.limit - spent, cur)}.`;
    }
    return null;
  } catch (e) {
    console.error("[telegram] budgetAlertFor", e instanceof Error ? e.message : e);
    return null;
  }
}
