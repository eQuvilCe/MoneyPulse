import { NextRequest, NextResponse } from "next/server";
import { loginUser, createToken, setSessionCookie, rateLimit } from "@/lib/server-auth";
import { apiError } from "@/lib/api-errors";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  if (!rateLimit(`login:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  try {
    const body = await req.json();
    const res = await loginUser(body.email || "", body.password || "");
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 401 });
    const remember = body.remember !== false; // default true
    const days = remember ? 365 : 7;
    const token = await createToken(res.user, days);
    await setSessionCookie(token, days);
    return NextResponse.json({ user: res.user });
  } catch (e) {
    return apiError(e);
  }
}
