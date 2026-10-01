import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { promises as fs } from "fs";
import path from "path";

const COOKIE = "mp_session";
const AUTH_FILE = path.join(process.cwd(), "data", "auth-users.json");

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

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  plan: "free" | "pro" | "demo";
};

type StoredUser = AuthUser & { salt: string; hash: string };

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

async function loadUsers(): Promise<StoredUser[]> {
  try {
    const raw = await fs.readFile(AUTH_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveUsers(users: StoredUser[]) {
  await fs.mkdir(path.dirname(AUTH_FILE), { recursive: true });
  await fs.writeFile(AUTH_FILE, JSON.stringify(users, null, 2), "utf-8");
}

function publicUser(u: StoredUser): AuthUser {
  return { id: u.id, name: u.name, email: u.email, createdAt: u.createdAt, plan: u.plan };
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

/** Get authenticated user from httpOnly cookie — never trust client headers */
export async function getAuthUser(): Promise<AuthUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
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
  const users = await loadUsers();
  const em = email.trim().toLowerCase();
  if (users.find((u) => u.email === em)) {
    return { ok: false, error: "Этот email уже зарегистрирован — войди или другой email" };
  }
  if (password.length < 6) return { ok: false, error: "Пароль минимум 6 символов" };
  const salt = randomBytes(16).toString("hex");
  const hash = hashPassword(password, salt);
  const user: StoredUser = {
    id: randomBytes(16).toString("hex"),
    name: name.trim() || "User",
    email: em,
    salt,
    hash,
    createdAt: new Date().toISOString(),
    plan: "free",
  };
  users.push(user);
  await saveUsers(users);
  return { ok: true, user: publicUser(user) };
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ ok: true; user: AuthUser } | { ok: false; error: string }> {
  const users = await loadUsers();
  const em = email.trim().toLowerCase();
  const pw = password.normalize("NFKC"); // fix unicode lookalikes
  if (!em || !pw) {
    return { ok: false, error: "Введи email и пароль" };
  }
  const found = users.find((u) => u.email === em);
  if (!found) {
    return {
      ok: false,
      error:
        "Аккаунт не найден по этому email. Если ты уже регистрировался — перезапуск сервера мог сбросить локальную базу (data/auth-users.json). Зарегистрируйся снова тем же email или проверь опечатку. Это пароль MoneyPulse, не Gmail.",
    };
  }
  if (!verifyPassword(pw, found.salt, found.hash)) {
    return {
      ok: false,
      error:
        "Неверный пароль MoneyPulse. Это не пароль от Gmail. Если забыл — зарегистрируй новый email или восстанови позже.",
    };
  }
  return { ok: true, user: publicUser(found) };
}

/** Fresh ephemeral demo identity per click — no shared file, no cross-user clobber */
export async function createDemoUser(): Promise<AuthUser> {
  const id = randomBytes(16).toString("hex");
  const user: AuthUser = {
    id,
    name: "Demo",
    email: `demo-${id.slice(0, 8)}@moneypulse.local`,
    createdAt: new Date().toISOString(),
    plan: "demo",
  };
  // Seed isolated finance data for this session (JWT carries id; no shared demo-user-shared)
  const { getDemoData, writeStore } = await import("@/lib/db");
  await writeStore(id, getDemoData());
  return user;
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
