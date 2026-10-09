import { NextResponse } from "next/server";
import { z } from "zod";
import { MAX_AMOUNT } from "@/lib/types";

/** Thrown by parseOrThrow — callers catch it (or let it bubble to validationErrorResponse). */
export class ValidationError extends Error {
  issues: string[];
  constructor(issues: string[]) {
    super(issues.join("; ") || "Invalid request");
    this.name = "ValidationError";
    this.issues = issues;
  }
}

export function parseOrThrow<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError(
      result.error.issues.map((i) => `${i.path.join(".") || "value"}: ${i.message}`)
    );
  }
  return result.data;
}

/** Route catch-blocks call this first; returns a 400 response for ValidationError, null otherwise (fall through to apiError). */
export function validationErrorResponse(e: unknown): NextResponse | null {
  if (e instanceof ValidationError) {
    return NextResponse.json({ error: e.issues[0] || "Invalid request", issues: e.issues }, { status: 400 });
  }
  return null;
}

export const idSchema = z.string().trim().min(1).max(100);

const isoDateString = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: "invalid date" });

// ——— Finance data payloads (src/app/api/data/route.ts) ———

export const transactionPayloadSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.number().finite().positive().max(MAX_AMOUNT),
  category: z.string().trim().min(1).max(60),
  description: z.string().trim().max(500).default(""),
  date: isoDateString,
  recurring: z.boolean().optional(),
  accountId: z.string().trim().min(1).max(100).nullish().transform((v) => v ?? undefined),
  tags: z.array(z.string().trim().max(40)).max(20).optional(),
});

export const transactionUpdateSchema = transactionPayloadSchema.partial();

export const goalPayloadSchema = z.object({
  title: z.string().trim().min(1).max(100),
  targetAmount: z.number().finite().positive().max(MAX_AMOUNT),
  currentAmount: z.number().finite().min(0).max(MAX_AMOUNT).default(0),
  deadline: z.string().trim().max(32).nullish().transform((v) => v ?? undefined),
  emoji: z.string().trim().min(1).max(8).default("🎯"),
  color: z.string().trim().max(20).nullish().transform((v) => v ?? undefined),
});

export const goalUpdateSchema = goalPayloadSchema.partial();

export const budgetPayloadSchema = z.object({
  category: z.string().trim().min(1).max(60),
  limit: z.number().finite().positive().max(MAX_AMOUNT),
  period: z.enum(["month", "week"]).default("month"),
});

export const accountPayloadSchema = z.object({
  name: z.string().trim().min(1).max(60),
  type: z.enum(["cash", "bank", "card", "savings", "other"]),
  balance: z.number().finite(),
  emoji: z.string().trim().max(8).nullish(),
});

export const settingsUpdateSchema = z
  .object({
    currency: z.string().trim().min(1).max(10),
    monthlyIncomeGoal: z.number().finite().nonnegative().nullish().transform((v) => v ?? undefined),
    savingsTargetPercent: z.number().finite().min(0).max(100),
    notifications: z.boolean(),
    theme: z.enum(["dark", "light"]),
    badges: z.array(z.string().trim().max(40)).max(50),
    customCategories: z.array(z.string().trim().min(1).max(40)).max(50),
  })
  .partial();

const fullSettingsSchema = z.object({
  currency: z.string().trim().min(1).max(10),
  monthlyIncomeGoal: z.number().finite().nonnegative().nullish().transform((v) => v ?? undefined),
  savingsTargetPercent: z.number().finite().min(0).max(100),
  name: z.string().trim().max(80),
  notifications: z.boolean(),
  theme: z.enum(["dark", "light"]).optional(),
  streak: z.number().int().min(0).optional(),
  bestStreak: z.number().int().min(0).optional(),
  lastLogDate: z.string().max(32).optional(),
  badges: z.array(z.string().trim().max(40)).max(50).optional(),
  customCategories: z.array(z.string().trim().max(40)).max(50).optional(),
});

export const financeDataSchema = z.object({
  transactions: z.array(transactionPayloadSchema.extend({ id: idSchema })).max(20_000),
  goals: z.array(goalPayloadSchema.extend({ id: idSchema })).max(500),
  budgets: z.array(budgetPayloadSchema.extend({ id: idSchema })).max(500),
  accounts: z.array(accountPayloadSchema.extend({ id: idSchema })).max(200).optional(),
  settings: fullSettingsSchema,
});

export const importTransactionsSchema = z.array(transactionPayloadSchema).max(5000);

// ——— Auth payloads ———

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "invalid email");

export const registerSchema = z.object({
  name: z.string().trim().max(80).optional().default("User"),
  email: emailSchema,
  password: z.string().min(6).max(200),
  remember: z.boolean().optional(),
});

// Deliberately loose on email shape (no regex) — must still accept logins for any account
// created before stricter validation existed, so only non-empty/length is enforced here.
export const loginSchema = z.object({
  email: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(200),
  remember: z.boolean().optional(),
});

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  email: emailSchema.optional(),
  currentPassword: z.string().min(1).max(200).optional(),
  newPassword: z.string().min(6).max(200).optional(),
}).refine((d) => !d.newPassword || !!d.currentPassword, {
  message: "currentPassword required to set a new password",
  path: ["currentPassword"],
});

export const accountDeleteSchema = z.object({
  password: z.string().min(1).max(200).optional(),
});

export const waitlistSchema = z.object({
  email: emailSchema,
  source: z.string().trim().max(60).optional(),
});

// ——— Family payloads (src/app/api/family/**) ———

export const createFamilySchema = z.object({
  name: z.string().trim().min(1).max(60),
});

export const joinFamilySchema = z.object({
  code: z.string().trim().min(4).max(16),
});

export const removeFamilyMemberSchema = z.object({
  userId: idSchema,
});

export const familyBudgetSchema = z.object({
  category: z.string().trim().min(1).max(60),
  limit: z.number().finite().positive().max(MAX_AMOUNT),
  period: z.enum(["month", "week"]).default("month"),
});

export const familyBudgetDeleteSchema = z.object({
  id: idSchema,
});

export const familyGoalSchema = z.object({
  title: z.string().trim().min(1).max(100),
  targetAmount: z.number().finite().positive().max(MAX_AMOUNT),
  emoji: z.string().trim().min(1).max(8).default("🎯"),
  deadline: z.string().trim().max(32).nullish().transform((v) => v ?? undefined),
});

export const familyGoalUpdateSchema = z.object({
  id: idSchema,
  currentAmount: z.number().finite().min(0).max(MAX_AMOUNT).optional(),
  title: z.string().trim().min(1).max(100).optional(),
  targetAmount: z.number().finite().positive().max(MAX_AMOUNT).optional(),
  deadline: z.string().trim().max(32).nullish().transform((v) => v ?? undefined),
  emoji: z.string().trim().min(1).max(8).optional(),
});

export const familyGoalDeleteSchema = z.object({
  id: idSchema,
});

export const FAMILY_MESSAGE_MAX = 500;

export const familyMessageSchema = z.object({
  text: z.string().trim().min(1).max(FAMILY_MESSAGE_MAX),
});

export const familyMessageDeleteSchema = z.object({
  id: idSchema,
});
