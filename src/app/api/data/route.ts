import { NextRequest, NextResponse } from "next/server";
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
} from "@/lib/db";
import { FinanceData } from "@/lib/types";
import { getAuthUser } from "@/lib/server-auth";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureRecurringForUser(user.id);
  const data = await readStore(user.id);
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Free plan soft limits
  if (user.plan === "free" && body.action === "add_transaction") {
    const count = await freeTransactionCount(user.id);
    if (count >= 200) {
      return NextResponse.json(
        { error: "Free plan limit: 200 transactions. Upgrade to Pro." },
        { status: 403 }
      );
    }
  }
  if (user.plan === "free" && body.action === "import_transactions") {
    return NextResponse.json({ error: "CSV import is Pro. Upgrade or use Demo." }, { status: 403 });
  }

  switch (body.action) {
    case "add_transaction":
      await addTransactionForUser(user.id, body.payload);
      break;
    case "delete_transaction":
      await deleteTransactionForUser(user.id, body.id);
      break;
    case "update_transaction":
      await updateTransactionForUser(user.id, body.id, body.payload);
      break;
    case "add_goal":
      await addGoalForUser(user.id, body.payload);
      break;
    case "update_goal":
      await updateGoalForUser(user.id, body.id, body.payload);
      break;
    case "delete_goal":
      await deleteGoalForUser(user.id, body.id);
      break;
    case "add_budget":
      await upsertBudgetForUser(user.id, body.payload);
      break;
    case "delete_budget":
      await deleteBudgetForUser(user.id, body.id);
      break;
    case "update_settings":
      await updateSettingsForUser(user.id, body.payload);
      break;
    case "reset": {
      await resetUser(user.id);
      return NextResponse.json(await readStore(user.id));
    }
    case "replace": {
      await writeStore(user.id, body.payload as FinanceData);
      return NextResponse.json(await readStore(user.id));
    }
    case "import_transactions":
      await importTransactionsForUser(user.id, body.payload || []);
      break;
    default:
      return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }

  return NextResponse.json(await readStore(user.id));
}
