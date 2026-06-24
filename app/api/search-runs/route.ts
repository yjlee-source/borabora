import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runConnectors } from "@/lib/automation/connectors";
import { predictBrgForResult } from "@/lib/brg-prediction";
import { assertPersonalAccess } from "@/lib/security";
import { searchRunSchema } from "@/lib/validation";
import type { Brand, Source } from "@/lib/types";

export async function POST(request: Request) {
  try {
    assertPersonalAccess(request);
    const parsed = searchRunSchema.parse(await request.json());
    const hotel = await prisma.hotel.findUniqueOrThrow({ where: { id: parsed.hotelId } });

    const run = await prisma.searchRun.create({
      data: {
        hotelId: hotel.id,
        checkIn: parsed.checkIn,
        checkOut: parsed.checkOut,
        adults: parsed.adults,
        rooms: parsed.rooms,
        currency: parsed.currency.toUpperCase(),
        sources: parsed.sources.join(","),
        brgConditionsJson: JSON.stringify(parsed.brgConditions),
        status: "RUNNING"
      }
    });

    const input = {
      hotel: {
        ...hotel,
        brand: hotel.brand as Brand
      },
      checkIn: parsed.checkIn.toISOString(),
      checkOut: parsed.checkOut.toISOString(),
      adults: parsed.adults,
      rooms: parsed.rooms,
      currency: parsed.currency.toUpperCase(),
      includeCash: parsed.includeCash,
      includePoints: parsed.includePoints,
      brgConditions: parsed.brgConditions
    };

    const results = await runConnectors(input, parsed.sources as Source[]);
    const officialDirectTotal = results.find((result) => result.source === "official")?.cashRates[0]?.amount;
    const resultsWithPrediction = results.map((result) => ({
      ...result,
      brgPrediction: predictBrgForResult(hotel.brand as Brand, result, officialDirectTotal)
    }));
    const failedCount = resultsWithPrediction.filter((result) => result.failureReason && result.confidence === 0).length;
    const status = failedCount === resultsWithPrediction.length ? "FAILED" : failedCount > 0 ? "PARTIAL" : "COMPLETED";

    await prisma.$transaction([
      prisma.rateResult.createMany({
        data: resultsWithPrediction.map((result) => ({
          searchRunId: run.id,
          source: result.source,
          cashRatesJson: JSON.stringify(result.cashRates),
          pointsRatesJson: JSON.stringify(result.pointsRates),
          feesIncluded: result.feesIncluded,
          cancellationPolicy: result.cancellationPolicy,
          sourceUrl: result.sourceUrl,
          screenshotUrl: result.screenshotUrl,
          capturedAt: new Date(result.capturedAt),
          confidence: result.confidence,
          brgPredictionJson: JSON.stringify(result.brgPrediction),
          failureReason: result.failureReason
        }))
      }),
      prisma.searchRun.update({
        where: { id: run.id },
        data: {
          status,
          failureNote: status === "COMPLETED" ? null : `${failedCount} source(s) need manual review.`
        }
      })
    ]);

    return NextResponse.json({ id: run.id, status, results: resultsWithPrediction }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create search run." }, { status: 400 });
  }
}
