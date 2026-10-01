import { NextRequest, NextResponse } from "next/server";
import {
  getAuthUser,
  getSessionToken,
  remainingSessionDays,
  updateProfile,
  changePassword,
  createToken,
  setSessionCookie,
  rateLimit,
} from "@/lib/server-auth";
import { apiError } from "@/lib/api-errors";
import { profileUpdateSchema, parseOrThrow, validationErrorResponse } from "@/lib/validation";

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Keyed by user id, not IP — IP-keying throttles everyone behind the same NAT/proxy together.
  if (!rateLimit(`profile:${user.id}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = parseOrThrow(profileUpdateSchema, await req.json());

    if (body.newPassword) {
      const pwRes = await changePassword(user.id, body.currentPassword!, body.newPassword);
      if (!pwRes.ok) return NextResponse.json({ error: pwRes.error }, { status: 400 });
    }

    let resultUser = user;
    if (body.name !== undefined || body.email !== undefined) {
      const res = await updateProfile(user.id, { name: body.name, email: body.email });
      if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
      resultUser = res.user;
    }

    // JWT carries name/email as claims — re-issue it, preserving the remaining remember-me duration.
    const currentToken = await getSessionToken();
    const days = currentToken ? await remainingSessionDays(currentToken) : 7;
    const token = await createToken(resultUser, days);
    await setSessionCookie(token, days);

    return NextResponse.json({ user: resultUser });
  } catch (e) {
    const vErr = validationErrorResponse(e);
    if (vErr) return vErr;
    return apiError(e);
  }
}
