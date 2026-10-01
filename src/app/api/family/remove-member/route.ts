import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, rateLimit } from "@/lib/server-auth";
import { apiError } from "@/lib/api-errors";
import { removeFamilyMember, familyErrorResponse } from "@/lib/db";
import { removeFamilyMemberSchema, parseOrThrow, validationErrorResponse } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!rateLimit(`family-remove:${user.id}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = parseOrThrow(removeFamilyMemberSchema, await req.json());
    await removeFamilyMember(user.id, body.userId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const vErr = validationErrorResponse(e);
    if (vErr) return vErr;
    const fErr = familyErrorResponse(e);
    if (fErr) return NextResponse.json({ error: fErr.error }, { status: fErr.status });
    return apiError(e);
  }
}
