import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/server-auth";
import { apiError } from "@/lib/api-errors";
import { getMyFamily, getFamilyOverview, familyErrorResponse } from "@/lib/db";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const family = await getMyFamily(user.id);
    if (!family) return NextResponse.json({ family: null });
    const overview = await getFamilyOverview(family.id, user.id);
    return NextResponse.json({ family, overview });
  } catch (e) {
    const fErr = familyErrorResponse(e);
    if (fErr) return NextResponse.json({ error: fErr.error }, { status: fErr.status });
    return apiError(e);
  }
}
