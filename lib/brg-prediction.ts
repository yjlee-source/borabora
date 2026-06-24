import { BRG_POLICIES } from "@/lib/brg-policies";
import type { Brand, BrgPrediction, ConnectorOutput } from "@/lib/types";

export function predictBrgForResult(brand: Brand, result: ConnectorOutput, officialDirectTotal?: number): BrgPrediction {
  const policy = BRG_POLICIES[brand];
  const firstRate = result.cashRates[0];
  const positiveFactors: string[] = [];
  const riskFactors: string[] = [];
  const blockers: string[] = [];
  let score = policy.baseScore;

  if (result.source === "official") {
    return {
      score: 0,
      band: "BLOCKED",
      headline: "공홈 요금은 비교 대상이 아닙니다.",
      positiveFactors: [],
      riskFactors: ["BRG는 공홈 예약가와 외부 비교가를 비교합니다."],
      blockers: ["공홈 요금"],
      policySourceUrl: policy.sourceUrl
    };
  }

  if (!firstRate) {
    blockers.push("비교 가능한 현금 요금이 없습니다.");
    score = 0;
  } else {
    const conditionMatch = firstRate.conditionMatch ?? "UNKNOWN";
    if (conditionMatch === "MATCH") {
      positiveFactors.push("동일 조건으로 분류된 요금입니다.");
      score += 10;
    }
    if (conditionMatch === "UNKNOWN") {
      riskFactors.push("객실/취소/포함사항 일부는 수동 확인이 필요합니다.");
      score -= 18;
    }
    if (conditionMatch === "MISMATCH") {
      blockers.push("동일 조건과 맞지 않는 요금입니다.");
      score -= 48;
    }

    if (result.feesIncluded) {
      positiveFactors.push("세금/수수료 포함 총액으로 비교하기 쉽습니다.");
      score += 5;
    } else {
      riskFactors.push("세금/수수료 포함 여부가 불명확합니다.");
      score -= 10;
    }

    if (result.failureReason) {
      riskFactors.push("자동화가 데모/부분 검증 상태입니다.");
      score -= 8;
    }

    if (officialDirectTotal && firstRate.amount > 0) {
      const deltaPercent = ((officialDirectTotal - firstRate.amount) / officialDirectTotal) * 100;
      if (deltaPercent > 8) {
        positiveFactors.push(`공홈 대비 약 ${Math.round(deltaPercent)}% 낮습니다.`);
        score += 10;
      } else if (deltaPercent > 1) {
        positiveFactors.push(`공홈 대비 약 ${Math.round(deltaPercent)}% 낮습니다.`);
        score += 4;
      } else {
        riskFactors.push("공홈 대비 차이가 작아 거절 가능성이 있습니다.");
        score -= 18;
      }
    }
  }

  if (result.source === "google") {
    riskFactors.push("Google 결과는 실제 예약 사이트 조건을 다시 열어 확인해야 합니다.");
    score -= 6;
  }

  if (brand === "HYATT" && firstRate?.conditionNotes?.some((note) => note.includes("조식"))) {
    riskFactors.push("Hyatt는 room-only 비교가 더 안전합니다.");
    score -= 8;
  }

  if (brand === "ACCOR") {
    riskFactors.push("Accor 정책은 앱 내 수동 확인 상태라 기본 신뢰도가 낮습니다.");
    score -= 6;
  }

  score = blockers.length ? Math.min(score, 24) : score;
  score = Math.max(0, Math.min(99, Math.round(score)));

  return {
    score,
    band: bandForScore(score, blockers.length > 0),
    headline: headlineForScore(score, blockers.length > 0),
    positiveFactors,
    riskFactors,
    blockers,
    policySourceUrl: policy.sourceUrl
  };
}

function bandForScore(score: number, blocked: boolean): BrgPrediction["band"] {
  if (blocked || score < 25) return "BLOCKED";
  if (score >= 75) return "HIGH";
  if (score >= 50) return "MEDIUM";
  return "LOW";
}

function headlineForScore(score: number, blocked: boolean) {
  if (blocked || score < 25) return "BRG 후보에서 제외하는 편이 안전합니다.";
  if (score >= 75) return "BRG 신청 후보로 꽤 좋아 보입니다.";
  if (score >= 50) return "BRG 가능성은 있지만 조건 확인이 필요합니다.";
  return "성공 가능성이 낮아 보입니다.";
}
