---
name: coding-standards
description: 피복 구매관리 시스템 코딩 표준. 코드 작성, 네이밍, 파일 구조, 컴포넌트 패턴 등의 가이드라인을 정의한다.
---

# 코딩 표준

## 1. 일반 규칙

### 언어
- **코드 주석**: 한국어
- **변수/함수/클래스명**: 영어 (camelCase / PascalCase)
- **파일명**: 영어 (kebab-case 또는 camelCase)

### 원칙
- 간결하고 읽기 쉬운 코드 우선
- 불필요한 추상화, 과도한 엔지니어링 금지
- 기존 코드 스타일/패턴을 따를 것
- DRY(Don't Repeat Yourself) 원칙 준수하되 과도한 추상화 지양

## 2. TypeScript

### 타입 정의
- `any` 타입 사용 금지, 불가피한 경우 `unknown` 사용
- 인터페이스보다 `type` 선호 (일관성)
- DB 관련 타입은 `src/types/database.ts`에 정의
- 비즈니스 타입은 `src/types/index.ts`에 정의

### 네이밍
```typescript
// 타입/인터페이스: PascalCase
type UserRole = "admin" | "store" | "tailor" | "user";

// 변수/함수: camelCase
const pointBalance = 100000;
function calculatePoints() {}

// 상수: UPPER_SNAKE_CASE
const ANNUAL_POINTS = 1_000_000;

// 컴포넌트: PascalCase
function UserListTable() {}

// 파일명: kebab-case (컴포넌트 제외)
// utils.ts, constants.ts, auth.ts

// 컴포넌트 파일: PascalCase 또는 Next.js 규칙 따름
// page.tsx, layout.tsx (Next.js), UserListTable.tsx (컴포넌트)
```

## 3. React / Next.js

### 컴포넌트 패턴
```typescript
// Server Component (기본)
export default async function PageName() {
  const data = await fetchData();
  return <div>{/* ... */}</div>;
}

// Client Component (상태/이벤트 필요 시)
"use client";
export default function FormComponent() {
  const [state, setState] = useState();
  return <div>{/* ... */}</div>;
}
```

### Server Actions
```typescript
"use server";

import { createClient } from "@/lib/supabase/server";

export async function actionName(formData: FormData) {
  const supabase = await createClient();
  // 인증 확인
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("인증이 필요합니다");
  // 비즈니스 로직
}
```

### 파일 구조 규칙
- `page.tsx`: 라우트 페이지 (Server Component 기본)
- `layout.tsx`: 라우트 레이아웃
- `loading.tsx`: 로딩 UI
- `error.tsx`: 에러 UI
- `actions/`: Server Actions (도메인별 분리)
- `components/ui/`: shadcn/ui 컴포넌트 (수정 금지)
- `components/layout/`: 레이아웃 컴포넌트 (헤더, 사이드바)
- `components/forms/`: 공통 폼 컴포넌트
- `components/tables/`: 공통 테이블 컴포넌트
- `components/shared/`: 기타 공통 컴포넌트

## 4. Supabase

### 클라이언트 사용
```typescript
// Server Component / Server Action
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient();

// Client Component
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();
```

### 쿼리 패턴
```typescript
// 목록 조회 (페이지네이션)
const { data, error, count } = await supabase
  .from("users")
  .select("*", { count: "exact" })
  .range(offset, offset + limit - 1)
  .order("created_at", { ascending: false });

// 단건 조회
const { data, error } = await supabase
  .from("users")
  .select("*")
  .eq("id", id)
  .single();

// 삽입
const { data, error } = await supabase
  .from("users")
  .insert({ name, email, role })
  .select()
  .single();
```

## 5. UI / shadcn

### 테마
- **doom-64** 테마 사용 (다크 모드 기본)
- shadcn/ui 컴포넌트 파일 직접 수정 금지
- 커스터마이징은 `className` prop으로 처리

### 폼 처리
- `react-hook-form` + `zod` 조합 사용 (shadcn/ui form)
- 유효성 검사는 zod 스키마로 정의

### 테이블
- shadcn/ui `Table` 컴포넌트 사용
- 페이지네이션은 공통 컴포넌트로 구현

## 6. 에러 처리

```typescript
// Server Action 에러 반환 패턴
export async function createUser(formData: FormData) {
  try {
    // 비즈니스 로직
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: "처리 중 오류가 발생했습니다" };
  }
}
```

## 7. 보안

- SQL 인젝션: Supabase 클라이언트 사용으로 방지 (직접 SQL 금지)
- XSS: React 기본 이스케이프 활용, `dangerouslySetInnerHTML` 사용 금지
- 인증: 모든 Server Action에서 인증 확인 필수
- 권한: RLS + 미들웨어 이중 검증
- 환경변수: `.env.local`에 보관, 커밋 금지
