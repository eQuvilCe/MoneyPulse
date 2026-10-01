import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, deleteAccountForUser, clearSessionCookie, rateLimit } from "@/lib/server-auth";
import { apiError } from "@/lib/api-errors";
import { accountDeleteSchema, parseOrThrow, validationErrorResponse } from "@/lib/validation";

/** Permanently deletes the account and all related data (cascades per prisma/schema.prisma). */
export async function DELETE(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!rateLimit(`delete-account:${user.id}`, 5, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const json = await req.json().catch(() => ({}));
    const body = parseOrThrow(accountDeleteSchema, json);
    const res = await deleteAccountForUser(user.id, body.password);
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
    await clearSessionCookie();
    return NextResponse.json({ ok: true });
  } catch (e) {
    const vErr = validationErrorResponse(e);
    if (vErr) return vErr;
    return apiError(e);
  }
}
