import { describe, expect, it } from "vitest";
import { predictBrgForResult } from "@/lib/brg-prediction";
import type { ConnectorOutput } from "@/lib/types";

const baseResult: ConnectorOutput = {
  source: "booking",
  cashRates: [
    {
      label: "Refundable rate",
      amount: 180000,
      currency: "KRW",
      conditionMatch: "MATCH"
    }
  ],
  pointsRates: [],
  feesIncluded: true,
  sourceUrl: "https://www.booking.com/",
  capturedAt: new Date("2026-07-01").toISOString(),
  confidence: 0.8
};

describe("BRG prediction", () => {
  it("scores matching public OTA rates higher", () => {
    const prediction = predictBrgForResult("MARRIOTT", baseResult, 220000);
    expect(prediction.band).toBe("HIGH");
    expect(prediction.score).toBeGreaterThanOrEqual(75);
  });

  it("blocks mismatched conditions", () => {
    const prediction = predictBrgForResult(
      "HILTON",
      {
        ...baseResult,
        cashRates: [{ ...baseResult.cashRates[0], conditionMatch: "MISMATCH" }]
      },
      220000
    );

    expect(prediction.band).toBe("BLOCKED");
    expect(prediction.blockers.length).toBeGreaterThan(0);
  });
});
