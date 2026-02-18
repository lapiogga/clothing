---
name: design-review
description: 피복 구매관리 시스템 설계 검증 결과서. 기능명세, DB설계, 화면설계, API설계 간 정합성 검증 결과를 기록한다.
---

# 설계 검증 결과서

## 검증 일시: 2026-02-17

## 1. 검증 범위
- 기능명세서 (functional-spec) ↔ 요건정의서 (requirements)
- DB 설계서 (db-design) ↔ 기능명세서
- 화면 명세서 (screen-spec) ↔ 기능명세서
- API 명세서 (api-spec) ↔ 기능명세서 + DB 설계서

---

## 2. 요건정의 ↔ 기능명세 정합성

### 체크리스트

| # | 요건 | 기능명세 매핑 | 결과 |
|---|------|-------------|------|
| 요건1 | 사용자 종류 (4유형) | M1(권한), M2(사용자관리), M3(판매소/업체) | ✅ 충족 |
| 요건2 | 메뉴 관리 및 로그인 | M1-1~M1-6 | ✅ 충족 |
| 요건3 | 피복 품목 (완제품/맞춤) | M4-1~M4-3 | ✅ 충족 |
| 요건4 | 피복포인트 지급 | M5-1~M5-5 | ✅ 충족 |
| 요건5 | 오프라인 판매 | M6-1~M6-3 | ✅ 충족 |
| 요건6 | 온라인 구매 | M6-4~M6-9 | ✅ 충족 |
| 요건7 | 재고/포인트 관리 | M6-10~M6-12, M5 | ✅ 충족 |
| 요건8 | 체척권 관리 | M7-1~M7-6 | ✅ 충족 |

### 상세 검증

| # | 요건 상세 | 검증 결과 |
|---|----------|----------|
| 1 | 계급별 차등 포인트 (장성 100만~군무원 40만) | ✅ constants.ts ANNUAL_POINTS에 정의, M5-1 산정 로직 |
| 2 | 호봉당 5천원 추가 | ✅ STEP_INCREMENT=5000, M5-1 산정 로직 |
| 3 | 진급 시 일할계산 추가 지급 | ✅ M5-3 triggerPromotionPoints |
| 4 | 퇴직예정자 일할계산 | ✅ M5-1 산정 시 retirement_date 기반 계산 |
| 5 | 가용포인트 = 잔여 - 예약 | ✅ BR-1, point_summary 테이블 |
| 6 | 완제품/맞춤피복 별도 판매 | ✅ BR-5, orders.product_type으로 구분 |
| 7 | 맞춤피복 수량 1 고정 | ✅ BR-3, UI에서 제한 + 서버 검증 |
| 8 | 맞춤피복 재고관리 안함 | ✅ BR-4, inventory는 완제품+규격만 |
| 9 | 온라인 구매 취소 (배송확정 전) | ✅ M6-5, BR-6 |
| 10 | 직권 취소 | ✅ M6-8 |
| 11 | 반품은 판매소에서만 | ✅ BR-8, M6-3 |
| 12 | 체척권 등록 후 취소 불가 | ✅ BR-7, M7-4 |
| 13 | 택배/직접 배송 선택 | ✅ M6-4, orders.delivery_method |
| 14 | Pull-Down 메뉴 | ✅ M1-6, menus 테이블 |

---

## 3. DB 설계 ↔ 기능명세 정합성

### 테이블-기능 매핑

| 테이블 | 관련 기능 | 결과 |
|--------|----------|------|
| users | M1, M2 | ✅ role/rank/store_id/tailor_id 모두 반영 |
| stores | M3-1 | ✅ |
| tailors | M3-2 (계좌정보 포함) | ✅ |
| categories | M4-1 (self-ref 3단계) | ✅ |
| products | M4-2 | ✅ product_type 구분 |
| product_specs | M4-3 (완제품만) | ✅ |
| delivery_zones | M3-3 | ✅ store_id FK |
| inventory | M6-10~12 | ✅ UNIQUE(store, product, spec) |
| inventory_log | M6-10~12 | ✅ log_type 5종 |
| point_summary | M5 | ✅ total/used/reserved |
| point_ledger | M5 | ✅ point_type 6종 |
| orders | M6 | ✅ online/offline, 6개 상태 |
| order_items | M6 | ✅ active/returned |
| tailoring_tickets | M7 | ✅ 4개 상태 |
| tailor_settlements | M7-6 | ✅ |
| menus | M1-6 | ✅ role_access, self-ref |

### 데이터 무결성 검증

| 항목 | 검증 결과 |
|------|----------|
| 포인트 정합성 | ✅ point_summary = SUM(point_ledger) 로 검증 가능 |
| 재고 정합성 | ✅ inventory.quantity = 초기 + SUM(inventory_log) 로 검증 가능 |
| 주문-포인트 연계 | ✅ point_ledger.reference_id → orders.id |
| 체척권-주문항목 연계 | ✅ tailoring_tickets.order_item_id FK |
| 중복 지급 방지 | ✅ point_ledger.fiscal_year로 연도별 확인 |
| 재고 음수 방지 | ✅ inventory.quantity CHECK(>= 0) |

---

## 4. 화면 명세 ↔ 기능명세 정합성

### 화면-기능 매핑

| 화면 ID | 화면명 | 기능 | 결과 |
|---------|--------|------|------|
| S-01 | 로그인 | M1-1 | ✅ |
| S-02 | 비밀번호 찾기 | M1-3 | ✅ |
| S-03 | 비밀번호 변경 | M1-4 | ✅ |
| A-01 | 관리자 대시보드 | - | ✅ |
| A-02 | 사용자 목록 | M2-1 | ✅ |
| A-03 | 사용자 등록 | M2-2, M2-3 | ✅ |
| A-04 | 포인트 산정 | M5-1, M5-2 | ✅ |
| A-05 | 포인트 현황 | M5-4 | ✅ |
| A-06 | 품목 관리 | M4-1~M4-3 | ✅ |
| A-07 | 판매소 관리 | M3-1 | ✅ |
| A-08 | 체척업체 관리 | M3-2 | ✅ |
| A-09 | 체척권 관리 | M7-3, M7-5 | ✅ |
| A-10 | 정산 관리 | M7-6 | ✅ |
| A-11 | 메뉴 관리 | M1-6 | ✅ |
| A-12 | 사용자 수정 | M2-4 | ✅ |
| ST-01 | 판매소 대시보드 | - | ✅ |
| ST-02 | 오프라인 판매 | M6-1 | ✅ |
| ST-03 | 판매 내역 | M6-2 | ✅ |
| ST-04 | 반품 처리 | M6-3 | ✅ |
| ST-05 | 온라인 주문 관리 | M6-6 | ✅ |
| ST-06 | 온라인 주문 상세 | M6-7, M6-8 | ✅ |
| ST-07 | 재고 현황 | M6-10 | ✅ |
| ST-08 | 입고 처리 | M6-11 | ✅ |
| ST-09 | 재고 조정 | M6-12 | ✅ |
| ST-10 | 배송지 관리 | M3-3 | ✅ |
| ST-11~13 | 통계 (3개) | M6-13 | ✅ |
| T-01 | 체척업체 대시보드 | - | ✅ |
| T-02 | 체척권 등록 | M7-4 | ✅ |
| T-03 | 체척권 현황 | M7-5 | ✅ |
| U-01 | 쇼핑 메인 | M6-4 | ✅ |
| U-02 | 품목 상세 | M6-4 | ✅ |
| U-03 | 장바구니 | M6-4 | ✅ |
| U-04 | 구매 확인 | M6-4 | ✅ |
| U-05 | 구매 내역 | M6-9 | ✅ |
| U-06 | 구매 상세 | M6-5, M6-9 | ✅ |
| U-07 | 포인트 현황 | M5-5 | ✅ |
| U-08 | 체척권 현황 | M7-2, M7-5 | ✅ |

**총 39개 화면 → 39개 기능 매핑 완료**

---

## 5. API 명세 ↔ 기능/DB 정합성

### API-기능 매핑

| API 그룹 | API 수 | 기능 | 결과 |
|---------|--------|------|------|
| auth (4) | login, logout, resetPassword, updatePassword | M1-1~M1-4 | ✅ |
| users (6) | getUsers, getUserById, createUser, bulkCreateUsers, updateUser, getCurrentUser | M2-1~M2-4 | ✅ |
| products (11) | categories CRUD(4), products CRUD(5), specs CRUD(3) | M4-1~M4-3 | ✅ |
| points (6) | calculate, grant, promotion, getSummary, getLedger, getAvailable | M5-1~M5-5 | ✅ |
| orders (8) | createOffline, createOnline, cancel, return, updateStatus, getOrders, getOrderById, stats(3) | M6 전체 | ✅ |
| inventory (5) | getInventory, incoming, adjust, getLog, getStoreForProduct | M6-10~M6-12 | ✅ |
| tickets (5) | getTickets, register, requestCancel, approveCancel, getByNumber | M7-1~M7-5 | ✅ |
| settlements (4) | getSettlements, calculate, create, confirm | M7-6 | ✅ |
| 기초데이터 (12) | stores(4), tailors(4), delivery_zones(4), menus(4) | M3, M1-6 | ✅ |

### API 입출력-DB 컬럼 정합성

| 검증 항목 | 결과 |
|----------|------|
| createUser 입력 → users 컬럼 | ✅ 모든 필드 매핑됨 |
| createOfflineSale → orders + order_items + inventory + point_ledger | ✅ 트랜잭션 처리 필요 |
| createOnlineOrder → orders + order_items + point_ledger(reserve) | ✅ |
| updateOrderStatus(delivered) → inventory + point_ledger(deduct+release) | ✅ |
| registerTicket → tailoring_tickets(status, tailor_id, registered_at) | ✅ |
| grantAnnualPoints → point_ledger + point_summary | ✅ |

---

## 6. 식별된 이슈 및 조치

### 이슈 목록

| # | 유형 | 내용 | 심각도 | 조치 |
|---|------|------|--------|------|
| I-1 | 트랜잭션 | 오프라인 판매/온라인 배송확정 시 다중 테이블 갱신 필요. Supabase에서 트랜잭션 처리 방안 필요 | 높음 | Supabase RPC(PostgreSQL 함수) 사용 또는 순차 처리 + 보상 로직 |
| I-2 | 동시성 | 온라인 구매 + 오프라인 판매 동시 발생 시 재고 충돌 가능 | 높음 | inventory.quantity에 FOR UPDATE 잠금 또는 Supabase RPC 내 직렬화 |
| I-3 | 보안 | RLS 정책에서 get_user_role() 함수 성능 고려 필요 | 중간 | SECURITY DEFINER + STABLE 설정으로 캐싱 |
| I-4 | 확장 | 주문번호/체척권번호 시퀀스가 서버 재시작 시 리셋되지 않도록 주의 | 낮음 | PostgreSQL SEQUENCE 사용으로 영속적 |
| I-5 | UI | 품목 관리(A-06) 좌측 트리 + 우측 테이블 복합 레이아웃 구현 복잡도 | 중간 | ResizablePanel 또는 고정 너비 레이아웃 |

### 조치 계획

**I-1, I-2 (트랜잭션/동시성)**:
- Phase 2에서 핵심 비즈니스 로직을 PostgreSQL 함수(RPC)로 구현
- `process_offline_sale()`, `process_delivery_confirm()`, `process_return()` 등
- 함수 내에서 `SELECT ... FOR UPDATE`로 재고 잠금

**I-3 (RLS 성능)**:
- `get_user_role()` 함수에 `STABLE` 힌트 적용 (완료)
- 필요 시 `auth.jwt()` 직접 참조로 전환

---

## 7. 검증 결론

| 검증 영역 | 결과 | 비고 |
|----------|------|------|
| 요건정의 → 기능명세 | ✅ 통과 | 14개 요건 항목 모두 매핑 |
| 기능명세 → DB 설계 | ✅ 통과 | 16개 테이블, 모든 기능 지원 |
| 기능명세 → 화면 명세 | ✅ 통과 | 39개 화면, 누락 없음 |
| 기능명세 → API 명세 | ✅ 통과 | 61개 API, 모든 기능 커버 |
| 데이터 무결성 | ✅ 통과 | CHECK, FK, UNIQUE 제약 적절 |
| 보안 (RLS) | ✅ 통과 | 역할별 접근 제어 정의 완료 |
| 이슈 | ⚠️ 5건 | 트랜잭션/동시성은 Phase 2에서 RPC로 해결 |

**설계 검증 결과: 통과 (조건부)**
- Phase 2 개발 착수 시 I-1, I-2 이슈의 RPC 구현을 우선 처리할 것
