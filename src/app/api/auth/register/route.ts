import { NextRequest, NextResponse } from "next/server";
import { registerUser, createToken, setSessionCookie, rateLimit } from "@/lib/server-auth";
import { getEmptyData, writeStore } from "@/lib/db";
import { apiError } from "@/lib/api-errors";
import { registerSchema, parseOrThrow, validationErrorResponse } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  if (!rateLimit(`reg:${ip}`, 5, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  try {
    const body = parseOrThrow(registerSchema, await req.json());
    const res = await registerUser(body.name, body.email, body.password);
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
    await writeStore(res.user.id, getEmptyData());
    const days = body.remember !== false ? 365 : 7;
    const token = await createToken(res.user, days);
    await setSessionCookie(token, days);
    return NextResponse.json({ user: res.user });
  } catch (e) {
    const vErr = validationErrorResponse(e);
    if (vErr) return vErr;
    return apiError(e);
  }
}
