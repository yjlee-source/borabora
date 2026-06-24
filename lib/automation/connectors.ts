import { chromium } from "playwright-core";
import type { BrgConditions, ConditionMatch, ConnectorInput, ConnectorOutput, Source } from "@/lib/types";

type UrlPicker = (input: ConnectorInput) => string | null | undefined;

const pickers: Record<Source, UrlPicker> = {
  official: (input) => input.hotel.officialUrl,
  google: (input) => input.hotel.googleUrl,
  booking: (input) => input.hotel.bookingUrl,
  agoda: (input) => input.hotel.agodaUrl,
  expedia: (input) => input.hotel.expediaUrl,
  hotels: (input) => input.hotel.hotelsUrl
};

export async function runConnectors(input: ConnectorInput, sources: Source[]) {
  const settled = await Promise.allSettled(sources.map((source) => runConnector(source, input)));

  return settled.map((result, index) => {
    if (result.status === "fulfilled") return result.value;
    return failedOutput(sources[index], input, result.reason instanceof Error ? result.reason.message : "Unknown failure");
  });
}

async function runConnector(source: Source, input: ConnectorInput): Promise<ConnectorOutput> {
  const sourceUrl = pickers[source](input);
  if (!sourceUrl) {
    return failedOutput(source, input, "No source URL is saved for this hotel.");
  }

  const endpoint = process.env.BROWSERLESS_WS_ENDPOINT;
  if (!endpoint) {
    return demoOutput(source, input, sourceUrl);
  }

  const browser = await chromium.connectOverCDP(endpoint);
  const page = await browser.newPage();

  try {
    await page.goto(sourceUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    const title = await page.title();
    const screenshotUrl = undefined;

    return {
      source,
      cashRates: input.includeCash
        ? [
            {
              label: `${title || source} visible rate`,
              amount: 0,
              currency: input.currency,
              notes: "Remote browser reached the source. Add source-specific selectors to extract exact rates.",
              conditionMatch: "UNKNOWN",
              conditionNotes: buildUnknownNotes(input.brgConditions)
            }
          ]
        : [],
      pointsRates: input.includePoints
        ? [
            {
              label: "Points availability check required",
              points: 0,
              notes: "Login and chain-specific points selectors are intentionally separated from the generic runner."
            }
          ]
        : [],
      feesIncluded: false,
      cancellationPolicy: "Needs source-specific extraction",
      sourceUrl,
      screenshotUrl,
      capturedAt: new Date().toISOString(),
      confidence: 0.25
    };
  } catch (error) {
    return failedOutput(source, input, error instanceof Error ? error.message : "Browser automation failed");
  } finally {
    await page.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
}

function demoOutput(source: Source, input: ConnectorInput, sourceUrl: string): ConnectorOutput {
  const seed = input.hotel.name.length + source.length + new Date(input.checkIn).getUTCDate();
  const nightlyAmount = 140000 + seed * 9200;
  const nights = Math.max(
    1,
    Math.round((new Date(input.checkOut).getTime() - new Date(input.checkIn).getTime()) / 86400000)
  );

  const conditionReview = demoConditionReview(source, input.brgConditions);

  return {
    source,
    cashRates: input.includeCash
      ? [
          {
            label: source === "official" ? "Flexible member rate" : "Public refundable rate",
            amount: nightlyAmount * nights,
            nightlyAmount,
            taxesAndFees: Math.round(nightlyAmount * nights * 0.1),
            currency: input.currency,
            notes: "Demo rate shown until BROWSERLESS_WS_ENDPOINT and selectors are configured.",
            conditionMatch: conditionReview.match,
            conditionNotes: conditionReview.notes
          }
        ]
      : [],
    pointsRates:
      input.includePoints && source === "official"
        ? [
            {
              label: `${input.hotel.brand} points rate`,
              points: (22000 + seed * 500) * nights,
              notes: "Demo points rate; real values require chain login automation."
            }
          ]
        : [],
    feesIncluded: source !== "agoda",
    cancellationPolicy: source === "official" ? "Free cancellation estimate" : "Verify on source",
    sourceUrl,
    capturedAt: new Date().toISOString(),
    confidence: 0.45,
    failureReason: endpointMissingReason()
  };
}

function demoConditionReview(source: Source, conditions: BrgConditions): { match: ConditionMatch; notes: string[] } {
  const notes: string[] = [];

  if (conditions.roomType) notes.push(`객실명 포함 확인: ${conditions.roomType}`);
  if (conditions.bedType !== "any") notes.push(`침대 타입 동일 필요: ${conditions.bedType}`);
  if (conditions.cancellation === "free") notes.push("무료 취소 조건만 비교");
  if (conditions.cancellation === "non_refundable") notes.push("환불불가 조건만 비교");
  if (conditions.mealPlan === "breakfast") notes.push("조식 포함 조건만 비교");
  if (conditions.mealPlan === "room_only") notes.push("객실만 조건만 비교");
  if (conditions.taxPolicy === "taxes_included") notes.push("세금/수수료 포함 총액 기준");
  if (conditions.paymentTiming !== "any") notes.push(conditions.paymentTiming === "pay_now" ? "즉시결제 조건" : "현장결제 조건");
  if (conditions.requirePubliclyBookable) notes.push("로그인/쿠폰 전용가 제외");

  if (source === "official") {
    return { match: "MATCH", notes: [...notes, "공홈 기준 조건으로 간주"] };
  }

  if (source === "agoda" && conditions.taxPolicy === "taxes_included") {
    return { match: "MISMATCH", notes: [...notes, "Agoda 데모가는 세금 포함 여부가 불명확해 기본 제외"] };
  }

  if (source === "google") {
    return { match: "UNKNOWN", notes: [...notes, "Google 결과는 실제 OTA 조건 확인 필요"] };
  }

  if (source === "expedia" || source === "hotels") {
    return { match: "MATCH", notes: [...notes, "Expedia Group 공개 요금 후보로 간주"] };
  }

  return { match: "MATCH", notes: [...notes, "데모상 공개 환불가능 요금으로 간주"] };
}

function buildUnknownNotes(conditions: BrgConditions) {
  const notes = ["자동 브라우저가 페이지에 접근했지만 조건별 파싱 규칙은 아직 없습니다."];
  if (conditions.strictMatch) notes.push("조건 불명 결과 제외 설정 때문에 최저 후보에서 제외됩니다.");
  return notes;
}

function failedOutput(source: Source, input: ConnectorInput, failureReason: string): ConnectorOutput {
  return {
    source,
    cashRates: [],
    pointsRates: [],
    feesIncluded: false,
    sourceUrl: pickers[source](input) || input.hotel.officialUrl,
    capturedAt: new Date().toISOString(),
    cancellationPolicy: undefined,
    confidence: 0,
    failureReason
  };
}

function endpointMissingReason() {
  return "Using demo data because BROWSERLESS_WS_ENDPOINT is not configured.";
}
