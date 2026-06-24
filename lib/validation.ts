import { z } from "zod";
import { BRANDS, SOURCES } from "@/lib/types";

const dateSchema = z.coerce.date();

export const brgConditionsSchema = z.object({
  roomType: z.string().max(80).optional().default(""),
  bedType: z.enum(["any", "king", "queen", "twin", "double"]).default("any"),
  cancellation: z.enum(["any", "free", "non_refundable"]).default("free"),
  mealPlan: z.enum(["any", "room_only", "breakfast"]).default("any"),
  taxPolicy: z.enum(["any", "taxes_included"]).default("taxes_included"),
  paymentTiming: z.enum(["any", "pay_now", "pay_at_property"]).default("any"),
  requirePubliclyBookable: z.boolean().default(true),
  strictMatch: z.boolean().default(false)
});

export const hotelSchema = z.object({
  brand: z.enum(BRANDS),
  name: z.string().min(2),
  region: z.string().min(2),
  officialUrl: z.string().url(),
  googleUrl: z.string().url().optional().or(z.literal("")),
  bookingUrl: z.string().url().optional().or(z.literal("")),
  agodaUrl: z.string().url().optional().or(z.literal(""))
});

export const searchRunSchema = z
  .object({
    hotelId: z.string().min(1),
    checkIn: dateSchema,
    checkOut: dateSchema,
    adults: z.coerce.number().int().min(1).max(8).default(2),
    rooms: z.coerce.number().int().min(1).max(4).default(1),
    currency: z.string().min(3).max(3).default("KRW"),
    sources: z.array(z.enum(SOURCES)).min(1).default(["official", "google", "booking", "agoda"]),
    includeCash: z.boolean().default(true),
    includePoints: z.boolean().default(true),
    brgConditions: brgConditionsSchema.default({})
  })
  .refine((value) => value.checkOut > value.checkIn, "Check-out must be after check-in")
  .refine((value) => {
    const nights = Math.round((value.checkOut.getTime() - value.checkIn.getTime()) / 86400000);
    return nights >= 1 && nights <= 7;
  }, "Stay length must be between 1 and 7 nights");

export const credentialSchema = z.object({
  brand: z.enum(BRANDS),
  username: z.string().min(2),
  password: z.string().min(6)
});

export const searchPresetSchema = z.object({
  name: z.string().min(2).max(60),
  adults: z.coerce.number().int().min(1).max(8).default(2),
  rooms: z.coerce.number().int().min(1).max(4).default(1),
  currency: z.string().min(3).max(3).default("KRW"),
  sources: z.array(z.enum(SOURCES)).min(1).default(["official", "google", "booking", "agoda"]),
  includeCash: z.boolean().default(true),
  includePoints: z.boolean().default(true),
  brgConditions: brgConditionsSchema.default({})
});
