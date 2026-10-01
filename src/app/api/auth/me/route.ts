import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/server-auth";

export async function GET() {
  const user = await getAuthUser();
  // Always 200 — client treats null as logged-out without noisy 401
  return NextResponse.json({ user: user ?? null });
}
