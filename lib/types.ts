export const BRANDS = ["MARRIOTT", "HILTON", "HYATT", "ACCOR"] as const;
export const SOURCES = ["official", "google", "booking", "agoda"] as const;

export type Brand = (typeof BRANDS)[number];
export type Source = (typeof SOURCES)[number];

export type BrgConditions = {
  roomType?: string;
  bedType: "any" | "king" | "queen" | "twin" | "double";
  cancellation: "any" | "free" | "non_refundable";
  mealPlan: "any" | "room_only" | "breakfast";
  taxPolicy: "any" | "taxes_included";
  paymentTiming: "any" | "pay_now" | "pay_at_property";
  requirePubliclyBookable: boolean;
  strictMatch: boolean;
};

export type ConditionMatch = "MATCH" | "MISMATCH" | "UNKNOWN";

export type Rate = {
  label: string;
  amount: number;
  currency: string;
  nightlyAmount?: number;
  taxesAndFees?: number;
  notes?: string;
  conditionMatch?: ConditionMatch;
  conditionNotes?: string[];
};

export type PointsRate = {
  label: string;
  points: number;
  cashCopay?: number;
  currency?: string;
  notes?: string;
};

export type ConnectorInput = {
  hotel: {
    id: string;
    brand: Brand;
    name: string;
    region: string;
    officialUrl: string;
    googleUrl?: string | null;
    bookingUrl?: string | null;
    agodaUrl?: string | null;
  };
  checkIn: string;
  checkOut: string;
  adults: number;
  rooms: number;
  currency: string;
  includeCash: boolean;
  includePoints: boolean;
  brgConditions: BrgConditions;
};

export type ConnectorOutput = {
  source: Source;
  cashRates: Rate[];
  pointsRates: PointsRate[];
  feesIncluded: boolean;
  cancellationPolicy?: string;
  sourceUrl: string;
  screenshotUrl?: string;
  capturedAt: string;
  confidence: number;
  failureReason?: string;
};

export type DashboardData = {
  hotels: Array<{
    id: string;
    brand: Brand;
    name: string;
    region: string;
    officialUrl: string;
    googleUrl: string | null;
    bookingUrl: string | null;
    agodaUrl: string | null;
  }>;
  runs: Array<{
    id: string;
    hotelName: string;
    brand: Brand;
    checkIn: string;
    checkOut: string;
    status: string;
    createdAt: string;
    brgConditions: BrgConditions;
    results: ConnectorOutput[];
  }>;
  promotions: Array<{
    id: string;
    brand: Brand;
    title: string;
    summary: string;
    sourceUrl: string;
    expiresAt: string | null;
    status: string;
  }>;
};
