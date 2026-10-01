// One-time migration: data/auth-users.json + data/users/<id>.json -> Postgres (Prisma).
// Idempotent (upserts by original id/email) — safe to re-run.
//
// Usage: DATABASE_URL=... node scripts/migrate-json-to-prisma.mjs

import { readFile, readdir } from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const ROOT = process.cwd();

async function readJson(p, fallback) {
  try {
    return JSON.parse(await readFile(p, "utf-8"));
  } catch {
    return fallback;
  }
}

async function main() {
  const authUsers = await readJson(path.join(ROOT, "data", "auth-users.json"), []);
  console.log(`Found ${authUsers.length} user(s) in data/auth-users.json`);

  for (const u of authUsers) {
    await prisma.user.upsert({
      where: { id: u.id },
      create: {
        id: u.id,
        email: u.email,
        name: u.name || "User",
        salt: u.salt ?? null,
        passwordHash: u.hash ?? null,
        plan: u.plan || "free",
        createdAt: u.createdAt ? new Date(u.createdAt) : undefined,
      },
      update: {
        email: u.email,
        name: u.name || "User",
        salt: u.salt ?? null,
        passwordHash: u.hash ?? null,
        plan: u.plan || "free",
      },
    });
    console.log(`  user upserted: ${u.email} (${u.id})`);

    const dataFile = path.join(ROOT, "data", "users", `${u.id}.json`);
    const data = await readJson(dataFile, null);
    if (!data) {
      console.log(`  no finance data file for ${u.id}, skipping`);
      continue;
    }

    await prisma.userSettings.upsert({
      where: { userId: u.id },
      create: {
        userId: u.id,
        currency: data.settings?.currency ?? "сум",
        monthlyIncomeGoal: data.settings?.monthlyIncomeGoal ?? null,
        savingsTargetPercent: data.settings?.savingsTargetPercent ?? 20,
        notifications: !!data.settings?.notifications,
        theme: data.settings?.theme ?? "dark",
        streak: data.settings?.streak ?? 0,
        bestStreak: data.settings?.bestStreak ?? 0,
        lastLogDate: data.settings?.lastLogDate ?? "",
        badgesJson: JSON.stringify(data.settings?.badges ?? []),
        customCategoriesJson: JSON.stringify(data.settings?.customCategories ?? []),
      },
      update: {
        currency: data.settings?.currency ?? "сум",
        monthlyIncomeGoal: data.settings?.monthlyIncomeGoal ?? null,
        savingsTargetPercent: data.settings?.savingsTargetPercent ?? 20,
        notifications: !!data.settings?.notifications,
        theme: data.settings?.theme ?? "dark",
        streak: data.settings?.streak ?? 0,
        bestStreak: data.settings?.bestStreak ?? 0,
        lastLogDate: data.settings?.lastLogDate ?? "",
        badgesJson: JSON.stringify(data.settings?.badges ?? []),
        customCategoriesJson: JSON.stringify(data.settings?.customCategories ?? []),
      },
    });

    for (const t of data.transactions || []) {
      await prisma.transaction.upsert({
        where: { id: t.id },
        create: {
          id: t.id,
          userId: u.id,
          type: t.type,
          amount: t.amount,
          category: t.category,
          description: t.description,
          date: t.date,
          recurring: !!t.recurring,
          accountId: t.accountId ?? null,
          tagsJson: JSON.stringify(t.tags ?? []),
        },
        update: {},
      });
    }
    for (const g of data.goals || []) {
      await prisma.goal.upsert({
        where: { id: g.id },
        create: {
          id: g.id,
          userId: u.id,
          title: g.title,
          targetAmount: g.targetAmount,
          currentAmount: g.currentAmount,
          deadline: g.deadline ?? null,
          emoji: g.emoji,
          color: g.color ?? null,
        },
        update: {},
      });
    }
    for (const b of data.budgets || []) {
      await prisma.budget.upsert({
        where: { id: b.id },
        create: { id: b.id, userId: u.id, category: b.category, limit: b.limit, period: b.period },
        update: {},
      });
    }
    for (const a of data.accounts || []) {
      await prisma.account.upsert({
        where: { id: a.id },
        create: { id: a.id, userId: u.id, name: a.name, type: a.type, balance: a.balance, emoji: a.emoji ?? null },
        update: {},
      });
    }
    console.log(
      `  migrated ${data.transactions?.length ?? 0} tx, ${data.goals?.length ?? 0} goals, ${data.budgets?.length ?? 0} budgets, ${data.accounts?.length ?? 0} accounts`
    );
  }

  // Any data/users/*.json without a matching auth-users.json entry — orphaned, log only.
  try {
    const files = await readdir(path.join(ROOT, "data", "users"));
    const knownIds = new Set(authUsers.map((u) => u.id));
    const orphans = files.filter((f) => f.endsWith(".json") && !knownIds.has(f.replace(/\.json$/, "")));
    if (orphans.length) {
      console.log(`\nNote: ${orphans.length} orphaned data/users/*.json file(s) with no matching account, not migrated:`);
      orphans.forEach((f) => console.log(`  - ${f}`));
    }
  } catch {
    // data/users may not exist, fine
  }

  console.log("\nDone. Verify with: npx prisma studio");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
