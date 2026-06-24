import { prisma } from "@/lib/db";
import type { Brand, BrgConditions, ConnectorOutput, DashboardData } from "@/lib/types";

export async function ensureStarterData() {
  const count = await prisma.hotel.count();
  if (count > 0) return;

  await prisma.hotel.createMany({
    data: [
      {
        brand: "MARRIOTT",
        name: "The Westin Josun Seoul",
        region: "Seoul, Korea",
        officialUrl: "https://www.marriott.com/",
        googleUrl: "https://www.google.com/travel/hotels",
        bookingUrl: "https://www.booking.com/",
        agodaUrl: "https://www.agoda.com/"
      },
      {
        brand: "HILTON",
        name: "Conrad Seoul",
        region: "Seoul, Korea",
        officialUrl: "https://www.hilton.com/",
        googleUrl: "https://www.google.com/travel/hotels",
        bookingUrl: "https://www.booking.com/",
        agodaUrl: "https://www.agoda.com/"
      },
      {
        brand: "HYATT",
        name: "Grand Hyatt Seoul",
        region: "Seoul, Korea",
        officialUrl: "https://www.hyatt.com/",
        googleUrl: "https://www.google.com/travel/hotels",
        bookingUrl: "https://www.booking.com/",
        agodaUrl: "https://www.agoda.com/"
      },
      {
        brand: "ACCOR",
        name: "Fairmont Ambassador Seoul",
        region: "Seoul, Korea",
        officialUrl: "https://all.accor.com/",
        googleUrl: "https://www.google.com/travel/hotels",
        bookingUrl: "https://www.booking.com/",
        agodaUrl: "https://www.agoda.com/"
      }
    ]
  });
}

export async function getDashboardData(): Promise<DashboardData> {
  await ensureStarterData();

  const [hotels, runs, promotions] = await Promise.all([
    prisma.hotel.findMany({ orderBy: [{ brand: "asc" }, { name: "asc" }] }),
    prisma.searchRun.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { hotel: true, results: true }
    }),
    prisma.promotion.findMany({ orderBy: { updatedAt: "desc" }, take: 12 })
  ]);

  return {
    hotels: hotels.map((hotel) => ({
      ...hotel,
      brand: hotel.brand as Brand
    })),
    runs: runs.map((run) => ({
      id: run.id,
      hotelName: run.hotel.name,
      brand: run.hotel.brand as Brand,
      checkIn: run.checkIn.toISOString(),
      checkOut: run.checkOut.toISOString(),
      status: run.status,
      createdAt: run.createdAt.toISOString(),
      brgConditions: parseConditions(run.brgConditionsJson),
      results: run.results.map((result) => ({
        source: result.source as ConnectorOutput["source"],
        cashRates: JSON.parse(result.cashRatesJson),
        pointsRates: JSON.parse(result.pointsRatesJson),
        feesIncluded: result.feesIncluded,
        cancellationPolicy: result.cancellationPolicy || undefined,
        sourceUrl: result.sourceUrl,
        screenshotUrl: result.screenshotUrl || undefined,
        capturedAt: result.capturedAt.toISOString(),
        confidence: result.confidence,
        failureReason: result.failureReason || undefined
      }))
    })),
    promotions: promotions.map((promotion) => ({
      id: promotion.id,
        brand: promotion.brand as Brand,
      title: promotion.title,
      summary: promotion.summary,
      sourceUrl: promotion.sourceUrl,
      expiresAt: promotion.expiresAt?.toISOString() ?? null,
      status: promotion.status
    }))
  };
}

function parseConditions(value: string): BrgConditions {
  try {
    return JSON.parse(value) as BrgConditions;
  } catch {
    return {
      bedType: "any",
      cancellation: "free",
      mealPlan: "any",
      taxPolicy: "taxes_included",
      paymentTiming: "any",
      requirePubliclyBookable: true,
      strictMatch: false
    };
  }
}

export async function upsertPromotionDrafts() {
  const drafts: Array<{ brand: Brand; title: string; summary: string; sourceUrl: string; expiresAt?: Date }> = [
    {
      brand: "MARRIOTT",
      title: "Marriott Bonvoy promotions",
      summary: "Review current bonus point and member-rate offers from the official promotions page.",
      sourceUrl: "https://www.marriott.com/loyalty/promotions.mi"
    },
    {
      brand: "HILTON",
      title: "Hilton Honors offers",
      summary: "Review active bonus point, status, and package offers.",
      sourceUrl: "https://www.hilton.com/en/offers/"
    },
    {
      brand: "HYATT",
      title: "World of Hyatt offers",
      summary: "Review active Bonus Journeys, member-rate, and points offers.",
      sourceUrl: "https://world.hyatt.com/content/gp/en/offers.html"
    },
    {
      brand: "ACCOR",
      title: "Accor Live Limitless offers",
      summary: "Review current ALL member offers and bonus point campaigns.",
      sourceUrl: "https://all.accor.com/loyalty-program/promotions-offers/index.en.shtml"
    }
  ];

  await Promise.all(
    drafts.map((draft) =>
      prisma.promotion.create({
        data: {
          ...draft,
          status: "DRAFT"
        }
      })
    )
  );
}
