import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, rateLimit } from "@/lib/server-auth";
import { apiError } from "@/lib/api-errors";
import { createFamily, familyErrorResponse } from "@/lib/db";
import { createFamilySchema, parseOrThrow, validationErrorResponse } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!rateLimit(`family-create:${user.id}`, 5, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = parseOrThrow(createFamilySchema, await req.json());
    const family = await createFamily(user.id, body.name);
    return NextResponse.json({ family });
  } catch (e) {
    const vErr = validationErrorResponse(e);
    if (vErr) return vErr;
    const fErr = familyErrorResponse(e);
    if (fErr) return NextResponse.json({ error: fErr.error }, { status: fErr.status });
    return apiError(e);
  }
}
