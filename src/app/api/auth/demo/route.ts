import { NextRequest, NextResponse } from "next/server";
import { createDemoUser, createToken, setSessionCookie, rateLimit } from "@/lib/server-auth";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  if (!rateLimit(`demo:${ip}`, 15, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const user = await createDemoUser();
  const token = await createToken(user);
  await setSessionCookie(token);
  return NextResponse.json({ user });
}
