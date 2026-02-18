// 사용자 역할
export type UserRole = "admin" | "store" | "tailor" | "user";

// 계급 구분
export type Rank =
  | "general"       // 장성급
  | "colonel"       // 대령
  | "lt_colonel"    // 중령
  | "major"         // 소령
  | "captain"       // 대위
  | "first_lt"      // 중위
  | "second_lt"     // 소위
  | "warrant"       // 준위
  | "sgt_major"     // 상사(원사)
  | "master_sgt"    // 중사
  | "sgt"           // 하사
  | "civil_servant"; // 군무원

// 품목 유형
export type ProductType = "finished" | "custom";

// 주문 유형
export type OrderType = "online" | "offline";

// 주문 상태
export type OrderStatus =
  | "pending"       // 주문 대기
  | "confirmed"     // 주문 확인
  | "shipping"      // 배송 중
  | "delivered"     // 배송 완료
  | "cancelled"     // 취소
  | "returned";     // 반품

// 배송 방법
export type DeliveryMethod = "parcel" | "direct";

// 포인트 변동 유형
export type PointType =
  | "grant"         // 연간 지급
  | "deduct"        // 차감 (구매)
  | "add"           // 추가 (반품/진급)
  | "return"        // 반환 (취소)
  | "reserve"       // 예약 (온라인 구매)
  | "release";      // 예약 해제

// 체척권 상태
export type TicketStatus =
  | "issued"        // 발행
  | "registered"    // 등록 (업체)
  | "cancel_requested" // 취소 요청
  | "cancelled";    // 취소 완료

// 재고 변동 유형
export type InventoryLogType =
  | "incoming"      // 입고
  | "sale"          // 판매 차감
  | "return"        // 반품 추가
  | "adjust_up"     // 조정 증가
  | "adjust_down";  // 조정 감소
