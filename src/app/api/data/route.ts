import { NextRequest, NextResponse, after } from "next/server";
import {
  readStore,
  resetUser,
  writeStore,
  addTransactionForUser,
  deleteTransactionForUser,
  updateTransactionForUser,
  addGoalForUser,
  updateGoalForUser,
  deleteGoalForUser,
  upsertBudgetForUser,
  deleteBudgetForUser,
  updateSettingsForUser,
  importTransactionsForUser,
  ensureRecurringForUser,
  freeTransactionCount,
  accountBelongsToUser,
} from "@/lib/db";
import { FinanceData } from "@/lib/types";
import { getAuthUser } from "@/lib/server-auth";
import { budgetAlertFor, notifyUser } from "@/lib/telegram";
import { apiError } from "@/lib/api-errors";
import {
  idSchema,
  transactionPayloadSchema,
  transactionUpdateSchema,
  goalPayloadSchema,
  goalUpdateSchema,
  budgetPayloadSchema,
  settingsUpdateSchema,
  financeDataSchema,
  importTransactionsSchema,
  parseOrThrow,
  validationErrorResponse,
} from "@/lib/validation";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await ensureRecurringForUser(user.id);
    const data = await readStore(user.id);
    return NextResponse.json(data);
  } catch (e) {
    return apiError(e);
  }
}

/** Reject an accountId that doesn't belong to this user (the FK alone only proves the row exists, not who owns it). */
async function checkAccountOwnership(userId: string, accountId: string | null | undefined) {
  if (!accountId) return null;
  const owns = await accountBelongsToUser(userId, accountId);
  if (!owns) return NextResponse.json({ error: "Счёт не найден" }, { status: 400 });
  return null;
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    // Free plan soft limits
    if (user.plan === "free" && body.action === "add_transaction") {
      const count = await freeTransactionCount(user.id);
      if (count >= 200) {
        return NextResponse.json(
          { error: "Лимит бесплатного тарифа — 200 операций. Удалите старые записи или дождитесь Pro." },
          { status: 403 }
        );
      }
    }
    if (user.plan === "free" && body.action === "import_transactions") {
      return NextResponse.json({ error: "Импорт CSV доступен в Pro и в демо-режиме." }, { status: 403 });
    }

    switch (body.action) {
      case "add_transaction": {
        const payload = parseOrThrow(transactionPayloadSchema, body.payload);
        const ownerErr = await checkAccountOwnership(user.id, payload.accountId);
        if (ownerErr) return ownerErr;
        await addTransactionForUser(user.id, payload);
        if (payload.type === "expense") {
          // After the response: a Telegram alert if this expense crossed 80% / 100% of a budget.
          after(async () => {
            const alert = await budgetAlertFor(user.id, payload.category, payload.amount);
            if (alert) await notifyUser(user.id, alert);
          });
        }
        break;
      }
      case "delete_transaction": {
        const id = parseOrThrow(idSchema, body.id);
        await deleteTransactionForUser(user.id, id);
        break;
      }
      case "update_transaction": {
        const id = parseOrThrow(idSchema, body.id);
        const updates = parseOrThrow(transactionUpdateSchema, body.payload);
        const ownerErr = await checkAccountOwnership(user.id, updates.accountId);
        if (ownerErr) return ownerErr;
        await updateTransactionForUser(user.id, id, updates);
        break;
      }
      case "add_goal": {
        const payload = parseOrThrow(goalPayloadSchema, body.payload);
        await addGoalForUser(user.id, payload);
        break;
      }
      case "update_goal": {
        const id = parseOrThrow(idSchema, body.id);
        const updates = parseOrThrow(goalUpdateSchema, body.payload);
        await updateGoalForUser(user.id, id, updates);
        break;
      }
      case "delete_goal": {
        const id = parseOrThrow(idSchema, body.id);
        await deleteGoalForUser(user.id, id);
        break;
      }
      case "add_budget": {
        const payload = parseOrThrow(budgetPayloadSchema, body.payload);
        await upsertBudgetForUser(user.id, payload);
        break;
      }
      case "delete_budget": {
        const id = parseOrThrow(idSchema, body.id);
        await deleteBudgetForUser(user.id, id);
        break;
      }
      case "update_settings": {
        const payload = parseOrThrow(settingsUpdateSchema, body.payload);
        await updateSettingsForUser(user.id, payload);
        break;
      }
      case "reset": {
        await resetUser(user.id);
        return NextResponse.json(await readStore(user.id));
      }
      case "replace": {
        const payload = parseOrThrow(financeDataSchema, body.payload);
        await writeStore(user.id, payload as FinanceData);
        return NextResponse.json(await readStore(user.id));
      }
      case "import_transactions": {
        const payload = parseOrThrow(importTransactionsSchema, body.payload || []);
        await importTransactionsForUser(user.id, payload);
        break;
      }
      default:
        return NextResponse.json({ error: "unknown action" }, { status: 400 });
    }

    return NextResponse.json(await readStore(user.id));
  } catch (e) {
    const vErr = validationErrorResponse(e);
    if (vErr) return vErr;
    return apiError(e);
  }
}
