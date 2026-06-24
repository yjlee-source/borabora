import { describe, expect, it } from "vitest";
import { searchPresetSchema, searchRunSchema } from "@/lib/validation";

describe("search run validation", () => {
  it("allows one to seven nights", () => {
    expect(
      searchRunSchema.parse({
        hotelId: "hotel_1",
        checkIn: "2026-07-01",
        checkOut: "2026-07-08",
        adults: 2,
        rooms: 1,
        currency: "KRW",
        sources: ["official"],
        includeCash: true,
        includePoints: true
      })
    ).toBeTruthy();
  });

  it("rejects stays longer than seven nights", () => {
    expect(() =>
      searchRunSchema.parse({
        hotelId: "hotel_1",
        checkIn: "2026-07-01",
        checkOut: "2026-07-09",
        adults: 2,
        rooms: 1,
        currency: "KRW",
        sources: ["official"],
        includeCash: true,
        includePoints: true
      })
    ).toThrow();
  });

  it("accepts BRG same-condition filters", () => {
    const parsed = searchRunSchema.parse({
      hotelId: "hotel_1",
      checkIn: "2026-07-01",
      checkOut: "2026-07-03",
      adults: 2,
      rooms: 1,
      currency: "KRW",
      sources: ["official", "booking"],
      includeCash: true,
      includePoints: true,
      brgConditions: {
        roomType: "Deluxe",
        bedType: "king",
        cancellation: "free",
        mealPlan: "breakfast",
        taxPolicy: "taxes_included",
        paymentTiming: "pay_at_property",
        requirePubliclyBookable: true,
        strictMatch: true
      }
    });

    expect(parsed.brgConditions.strictMatch).toBe(true);
    expect(parsed.brgConditions.mealPlan).toBe("breakfast");
  });
});

describe("search preset validation", () => {
  it("accepts reusable search options without hotel or dates", () => {
    const parsed = searchPresetSchema.parse({
      name: "Tokyo refundable",
      adults: 2,
      rooms: 1,
      currency: "KRW",
      sources: ["official", "booking"],
      includeCash: true,
      includePoints: true,
      brgConditions: {
        cancellation: "free",
        mealPlan: "room_only",
        taxPolicy: "taxes_included",
        paymentTiming: "any",
        bedType: "king",
        requirePubliclyBookable: true,
        strictMatch: true
      }
    });

    expect(parsed.name).toBe("Tokyo refundable");
    expect(parsed.sources).toEqual(["official", "booking"]);
  });
});
