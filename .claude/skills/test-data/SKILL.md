# 피복 구매관리 시스템 - 테스트 데이터 명세

## 개요
`supabase/seed.sql` 파일에 217건 이상의 테스트 데이터가 정의되어 있다.

## 데이터 분포

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
| **합계** | **217+** | |

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

## 실행 방법
```sql
-- Supabase SQL Editor에서 실행
-- 1. 먼저 001_initial_schema.sql 실행 (테이블 생성)
-- 2. 002_schema_fix.sql 실행 (스키마 수정)
-- 3. seed.sql 실행 (테스트 데이터)
```
