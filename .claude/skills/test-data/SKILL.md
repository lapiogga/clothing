# 피복 구매관리 시스템 - 테스트 데이터 명세

## 개요
총 280건 이상의 테스트 데이터가 여러 마이그레이션 파일에 분산 정의되어 있다.

## 데이터 분포

### 기본 데이터 (seed.sql)

| 테이블 | 건수 | 설명 |
|--------|------|------|
| stores | 3 | 제1/2/3 피복판매소 |
| tailors | 3 | 대한맞춤피복, 우리체척업체, 군복전문점 |
| auth.users | 30 | Supabase Auth 사용자 |
| users | 30 | admin 2, store 3, tailor 3, user 22 |
| categories | 15 | 대분류 5, 중분류 5, 소분류 5 |
| products | 20 | 완제품 14, 맞춤피복 6 |
| product_specs | 42 | 품목당 1~5개 규격 |
| delivery_zones | 6 | 판매소당 2개 |
| point_summary | 22 | 일반사용자 전원 |
| point_ledger | 22 | 2026년도 연간 지급 |
| inventory | 32 | 3개 판매소 분산 |
| inventory_log | 22 | 초기 입고 이력 |

### 주문 데이터 (004_seed_orders.sql)

| 테이블 | 건수 | 상태 분포 |
|--------|------|----------|
| orders | 5 | pending 1, confirmed 1, shipping 1, delivered 1, cancelled 1 |
| order_items | 6 | 온라인 완제품 주문 항목 |
| point_ledger | 7 | reserve 3, use+release+reserve 3 (delivered 처리) |

### 확장 데이터 (005_seed_extended.sql)

| 테이블 | 건수 | 설명 |
|--------|------|------|
| orders | 18 | 오프라인 10 + 반품 3 + 맞춤피복 5 |
| order_items | 18 | 오프라인 12 + 반품 3 (returned) + 맞춤피복 5 |
| tailoring_tickets | 10 | issued 3, registered 3, cancel_requested 2, cancelled 2 |
| point_ledger | 20+ | use 10, refund 3, reserve 3, use+release 2 (맞춤피복 배송) |

### 전체 합계

| 구분 | 건수 |
|------|------|
| 기본 데이터 | 247건 |
| 주문 데이터 (004) | 18건 |
| 확장 데이터 (005) | 46건+ |
| **총합** | **311건+** |

### 주문 상태별 분포

| 상태 | 온라인 | 오프라인 | 합계 |
|------|--------|---------|------|
| pending | 2 (완제품1+맞춤1) | 0 | 2 |
| confirmed | 2 (완제품1+맞춤1) | 0 | 2 |
| shipping | 1 | 0 | 1 |
| delivered | 2 (완제품1+맞춤1) | 10+3=13 | 15 |
| cancelled | 2 (완제품1+맞춤1) | 0 | 2 |
| **합계** | **9** | **13** | **22** |

### 체척권 상태별 분포

| 상태 | 건수 |
|------|------|
| issued (등록 대기) | 3 |
| registered (등록 완료, 미정산) | 3 |
| cancel_requested (취소 요청) | 2 |
| cancelled (취소 완료) | 2 |
| **합계** | **10** |

## 테스트 계정

| 역할 | 이메일 | 비밀번호 | 비고 |
|------|--------|---------|------|
| admin | admin1@test.com | test1234 | 군수사령부 소령 |
| admin | admin2@test.com | test1234 | 군수사령부 대위 |
| store | store1@test.com | test1234 | 제1판매소 |
| store | store2@test.com | test1234 | 제2판매소 |
| store | store3@test.com | test1234 | 제3판매소 |
| tailor | tailor1@test.com | test1234 | 대한맞춤피복 |
| tailor | tailor2@test.com | test1234 | 우리체척업체 |
| tailor | tailor3@test.com | test1234 | 군복전문점 |
| user | user01@test.com | test1234 | 이대령 (대령) |
| user | user02@test.com | test1234 | 박중령 (중령) |
| user | user03@test.com | test1234 | 최소령 (소령) |
| user | ... | test1234 | user04~user22 |

## UUID 체계
- stores: `a1000000-...-00000000000X`
- tailors: `b1000000-...-00000000000X`
- admin users: `c1000000-...-00000000000X`
- store users: `c2000000-...-00000000000X`
- tailor users: `c3000000-...-00000000000X`
- general users: `d1000000-...-0000000000XX`
- categories: `eX000000-...-00000000000X`
- products: `f1000000-...-0000000000XX`
- specs: `aa100000-...-0000000000XX`
- delivery_zones: `ab100000-...-00000000000X`
- inventory: `acX00000-...-0000000000XX`

## UUID 체계 (추가)
- online orders: `b0100000-...-00000000000X`
- offline orders: `b0200000-...-0000000000XX`
- custom orders: `b0300000-...-00000000000X`
- custom order_items: `bc010000-...-00000000000X`
- tailoring_tickets: `bb000000-...-0000000000XX`

## 실행 방법
```sql
-- Supabase SQL Editor에서 순서대로 실행
-- 1. 001_initial_schema.sql  (테이블 생성)
-- 2. 002_schema_fix.sql      (스키마 수정)
-- 3. 003_rls_fix.sql         (RLS 정책 개선)
-- 4. seed.sql                (기본 데이터: 사용자, 품목, 재고, 포인트)
-- 5. 004_seed_orders.sql     (온라인 주문 5건)
-- 6. 005_seed_extended.sql   (오프라인 주문, 반품, 맞춤피복, 체척권)
```
