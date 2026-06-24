import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertPersonalAccess } from "@/lib/security";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = await prisma.searchRun.findUnique({
    where: { id },
    include: { hotel: true, results: true }
  });

  if (!run) {
    return NextResponse.json({ error: "Search run not found." }, { status: 404 });
  }

  return NextResponse.json({
    id: run.id,
    status: run.status,
    hotel: run.hotel,
    checkIn: run.checkIn,
    checkOut: run.checkOut,
    adults: run.adults,
    rooms: run.rooms,
    currency: run.currency,
    sources: run.sources.split(",").filter(Boolean),
    brgConditions: JSON.parse(run.brgConditionsJson),
    results: run.results.map((result) => ({
      source: result.source,
      cashRates: JSON.parse(result.cashRatesJson),
      pointsRates: JSON.parse(result.pointsRatesJson),
      feesIncluded: result.feesIncluded,
      cancellationPolicy: result.cancellationPolicy,
      sourceUrl: result.sourceUrl,
      screenshotUrl: result.screenshotUrl,
      capturedAt: result.capturedAt,
      confidence: result.confidence,
      brgPrediction: JSON.parse(result.brgPredictionJson),
      failureReason: result.failureReason
    }))
  });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertPersonalAccess(request);
    const { id } = await params;
    await prisma.searchRun.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to delete search run." }, { status: 400 });
  }
}
