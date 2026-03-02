# 변경이력

## [v5.0] - 2026-03-03 (18ca3a8)

### 버그 수정
- 대시보드 미정산 체척권 집계 오류 수정
  - `settlement_id IS NULL` 조건 누락으로 정산 완료된 체척권까지 집계되던 문제 수정
- 체척권 정산 화면 hydration 에러 수정
  - Select 컴포넌트 `value` 초기값을 빈 문자열(`""`)에서 `"all"`로 변경
- `seed_additional.sql` point_ledger type 오류 수정
  - `'use'` → `'deduct'` (15건, check constraint 위반 수정)

### 추가
- `/api/fix-auth`: Supabase Admin API 기반 테스트 사용자 비밀번호 재설정 엔드포인트 (개발 전용)
- `supabase/migrations/007_seed_comprehensive.sql`: 종합 확장 시드 데이터 (판매소 5개, 품목 50개, 주문 60건 등)

---

## [v4.0] - 2026-02-xx (ed99d5d)

### 개선
- UI/UX 전면 개선 및 대시보드 개편
- 운영 환경 `/api/seed` 접근 차단 (d833804)

---

## [v3.0] - 2026-02-24 (c34bf63)

### 개선
- 버그 수정 및 E2E 재검증 완료
- 프로젝트 규칙, 테스트 산출물, 문서, 스크린샷 추가 (3216fe7)

---

## [v2.0] - 2026-02-xx (fdb1ed4)

### 추가
- 기능 추가 및 테스트 이슈 수정
- 에이전트 역할 설정 추가 및 관리자/사용자 화면 개선 (d31f373)

---

## [v1.0] - 2026-02-xx (cffae9e)

### 최초 구현
- 피복 구매관리 시스템 초기 구현
- 주문 관리 및 DB 설정 (79987be)
