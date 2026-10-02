import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, rateLimit } from "@/lib/server-auth";
import { apiError } from "@/lib/api-errors";
import { getMyFamily, upsertFamilyBudget, deleteFamilyBudget, familyErrorResponse } from "@/lib/db";
import {
  familyBudgetSchema,
  familyBudgetDeleteSchema,
  parseOrThrow,
  validationErrorResponse,
} from "@/lib/validation";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!rateLimit(`family-budget:${user.id}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const family = await getMyFamily(user.id);
    if (!family) return NextResponse.json({ error: "Вы не состоите в семье." }, { status: 404 });
    const body = parseOrThrow(familyBudgetSchema, await req.json());
    const budget = await upsertFamilyBudget(user.id, family.id, body.category, body.limit, body.period);
    return NextResponse.json({ budget });
  } catch (e) {
    const vErr = validationErrorResponse(e);
    if (vErr) return vErr;
    const fErr = familyErrorResponse(e);
    if (fErr) return NextResponse.json({ error: fErr.error }, { status: fErr.status });
    return apiError(e);
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!rateLimit(`family-budget-del:${user.id}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = parseOrThrow(familyBudgetDeleteSchema, await req.json());
    await deleteFamilyBudget(user.id, body.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const vErr = validationErrorResponse(e);
    if (vErr) return vErr;
    const fErr = familyErrorResponse(e);
    if (fErr) return NextResponse.json({ error: fErr.error }, { status: fErr.status });
    return apiError(e);
  }
}
