import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/server-auth";
import { apiError } from "@/lib/api-errors";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  if (!rateLimit(`waitlist:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 503 });
    }
    // Idempotent upsert — never reveal whether the email already signed up.
    await prisma.waitlistEntry.upsert({
      where: { email },
      create: { email, source: String(body.source || "pricing") },
      update: {},
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
