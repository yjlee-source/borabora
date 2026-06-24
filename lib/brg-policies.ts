import type { Brand, BrgPolicySummary } from "@/lib/types";

export const BRG_POLICIES: Record<Brand, BrgPolicySummary> = {
  MARRIOTT: {
    brand: "MARRIOTT",
    title: "Marriott Best Rate Guarantee",
    reward: "요금 매칭 + 25% 할인 또는 5,000 포인트",
    claimWindow: "공홈 예약 후 24시간 이내, 표준 체크인 최소 24시간 전",
    summary: "동일 호텔, 날짜, 객실, 침대, 인원, 포함사항, 취소 정책이 맞아야 하며 공개 예약 가능 요금이어야 합니다.",
    sourceUrl: "https://www.marriott.com/look/claimForm.mi",
    lastReviewedAt: "2026-06-24",
    eligibilityRules: [
      "동일 호텔, 날짜, 객실 타입, 침대 타입, 인원",
      "동일 포함사항과 취소/환불 정책",
      "비 Marriott 사이트 또는 앱의 공개 예약 가능 요금",
      "공홈에서 해당 객실의 최저 공개 요금으로 예약"
    ],
    exclusions: [
      "쿠폰, 캐시백, 프로모션 코드 적용 요금",
      "회원권/기업/정부/AAA 등 제한 요금",
      "패키지, opaque, 요청 후 확정 요금",
      "일부 제외 브랜드와 올인클루시브/휴가 소유권 계열"
    ],
    baseScore: 76
  },
  HILTON: {
    brand: "HILTON",
    title: "Hilton Price Match Guarantee",
    reward: "요금 매칭 + 숙박 전체 객실가 25% 할인",
    claimWindow: "예약 전 또는 공홈 예약 후 24시간 이내",
    summary: "동일 숙소와 조건의 더 낮은 적격 요금이어야 하며, 제한 없이 표시 및 예약 가능해야 합니다.",
    sourceUrl: "https://www.hilton.com/en/p/price-match-guarantee/",
    lastReviewedAt: "2026-06-24",
    eligibilityRules: [
      "동일 숙소, 인원, 객실 조건, 예약 조건",
      "검증 시점에 호텔 통화로 예약 가능",
      "여러 박은 전체 숙박 객실가 기준",
      "공홈가와 차이가 1% 초과일수록 유리"
    ],
    exclusions: [
      "로그인, 신용카드, 코드가 필요한 요금",
      "회원 전용, 기업 계약, 팀멤버 등 제한 요금",
      "브랜드/호텔/객실이 결제 전 숨겨지는 요금",
      "즉시 확정 예약이 불가능한 광고성 요금"
    ],
    baseScore: 72
  },
  HYATT: {
    brand: "HYATT",
    title: "Hyatt Best Rate Guarantee",
    reward: "요금 매칭 + 20% 할인 또는 5,000 포인트",
    claimWindow: "Hyatt 공홈 예약 후 24시간 이내",
    summary: "동일 숙박의 공개적이고 즉시 예약 가능한 room-only 요금이 핵심입니다.",
    sourceUrl: "https://www.hyatt.com/info/best-rate-guarantee",
    lastReviewedAt: "2026-06-24",
    eligibilityRules: [
      "동일 숙박의 더 낮은 공개 요금",
      "즉시 예약 가능",
      "room-only 비교가 가장 적합",
      "참여 Hyatt 호텔/리조트 대상"
    ],
    exclusions: [
      "공개되지 않은 요금",
      "즉시 예약 불가 요금",
      "식사/패키지 등 room-only와 다른 포함 조건",
      "참여 제외 숙소 또는 별도 브랜드 조건"
    ],
    baseScore: 68
  },
  ACCOR: {
    brand: "ACCOR",
    title: "Accor Best Price Guarantee",
    reward: "정책 확인 필요",
    claimWindow: "공식 약관 확인 필요",
    summary: "공식 정책 링크를 기준으로 수동 확인이 필요합니다. 앱은 낮은 기본 신뢰도로 예측합니다.",
    sourceUrl: "https://all.accor.com/help/best-price-guarantee/index.en.shtml",
    lastReviewedAt: "2026-06-24",
    eligibilityRules: [
      "동일 호텔, 날짜, 객실과 조건 확인",
      "공개 예약 가능 요금 여부 확인",
      "세금/수수료와 취소 조건 확인"
    ],
    exclusions: [
      "공식 약관에서 제외한 제한 요금",
      "쿠폰/패키지/회원 전용 요금 가능성",
      "세금과 수수료 비교 기준 불명확"
    ],
    baseScore: 54
  }
};

export function getBrgPolicies() {
  return Object.values(BRG_POLICIES);
}
