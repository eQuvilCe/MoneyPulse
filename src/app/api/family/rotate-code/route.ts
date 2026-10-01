import { NextResponse } from "next/server";
import { getAuthUser, rateLimit } from "@/lib/server-auth";
import { apiError } from "@/lib/api-errors";
import { rotateInviteCode, familyErrorResponse } from "@/lib/db";

export async function POST() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!rateLimit(`family-rotate:${user.id}`, 5, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const inviteCode = await rotateInviteCode(user.id);
    return NextResponse.json({ inviteCode });
  } catch (e) {
    const fErr = familyErrorResponse(e);
    if (fErr) return NextResponse.json({ error: fErr.error }, { status: fErr.status });
    return apiError(e);
  }
}
