import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { predictBrgForResult } from "@/lib/brg-prediction";
import { assertPersonalAccess } from "@/lib/security";
import type { Brand, Source } from "@/lib/types";

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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertPersonalAccess(request);
    const { id } = await params;
    const body = (await request.json()) as {
      source?: Source;
      amount?: number;
      currency?: string;
      notes?: string;
    };

    if (!body.source || !body.amount || body.amount <= 0) {
      return NextResponse.json({ error: "Source and positive amount are required." }, { status: 400 });
    }

    const run = await prisma.searchRun.findUniqueOrThrow({
      where: { id },
      include: { hotel: true, results: true }
    });
    const result = run.results.find((item) => item.source === body.source);
    if (!result) {
      return NextResponse.json({ error: "Source result not found." }, { status: 404 });
    }

    const existingRates = JSON.parse(result.cashRatesJson);
    const firstRate = existingRates[0] ?? {
      label: "Manual rate",
      currency: body.currency || run.currency,
      conditionMatch: "UNKNOWN",
      conditionNotes: []
    };
    const updatedRates = [
      {
        ...firstRate,
        label: `${firstRate.label || body.source} · manual`,
        amount: body.amount,
        currency: (body.currency || firstRate.currency || run.currency).toUpperCase(),
        notes: body.notes || "Manually entered real-world price."
      },
      ...existingRates.slice(1)
    ];

    const officialResult = run.results.find((item) => item.source === "official");
    const officialTotal =
      result.source === "official"
        ? body.amount
        : officialResult
          ? JSON.parse(officialResult.cashRatesJson)[0]?.amount
          : undefined;
    const prediction = predictBrgForResult(
      run.hotel.brand as Brand,
      {
        source: result.source as Source,
        cashRates: updatedRates,
        pointsRates: JSON.parse(result.pointsRatesJson),
        feesIncluded: result.feesIncluded,
        cancellationPolicy: result.cancellationPolicy || undefined,
        sourceUrl: result.sourceUrl,
        screenshotUrl: result.screenshotUrl || undefined,
        capturedAt: new Date().toISOString(),
        confidence: Math.max(result.confidence, 0.9),
        failureReason: undefined
      },
      officialTotal
    );

    await prisma.rateResult.update({
      where: { id: result.id },
      data: {
        cashRatesJson: JSON.stringify(updatedRates),
        capturedAt: new Date(),
        confidence: Math.max(result.confidence, 0.9),
        brgPredictionJson: JSON.stringify(prediction),
        failureReason: null
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update manual rate." }, { status: 400 });
  }
}
