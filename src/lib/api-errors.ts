import { NextResponse } from "next/server";

/**
 * Turns a thrown error (e.g. missing DATABASE_URL) into a clean JSON response instead of
 * a raw 500 HTML page. The real error is logged server-side; the client gets a message
 * safe to show directly in a login/signup form, not an internal env-var name.
 */
export function apiError(e: unknown): NextResponse {
  const message = e instanceof Error ? e.message : String(e);
  console.error("[api]", message);
  if (message.includes("DATABASE_URL")) {
    return NextResponse.json(
      { error: "Сервис временно недоступен — попробуй через минуту." },
      { status: 503 }
    );
  }
  return NextResponse.json({ error: "Что-то пошло не так. Попробуй ещё раз." }, { status: 500 });
}
