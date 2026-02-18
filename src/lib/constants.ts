import { Rank } from "@/types";

// 계급별 연간 피복포인트 기준 (단위: 원)
export const ANNUAL_POINTS: Record<Rank, number> = {
  general: 1_000_000,
  colonel: 800_000,
  lt_colonel: 800_000,
  major: 800_000,
  captain: 600_000,
  first_lt: 600_000,
  second_lt: 600_000,
  warrant: 500_000,
  sgt_major: 400_000,
  master_sgt: 400_000,
  sgt: 400_000,
  civil_servant: 400_000,
};

// 호봉당 추가 금액 (단위: 원)
export const STEP_INCREMENT = 5_000;

// 계급 표시명
export const RANK_LABELS: Record<Rank, string> = {
  general: "장성급",
  colonel: "대령",
  lt_colonel: "중령",
  major: "소령",
  captain: "대위",
  first_lt: "중위",
  second_lt: "소위",
  warrant: "준위",
  sgt_major: "상사",
  master_sgt: "중사",
  sgt: "하사",
  civil_servant: "군무원",
};

// 사용자 역할 표시명
export const ROLE_LABELS = {
  admin: "군수담당자",
  store: "피복판매소 담당자",
  tailor: "체척업체 담당자",
  user: "일반사용자",
} as const;
