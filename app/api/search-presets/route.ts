import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { mapPreset } from "@/lib/repository";
import { assertPersonalAccess } from "@/lib/security";
import { searchPresetSchema } from "@/lib/validation";

export async function GET() {
  const presets = await prisma.searchPreset.findMany({ orderBy: { updatedAt: "desc" } });
  return NextResponse.json({ presets: presets.map(mapPreset) });
}

export async function POST(request: Request) {
  try {
    assertPersonalAccess(request);
    const parsed = searchPresetSchema.parse(await request.json());
    const preset = await prisma.searchPreset.create({
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

    return NextResponse.json({ preset: mapPreset(preset) }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save preset." }, { status: 400 });
  }
}
