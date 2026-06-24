import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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
      failureReason: result.failureReason
    }))
  });
}
