---
name: project-plan
description: 피복 구매관리 시스템 총괄 프로젝트 계획서. 전체 개발 로드맵, Phase별 산출물, 모듈 구조, 기술 결정 사항을 포함한다.
---

# 프로젝트 계획서

## 1. 프로젝트 단계 (Phase)

| Phase | 명칭 | 핵심 목표 | 담당 Agent |
|-------|------|-----------|------------|
| **0** | 프로젝트 초기화 | 환경 구성, 문서 체계 수립 | 총괄관리자, 기획 |
| **1** | 기획/설계 | 기능명세, DB설계, 화면설계, 설계 검증 | 기획, 설계, 데이터 |
| **2** | 기반 개발 | 인증, 권한, 공통 컴포넌트, DB 구축, 기초 데이터 관리 | 개발, 데이터 |
| **3** | 핵심 기능 개발 | 포인트, 판매/구매, 재고, 체척권 | 개발 |
| **4** | 통합/테스트 | 테스트 데이터 200건+, 기능/품질 테스트 | 테스트, 개발 |

## 2. 기능 모듈 분류 및 개발 순서

요건정의 8개 항목을 7개 모듈로 재구성:

```
M1 인증/권한 ──→ M2 사용자 관리 ──┐
                 M3 기초 데이터 ──┼──→ M5 포인트 관리 ──→ M6 판매/구매+재고
                 M4 품목 관리 ───┘                       M7 체척권
                 (M2~M4 병렬 가능)
```

| 모듈 | 명칭 | 요건 | Phase |
|------|------|------|-------|
| M1 | 인증/권한 | 요건2 | 2 |
| M2 | 사용자 관리 | 요건1 | 2 |
| M3 | 기초 데이터 (판매소, 업체, 배송지) | 요건1 | 2 |
| M4 | 품목 관리 (분류, 규격, 완제품/맞춤) | 요건3 | 2 |
| M5 | 포인트 관리 (산정, 지급, 일할계산) | 요건4,7 | 3 |
| M6 | 판매/구매 (오프라인, 온라인, 배송, 반품, 재고) | 요건5,6,7 | 3 |
| M7 | 체척권 (발행, 취소, 등록, 정산) | 요건8 | 3 |

## 3. Phase별 산출물

### Phase 0: 프로젝트 초기화 ✅
- [x] Next.js 프로젝트 초기화 (App Router, TypeScript, Tailwind)
- [x] shadcn/ui + doom-64 테마 설치
- [x] Supabase 클라이언트 설정
- [x] 디렉토리 구조 생성
- [x] Skill 생성: `project-plan/SKILL.md`, `coding-standards/SKILL.md`

### Phase 1: 기획/설계 ✅
- [x] Skill 생성: `functional-spec/SKILL.md` (기능명세서)
- [x] Skill 생성: `db-design/SKILL.md` (DB 설계서)
- [x] Skill 생성: `screen-spec/SKILL.md` (화면 명세서)
- [x] Skill 생성: `api-spec/SKILL.md` (API 명세서)
- [x] Skill 생성: `design-review/SKILL.md` (설계 검증 결과서)
- [x] 마이그레이션 SQL 파일 생성: `supabase/migrations/001_initial_schema.sql`

### Phase 2: 기반 개발
- [ ] DB 마이그레이션 SQL 실행
- [ ] M1~M4 구현
- [ ] Skill 생성: `test-plan/SKILL.md` (테스트 계획서)

### Phase 3: 핵심 기능 개발
- [ ] M5~M7 구현

### Phase 4: 통합/테스트
- [ ] 테스트 데이터 시드 (200건+)
- [ ] 기능/품질 테스트 실행
- [ ] Skill 생성: `test-data/SKILL.md`, `test-result/SKILL.md`

## 4. 데이터 모델 개요

### 주요 테이블
| 테이블 | 용도 | 핵심 관계 |
|--------|------|-----------|
| `users` | 사용자 (전 유형 통합) | role로 구분, store_id/tailor_id FK |
| `categories` | 품목 분류 (자기참조 3단계) | parent_id로 대/중/소 |
| `products` | 품목 | category_id FK, product_type(완제품/맞춤) |
| `product_specs` | 규격 (완제품만) | product_id FK |
| `stores` | 피복판매소 | |
| `tailors` | 체척업체 | |
| `delivery_zones` | 직접 배송지 | store_id FK |
| `inventory` | 재고 (판매소별, 규격별) | store_id + product_id + spec_id |
| `inventory_log` | 재고 변동 이력 | inventory_id FK |
| `point_ledger` | 포인트 원장 (이력) | user_id FK, type(지급/차감/추가/반환) |
| `point_summary` | 포인트 요약 (잔액) | user_id FK, total/used/reserved |
| `orders` | 주문 (온+오프 통합) | user_id, store_id, order_type |
| `order_items` | 주문 상세 | order_id, product_id, spec_id |
| `tailoring_tickets` | 체척권 | order_item_id, user_id, tailor_id |
| `tailor_settlements` | 체척업체 정산 | tailor_id FK |
| `menus` | 메뉴 관리 | parent_id, role_access |

## 5. 화면(페이지) 목록 (약 35개)

### 공통 (3개)
- `/` 랜딩/로그인, `/forgot-password`, `/change-password`

### 군수담당자 `/admin/...` (12개)
- 대시보드, 사용자 목록/등록, 포인트 산정/지급/현황, 품목 관리, 판매소 관리, 체척업체 관리, 체척권 관리, 정산, 메뉴 관리

### 피복판매소 `/store/...` (13개)
- 대시보드, 오프라인 판매/내역/반품, 온라인 주문관리/상세, 재고 현황/입고/조정, 배송지 관리, 통계(일별/품목별/사용자별)

### 체척업체 `/tailor/...` (3개)
- 대시보드, 체척권 등록, 체척권 현황

### 일반사용자 `/my/...` (8개)
- 메인(쇼핑), 품목 상세, 장바구니, 구매 확인, 구매 내역/상세, 포인트 현황, 체척권 현황

## 6. Next.js 프로젝트 구조

```
src/
├── app/
│   ├── layout.tsx, page.tsx (로그인)
│   ├── (auth)/          → forgot-password, change-password
│   ├── (admin)/layout.tsx → admin/...
│   ├── (store)/layout.tsx → store/...
│   ├── (tailor)/layout.tsx → tailor/...
│   └── (user)/layout.tsx → my/...
├── components/
│   ├── ui/          # shadcn/ui
│   ├── layout/      # header, nav-menu
│   ├── forms/       # 공통 폼
│   ├── tables/      # 공통 테이블
│   └── shared/      # 기타 공통
├── lib/
│   ├── supabase/    # client.ts, server.ts, middleware.ts
│   ├── utils.ts
│   └── constants.ts # 계급, 포인트 기준 등
├── hooks/
├── types/           # database.ts, index.ts
└── actions/         # Server Actions
```

## 7. 주요 기술 결정

| 항목 | 결정 | 이유 |
|------|------|------|
| 인증 | Supabase Auth (이메일/비밀번호) | 군 시스템, 소셜 로그인 불필요 |
| 권한 | Supabase RLS + Next.js 미들웨어 | DB+앱 이중 보호 |
| 데이터 페칭 | Server Actions + Supabase 직접 쿼리 | Next.js 권장 패턴 |
| 주문 테이블 | 온/오프라인 통합 (order_type 구분) | 포인트/재고 로직 일원화 |
| 포인트 | 원장(ledger) 패턴 | 모든 변동 이력 추적 |
| 재고 | 판매소별 + 규격별 | 요건정의 명시 사항 |

## 8. Skill 관리 계획 (총 11개)

| Skill | 생성 시점 | 상태 |
|-------|----------|------|
| `requirements/SKILL.md` | Phase 0 이전 | ✅ 완료 |
| `project-plan/SKILL.md` | Phase 0 | ✅ 완료 |
| `coding-standards/SKILL.md` | Phase 0 | ✅ 완료 |
| `functional-spec/SKILL.md` | Phase 1 | ✅ 완료 |
| `db-design/SKILL.md` | Phase 1 | ✅ 완료 |
| `screen-spec/SKILL.md` | Phase 1 | ✅ 완료 |
| `api-spec/SKILL.md` | Phase 1 | ✅ 완료 |
| `design-review/SKILL.md` | Phase 1 끝 | ✅ 완료 |
| `test-plan/SKILL.md` | Phase 4 | ✅ 완료 |
| `test-data/SKILL.md` | Phase 4 | ✅ 완료 |
| `test-result/SKILL.md` | Phase 4 | ✅ 완료 |

## 9. Phase 완료 현황

| Phase | 상태 | 완료일 |
|-------|------|--------|
| 0 | ✅ 완료 | 프로젝트 초기화 |
| 1 | ✅ 완료 | 기획/설계 문서 8건 |
| 2 | ✅ 완료 | M1~M4 기반 개발 |
| 3 | ✅ 완료 | M5~M7 핵심 기능 개발 |
| 4 | ✅ 완료 | 테스트 데이터 217건+, 품질 테스트 통과 |
