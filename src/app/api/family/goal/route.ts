import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, rateLimit } from "@/lib/server-auth";
import { apiError } from "@/lib/api-errors";
import { getMyFamily, addFamilyGoal, updateFamilyGoal, deleteFamilyGoal, familyErrorResponse } from "@/lib/db";
import {
  familyGoalSchema,
  familyGoalUpdateSchema,
  familyGoalDeleteSchema,
  parseOrThrow,
  validationErrorResponse,
} from "@/lib/validation";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!rateLimit(`family-goal:${user.id}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const family = await getMyFamily(user.id);
    if (!family) return NextResponse.json({ error: "Вы не состоите в семье." }, { status: 404 });
    const body = parseOrThrow(familyGoalSchema, await req.json());
    const goal = await addFamilyGoal(user.id, family.id, body.title, body.targetAmount, body.emoji, body.deadline);
    return NextResponse.json({ goal });
  } catch (e) {
    const vErr = validationErrorResponse(e);
    if (vErr) return vErr;
    const fErr = familyErrorResponse(e);
    if (fErr) return NextResponse.json({ error: fErr.error }, { status: fErr.status });
    return apiError(e);
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!rateLimit(`family-goal-patch:${user.id}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = parseOrThrow(familyGoalUpdateSchema, await req.json());
    const { id, ...updates } = body;
    const goal = await updateFamilyGoal(user.id, id, updates);
    return NextResponse.json({ goal });
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

  if (!rateLimit(`family-goal-del:${user.id}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = parseOrThrow(familyGoalDeleteSchema, await req.json());
    await deleteFamilyGoal(user.id, body.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const vErr = validationErrorResponse(e);
    if (vErr) return vErr;
    const fErr = familyErrorResponse(e);
    if (fErr) return NextResponse.json({ error: fErr.error }, { status: fErr.status });
    return apiError(e);
  }
}
