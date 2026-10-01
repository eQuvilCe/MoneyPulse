import { NextResponse } from "next/server";

/** Turns a thrown error (e.g. missing DATABASE_URL) into a clean JSON response instead of a raw 500 HTML page. */
export function apiError(e: unknown): NextResponse {
  const message = e instanceof Error ? e.message : "Internal error";
  const status = message.includes("DATABASE_URL") ? 503 : 500;
  return NextResponse.json({ error: message }, { status });
}
