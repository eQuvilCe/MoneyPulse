import { NextResponse } from "next/server";
import { clearSessionCookie } from "./server-auth";

/**
 * Turns a thrown error (e.g. missing DATABASE_URL, or a JWT valid for a now-deleted user)
 * into a clean JSON response instead of a raw 500 HTML page. The real error is logged
 * server-side; the client gets a message safe to show directly in the UI.
 */
export async function apiError(e: unknown): Promise<NextResponse> {
  const message = e instanceof Error ? e.message : String(e);
  console.error("[api]", message);

  // Cryptographically-valid JWT for a user row that no longer exists (deleted account,
  // or a foreign-key violation from the same situation slipping through a mutation).
  const isStaleUser =
    (e instanceof Error && e.name === "UserNotFoundError") ||
    message.includes("Foreign key constraint violated") ||
    message.includes("UserSettings_userId_fkey") ||
    (typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2003");
  if (isStaleUser) {
    await clearSessionCookie();
    return NextResponse.json(
      { error: "Сессия больше не действительна — войди снова." },
      { status: 401 }
    );
  }

  if (message.includes("DATABASE_URL")) {
    return NextResponse.json(
      { error: "Сервис временно недоступен — попробуй через минуту." },
      { status: 503 }
    );
  }
  return NextResponse.json({ error: "Что-то пошло не так. Попробуй ещё раз." }, { status: 500 });
}
