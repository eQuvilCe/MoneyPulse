import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, rateLimit } from "@/lib/server-auth";
import { getPrisma } from "@/lib/prisma";
import { botUsername, telegramConfigured, linkCodeFor } from "@/lib/telegram";

/**
 * "Open in Telegram" — a plain link target, so one tap lands in the bot with no popup
 * blocker in the way. A linked user goes straight to the chat; anyone else gets a
 * one-time start code in the URL, and pressing Start in Telegram links the account.
 */
export async function GET(req: NextRequest) {
  const to = (url: string) => {
    const res = NextResponse.redirect(new URL(url, req.url));
    res.headers.set("Cache-Control", "no-store");
    return res;
  };

  const user = await getAuthUser();
  if (!user) return to("/");
  if (!telegramConfigured()) return to("/settings");

  try {
    const bot = await botUsername();
    const prisma = getPrisma();
    if (!bot || !prisma) return to("/settings");
    const chat = `https://t.me/${bot}`;
    const row = await prisma.user.findUnique({ where: { id: user.id }, select: { telegramId: true } });
    if (row?.telegramId) return to(chat);
    if (!rateLimit(`tg-go:${user.id}`, 20, 10 * 60_000)) return to(chat);
    const code = await linkCodeFor(user.id);
    return to(code ? `${chat}?start=${code}` : chat);
  } catch (e) {
    console.error("[telegram go]", e instanceof Error ? e.message : e);
    return to("/settings");
  }
}
