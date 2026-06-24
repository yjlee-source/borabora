import { NextResponse } from "next/server";
import { assertPersonalAccess } from "@/lib/security";
import { upsertPromotionDrafts } from "@/lib/repository";

export async function POST(request: Request) {
  try {
    assertPersonalAccess(request);
    await upsertPromotionDrafts();
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to refresh promotions." }, { status: 400 });
  }
}
