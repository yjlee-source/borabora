import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { mapPreset } from "@/lib/repository";
import { assertPersonalAccess } from "@/lib/security";
import { searchPresetSchema } from "@/lib/validation";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertPersonalAccess(request);
    const { id } = await params;
    const parsed = searchPresetSchema.parse(await request.json());
    const preset = await prisma.searchPreset.update({
      where: { id },
      data: {
        name: parsed.name,
        adults: parsed.adults,
        rooms: parsed.rooms,
        currency: parsed.currency.toUpperCase(),
        sources: parsed.sources.join(","),
        includeCash: parsed.includeCash,
        includePoints: parsed.includePoints,
        brgConditionsJson: JSON.stringify(parsed.brgConditions)
      }
    });

    return NextResponse.json({ preset: mapPreset(preset) });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update preset." }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertPersonalAccess(request);
    const { id } = await params;
    await prisma.searchPreset.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to delete preset." }, { status: 400 });
  }
}
