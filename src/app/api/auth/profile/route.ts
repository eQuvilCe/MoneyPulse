import { NextRequest, NextResponse } from "next/server";
import {
  getAuthUser,
  getSessionToken,
  remainingSessionDays,
  updateProfile,
  createToken,
  setSessionCookie,
  rateLimit,
} from "@/lib/server-auth";
import { apiError } from "@/lib/api-errors";

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = req.headers.get("x-forwarded-for") || "local";
  if (!rateLimit(`profile:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await req.json();
    const res = await updateProfile(user.id, { name: body.name, email: body.email });
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });

    // JWT carries name/email as claims — re-issue it, preserving the remaining remember-me duration.
    const currentToken = await getSessionToken();
    const days = currentToken ? await remainingSessionDays(currentToken) : 7;
    const token = await createToken(res.user, days);
    await setSessionCookie(token, days);

    return NextResponse.json({ user: res.user });
  } catch (e) {
    return apiError(e);
  }
}
