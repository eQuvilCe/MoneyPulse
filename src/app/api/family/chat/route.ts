import { NextRequest, NextResponse, after } from "next/server";
import { getAuthUser, rateLimit } from "@/lib/server-auth";
import { apiError } from "@/lib/api-errors";
import { getPrisma } from "@/lib/prisma";
import { notifyUser, esc } from "@/lib/telegram";
import { listFamilyMessages, addFamilyMessage, deleteFamilyMessage, familyErrorResponse } from "@/lib/db";
import {
  familyMessageSchema,
  familyMessageDeleteSchema,
  parseOrThrow,
  validationErrorResponse,
} from "@/lib/validation";

/** GET /api/family/chat?after=<ISO date> — the client polls this with the timestamp of its newest message. */
export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!rateLimit(`family-chat-read:${user.id}`, 90, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const after = req.nextUrl.searchParams.get("after") || undefined;
    const messages = await listFamilyMessages(user.id, after);
    return NextResponse.json({ messages });
  } catch (e) {
    const fErr = familyErrorResponse(e);
    if (fErr) return NextResponse.json({ error: fErr.error }, { status: fErr.status });
    return apiError(e);
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!rateLimit(`family-chat-send:${user.id}`, 20, 60_000)) {
    return NextResponse.json({ error: "Слишком много сообщений — подождите минуту." }, { status: 429 });
  }

  try {
    const body = parseOrThrow(familyMessageSchema, await req.json());
    const message = await addFamilyMessage(user.id, body.text);
    // After the response: tell the other family members in Telegram (those who linked it).
    after(async () => {
      const prisma = getPrisma();
      if (!prisma) return;
      const me = await prisma.familyMember.findUnique({ where: { userId: user.id } });
      if (!me) return;
      const others = await prisma.familyMember.findMany({ where: { familyId: me.familyId, userId: { not: user.id } }, select: { userId: true } });
      const text = `💬 <b>${esc(message.authorName)}</b> в семейном чате:\n${esc(message.text.slice(0, 300))}`;
      await Promise.all(others.map((o) => notifyUser(o.userId, text)));
    });
    return NextResponse.json({ message });
  } catch (e) {
    const vErr = validationErrorResponse(e);
    if (vErr) return vErr;
    const fErr = familyErrorResponse(e);
    if (fErr) return NextResponse.json({ error: fErr.error }, { status: fErr.status });
    return apiError(e);
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!rateLimit(`family-chat-del:${user.id}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = parseOrThrow(familyMessageDeleteSchema, await req.json());
    await deleteFamilyMessage(user.id, body.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const vErr = validationErrorResponse(e);
    if (vErr) return vErr;
    const fErr = familyErrorResponse(e);
    if (fErr) return NextResponse.json({ error: fErr.error }, { status: fErr.status });
    return apiError(e);
  }
}
