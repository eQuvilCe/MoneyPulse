import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { formatMoney, CATEGORY_ICONS } from "@/lib/types";
import { sendMessage, esc, tashkentToday, telegramConfigured } from "@/lib/telegram";

/**
 * Evening Telegram digest — scheduled in vercel.json for 15:00 UTC (20:00 Tashkent).
 * Users who logged something today get a short summary; the others get a nudge.
 * Vercel Cron authenticates with "Authorization: Bearer $CRON_SECRET".
 */
export const maxDuration = 60;

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from(req.headers.get("authorization") || "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const prisma = getPrisma();
  if (!prisma || !telegramConfigured()) return NextResponse.json({ ok: true, sent: 0, skipped: "not configured" });

  const today = tashkentToday();
  const users = await prisma.user.findMany({
    where: { telegramId: { not: null }, tgNotify: true },
    select: { id: true, name: true, telegramId: true, settings: { select: { currency: true } } },
    take: 2000,
  });

  let sent = 0;
  // small batches: Telegram allows ~30 messages a second across different chats
  for (let i = 0; i < users.length; i += 20) {
    await Promise.all(
      users.slice(i, i + 20).map(async (u) => {
        const cur = u.settings?.currency || "сум";
        const rows = await prisma.transaction.findMany({ where: { userId: u.id, date: today }, select: { type: true, amount: true, category: true } });
        let text: string;
        if (rows.length === 0) {
          text = `🌙 ${esc(u.name.split(" ")[0])}, за сегодня записей нет.\nНапишите сюда трату — например <code>ужин 60 000</code> — это займёт пять секунд.`;
        } else {
          const spent = rows.filter((r) => r.type === "expense").reduce((s, r) => s + r.amount, 0);
          const got = rows.filter((r) => r.type === "income").reduce((s, r) => s + r.amount, 0);
          const byCat = new Map<string, number>();
          for (const r of rows) if (r.type === "expense") byCat.set(r.category, (byCat.get(r.category) || 0) + r.amount);
          const top = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0];
          text =
            `🌙 <b>Итог дня</b>\nПотрачено: ${formatMoney(spent, cur)}${got ? `\nПолучено: ${formatMoney(got, cur)}` : ""}\nОпераций: ${rows.length}` +
            (top ? `\nБольше всего: ${CATEGORY_ICONS[top[0]] || "📦"} ${esc(top[0])} — ${formatMoney(top[1], cur)}` : "");
        }
        const res = await sendMessage(u.telegramId!, text, { disable_notification: rows.length > 0 });
        if (res?.ok) sent += 1;
        // the user blocked the bot or deleted the chat — stop writing to it
        else if (res && /blocked|deactivated|chat not found/i.test(res.description || "")) {
          await prisma.user.update({ where: { id: u.id }, data: { telegramId: null, telegramLinkedAt: null } }).catch(() => {});
        }
      })
    );
  }
  return NextResponse.json({ ok: true, users: users.length, sent });
}
