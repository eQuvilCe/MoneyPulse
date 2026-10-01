import { NextRequest, NextResponse } from "next/server";
import { verifyTelegramInitData } from "@/lib/telegramAuth";
import { getAuthUser, createToken, setSessionCookie, rateLimit } from "@/lib/server-auth";
import { getPrisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-errors";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  if (!rateLimit(`tg-verify:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: "Telegram bot is not configured" }, { status: 503 });
  }

  try {
    const body = await req.json();
    const check = verifyTelegramInitData(String(body.initData || ""), botToken);
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 401 });
    }

    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 503 });

    const telegramId = String(check.user.id);
    const displayName =
      [check.user.first_name, check.user.last_name].filter(Boolean).join(" ") ||
      check.user.username ||
      "Telegram";

    // Already have a MoneyPulse session (opened the WebApp while logged in on web) — link it.
    const currentUser = await getAuthUser();
    if (currentUser) {
      const existingLink = await prisma.user.findUnique({ where: { telegramId } });
      if (existingLink && existingLink.id !== currentUser.id) {
        return NextResponse.json(
          { error: "Этот Telegram уже привязан к другому аккаунту" },
          { status: 409 }
        );
      }
      await prisma.user.update({
        where: { id: currentUser.id },
        data: { telegramId, telegramLinkedAt: new Date() },
      });
      return NextResponse.json({ linked: true, user: currentUser });
    }

    // Not logged in — look up an account already linked to this Telegram id and auto-login.
    const linkedUser = await prisma.user.findUnique({ where: { telegramId } });
    if (linkedUser) {
      const authUser = {
        id: linkedUser.id,
        name: linkedUser.name,
        email: linkedUser.email,
        createdAt: linkedUser.createdAt.toISOString(),
        plan: (linkedUser.plan as "free" | "pro" | "demo") || "free",
      };
      const token = await createToken(authUser, 365);
      await setSessionCookie(token, 365);
      return NextResponse.json({ linked: true, user: authUser });
    }

    // No account linked yet — client should offer login/register, then call this again to link.
    return NextResponse.json({
      linked: false,
      telegramUser: { id: check.user.id, name: displayName },
    });
  } catch (e) {
    return apiError(e);
  }
}
