import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { getPrisma, prismaEnabled } from "./prisma";
import { getDemoData, writeStore, UserNotFoundError, leaveFamily } from "./db";

const COOKIE = "mp_session";

function secretKey() {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 16) {
    if (process.env.NODE_ENV === "production" || process.env.VERCEL === "1") {
      throw new Error(
        "JWT_SECRET is required in production (min 16 chars). Set it in environment variables."
      );
    }
    // local/dev only
    return new TextEncoder().encode("money-pulse-dev-secret-change-in-production-2026");
  }
  return new TextEncoder().encode(s);
}

function requirePrisma() {
  const prisma = getPrisma();
  if (!prisma) {
    throw new Error(
      "DATABASE_URL is not set — MoneyPulse requires Postgres (Neon recommended). See PRODUCTION.md."
    );
  }
  return prisma;
}

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  plan: "free" | "pro" | "demo";
};

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString("hex");
}

function verifyPassword(password: string, salt: string, hash: string): boolean {
  const h = hashPassword(password, salt);
  try {
    return timingSafeEqual(Buffer.from(h, "hex"), Buffer.from(hash, "hex"));
  } catch {
    return false;
  }
}

function publicUser(u: {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  plan: string;
}): AuthUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    createdAt: u.createdAt.toISOString(),
    plan: (u.plan as AuthUser["plan"]) || "free",
  };
}

export async function createToken(user: AuthUser, days = 90): Promise<string> {
  const exp = Math.max(1, Math.min(days, 365));
  return new SignJWT({
    sub: user.id,
    email: user.email,
    name: user.name,
    plan: user.plan,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${exp}d`)
    .sign(secretKey());
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub) return null;
    return {
      id: String(payload.sub),
      email: String(payload.email || ""),
      name: String(payload.name || "User"),
      createdAt: "",
      plan: (payload.plan as AuthUser["plan"]) || "free",
    };
  } catch {
    return null;
  }
}

/** Days remaining on the current session cookie's JWT, used to preserve remember-me duration across token re-issuance. */
export async function remainingSessionDays(token: string): Promise<number> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const exp = payload.exp;
    if (!exp) return 7;
    const days = Math.ceil((exp * 1000 - Date.now()) / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.min(days, 365));
  } catch {
    return 7;
  }
}

/** Get authenticated user from httpOnly cookie — never trust client headers */
export async function getAuthUser(): Promise<AuthUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function getSessionToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COOKIE)?.value ?? null;
}

export async function setSessionCookie(token: string, days = 90) {
  const jar = await cookies();
  const maxAge = Math.max(1, Math.min(days, 365)) * 60 * 60 * 24;
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function registerUser(
  name: string,
  email: string,
  password: string
): Promise<{ ok: true; user: AuthUser } | { ok: false; error: string }> {
  const prisma = requirePrisma();
  const em = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: em } });
  if (existing) {
    return { ok: false, error: "Этот email уже зарегистрирован — войди или другой email" };
  }
  if (password.length < 6) return { ok: false, error: "Пароль минимум 6 символов" };
  const salt = randomBytes(16).toString("hex");
  const hash = hashPassword(password, salt);
  const user = await prisma.user.create({
    data: {
      name: name.trim() || "User",
      email: em,
      salt,
      passwordHash: hash,
      plan: "free",
    },
  });
  return { ok: true, user: publicUser(user) };
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ ok: true; user: AuthUser } | { ok: false; error: string }> {
  const prisma = requirePrisma();
  const em = email.trim().toLowerCase();
  const pw = password.normalize("NFKC"); // fix unicode lookalikes
  if (!em || !pw) {
    return { ok: false, error: "Введи email и пароль" };
  }
  // Same generic message whether the account doesn't exist or the password is wrong —
  // distinguishing them lets an attacker enumerate registered emails.
  const GENERIC_LOGIN_ERROR = "Неверный email или пароль.";
  const found = await prisma.user.findUnique({ where: { email: em } });
  if (!found || !found.salt || !found.passwordHash) {
    return { ok: false, error: GENERIC_LOGIN_ERROR };
  }
  if (!verifyPassword(pw, found.salt, found.passwordHash)) {
    return { ok: false, error: GENERIC_LOGIN_ERROR };
  }
  return { ok: true, user: publicUser(found) };
}

/** Update the account's name/email. Returns the fresh public user for re-issuing the JWT. */
export async function updateProfile(
  userId: string,
  updates: { name?: string; email?: string }
): Promise<{ ok: true; user: AuthUser } | { ok: false; error: string }> {
  const prisma = requirePrisma();
  const data: { name?: string; email?: string } = {};
  if (updates.name !== undefined) {
    const n = updates.name.trim();
    if (!n) return { ok: false, error: "Имя не может быть пустым" };
    data.name = n;
  }
  if (updates.email !== undefined) {
    const em = updates.email.trim().toLowerCase();
    if (!em || !em.includes("@")) return { ok: false, error: "Некорректный email" };
    const existing = await prisma.user.findUnique({ where: { email: em } });
    if (existing && existing.id !== userId) {
      return { ok: false, error: "Этот email уже занят другим аккаунтом" };
    }
    data.email = em;
  }
  const user = await prisma.user.update({ where: { id: userId }, data });
  return { ok: true, user: publicUser(user) };
}

/** Verify the current password and set a new one. */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const prisma = requirePrisma();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new UserNotFoundError();
  if (!user.salt || !user.passwordHash) {
    return { ok: false, error: "Для этого аккаунта пароль не задан (вход через Telegram/демо)." };
  }
  if (!verifyPassword(currentPassword.normalize("NFKC"), user.salt, user.passwordHash)) {
    return { ok: false, error: "Неверный текущий пароль." };
  }
  const salt = randomBytes(16).toString("hex");
  const hash = hashPassword(newPassword, salt);
  await prisma.user.update({ where: { id: userId }, data: { salt, passwordHash: hash } });
  return { ok: true };
}

/** Permanently delete the account (and, via schema cascade, all its accounts/transactions/goals/budgets/settings). */
export async function deleteAccountForUser(
  userId: string,
  password?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const prisma = requirePrisma();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new UserNotFoundError();
  if (user.salt && user.passwordHash) {
    if (!password || !verifyPassword(password.normalize("NFKC"), user.salt, user.passwordHash)) {
      return { ok: false, error: "Неверный пароль." };
    }
  }
  // Leave the family first: the cascade alone would remove only the membership row, leaving
  // an empty family behind (or a family whose ownerId points at a deleted user).
  const membership = await prisma.familyMember.findUnique({ where: { userId } });
  if (membership) await leaveFamily(userId);
  await prisma.telegramLinkCode.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
  return { ok: true };
}

/** Fresh ephemeral demo identity per click — persisted as a real (plan: demo) user/account */
export async function createDemoUser(): Promise<AuthUser> {
  const prisma = requirePrisma();
  const id = randomBytes(16).toString("hex");
  const user = await prisma.user.create({
    data: {
      id,
      name: "Demo",
      email: `demo-${id.slice(0, 8)}@moneypulse.local`,
      plan: "demo",
    },
  });
  const pub = publicUser(user);
  await writeStore(pub.id, getDemoData());
  return pub;
}

/** Simple in-memory rate limit */
const hits = new Map<string, { n: number; t: number }>();

/**
 * In-memory rate limit (resets on serverless cold start).
 * Production: set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN and replace
 * this map with @upstash/ratelimit for durable limits across instances.
 */
export function rateLimit(key: string, limit = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  const cur = hits.get(key);
  if (!cur || now - cur.t > windowMs) {
    hits.set(key, { n: 1, t: now });
    return true;
  }
  if (cur.n >= limit) return false;
  cur.n += 1;
  return true;
}

export { prismaEnabled };
