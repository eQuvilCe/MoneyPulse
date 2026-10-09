import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, rateLimit } from "@/lib/server-auth";
import { getPrisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-errors";
import { botUsername, telegramConfigured, notifyUser, linkCodeFor, LINK_CODE_TTL_MS } from "@/lib/telegram";

/** Link status for the Settings card. */
export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ configured: false, linked: false, notify: false });
    const row = await prisma.user.findUnique({ where: { id: user.id }, select: { telegramId: true, tgNotify: true } });
    return NextResponse.json({
      configured: telegramConfigured(),
      linked: Boolean(row?.telegramId),
      notify: Boolean(row?.tgNotify),
      bot: telegramConfigured() ? await botUsername() : null,
    });
  } catch (e) {
    return apiError(e);
  }
}

/** Create a one-time code; the client opens t.me/<bot>?start=<code>. */
export async function POST() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateLimit(`tg-link-code:${user.id}`, 6, 10 * 60_000)) {
    return NextResponse.json({ error: "Слишком много попыток — подождите 10 минут." }, { status: 429 });
  }
  if (!telegramConfigured()) return NextResponse.json({ error: "Telegram-бот ещё не подключён." }, { status: 503 });
  try {
    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 503 });
    const bot = await botUsername();
    if (!bot) return NextResponse.json({ error: "Не удалось связаться с Telegram." }, { status: 502 });
    const code = await linkCodeFor(user.id);
    if (!code) return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 503 });
    return NextResponse.json({ code, bot, url: `https://t.me/${bot}?start=${code}`, expiresInSec: LINK_CODE_TTL_MS / 1000 });
  } catch (e) {
    return apiError(e);
  }
}

/** { notify: boolean } toggles notifications; { test: true } sends a test message. */
export async function PATCH(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateLimit(`tg-link-patch:${user.id}`, 12, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  try {
    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 503 });
    const body = (await req.json().catch(() => ({}))) as { notify?: unknown; test?: unknown };
    if (typeof body.notify === "boolean") {
      await prisma.user.update({ where: { id: user.id }, data: { tgNotify: body.notify } });
    }
    if (body.test === true) {
      const sent = await notifyUser(user.id, "🔔 Тестовое уведомление MoneyPulse. Если вы это видите — всё работает.");
      if (!sent) return NextResponse.json({ error: "Не удалось отправить. Проверьте, что чат привязан и уведомления включены." }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}

export async function DELETE() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 503 });
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { telegramId: null, telegramLinkedAt: null } }),
      prisma.telegramLinkCode.deleteMany({ where: { userId: user.id } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
