# 핵심 도메인 로직

## 포인트 시스템
- **원장(ledger) 패턴**: `point_ledger` 테이블에 모든 변동 이력 기록
- **요약 테이블**: `point_summary` (total/used/reserved)
- **예약포인트**: 온라인 구매 시 `reserve` → 배송 완료 시 `deduct`+`release`로 확정
- 계급별 연간 지급액: `src/lib/constants.ts`의 `ANNUAL_POINTS`

## 재고 시스템
- `inventory` 테이블: 판매소(`store_id`) + 규격(`spec_id`) 단위로 관리
- 변동 이력: `inventory_log` (sale/incoming/return/adjust)
- `orders.ts`의 `insertInventoryLog()`는 주 흐름 실패 방지를 위해 try/catch로 감싸져 있음

## 체척권 (맞춤피복)
- 주문 시 발행(`issued`) → 체척업체 등록(`registered`) → 취소요청/승인 가능
- 취소 승인은 군수담당자만 가능; 등록된 체척권은 반품 불가
- 재고 관리 없음 (체척업체에서 제작)

## 주문 테이블 통합
- `orders` 테이블: 온라인/오프라인 통합 (`order_type: "online" | "offline"`)
- `order_items`: 완제품(`finished`) + 맞춤피복(`custom`) 혼재 가능
