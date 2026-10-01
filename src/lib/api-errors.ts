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

  const prismaCode =
    typeof e === "object" && e !== null && "code" in e ? (e as { code?: string }).code : undefined;
  const fkField =
    typeof e === "object" && e !== null && "meta" in e
      ? String((e as { meta?: { field_name?: string } }).meta?.field_name ?? "")
      : "";

  // Cryptographically-valid JWT for a user row that no longer exists (deleted account).
  // Scoped to the userId FK specifically — other FK violations (e.g. an invalid accountId
  // on a transaction) are a 400 bad-request, not a reason to log the user out.
  const isStaleUser =
    (e instanceof Error && e.name === "UserNotFoundError") ||
    message.includes("UserSettings_userId_fkey") ||
    (prismaCode === "P2003" && /userid/i.test(fkField));
  if (isStaleUser) {
    await clearSessionCookie();
    return NextResponse.json(
      { error: "Сессия больше не действительна — войди снова." },
      { status: 401 }
    );
  }

  if (prismaCode === "P2003") {
    return NextResponse.json(
      { error: "Связанная запись не найдена (например, выбранный счёт)." },
      { status: 400 }
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
