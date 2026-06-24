import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertPersonalAccess } from "@/lib/security";
import { hotelSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    assertPersonalAccess(request);
    const formData = await request.formData();
    const parsed = hotelSchema.parse(Object.fromEntries(formData.entries()));

    const hotel = await prisma.hotel.create({
      data: {
        brand: parsed.brand,
        name: parsed.name,
        region: parsed.region,
        officialUrl: parsed.officialUrl,
        googleUrl: parsed.googleUrl || null,
        bookingUrl: parsed.bookingUrl || null,
        agodaUrl: parsed.agodaUrl || null,
        expediaUrl: parsed.expediaUrl || null,
        hotelsUrl: parsed.hotelsUrl || null
      }
    });

    return NextResponse.json({ hotel }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save hotel." }, { status: 400 });
  }
}
