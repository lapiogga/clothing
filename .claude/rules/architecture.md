# 아키텍처 개요

## 라우팅 구조 (역할별 분리)

```
(admin)/    → /admin/...   군수담당자 (role: "admin")
(store)/    → /store/...   피복판매소 담당자 (role: "store")
(tailor)/   → /tailor/...  체척업체 담당자 (role: "tailor")
(user)/     → /my/...      일반사용자 (role: "user")
(auth)/     → /login, /forgot-password, /change-password 등
```

`src/middleware.ts` → `lib/supabase/middleware.ts`에서 역할별 경로 접근 제어. 비인증 사용자는 `/`로, 잘못된 역할로 접근 시 본인 역할의 대시보드로 리다이렉트.

## Supabase 클라이언트 3종

| 파일 | 용도 |
|------|------|
| `lib/supabase/server.ts` | Server Component / Server Action에서 사용 (쿠키 기반 세션) |
| `lib/supabase/client.ts` | Client Component에서 사용 (브라우저 세션) |
| `lib/supabase/admin.ts` | 서비스 롤 키 사용, Server Action 전용 (사용자 생성 등 RLS 우회 필요 시) |

**규칙**: `admin` 클라이언트는 RLS 우회가 반드시 필요한 경우에만 사용. 일반 데이터 조작은 `server` 클라이언트 사용.

## Server Actions 패턴

모든 데이터 변경은 `src/actions/` 아래 Server Action으로 처리. 각 파일 상단에 `"use server"` 선언. `createClient()`로 Supabase 클라이언트 생성 후 `supabase.auth.getUser()`로 인증 확인.

```typescript
// 현재 로그인 사용자 조회 (stores, tailors 관계 포함)
import { getCurrentUser } from "@/actions/auth";
const user = await getCurrentUser();  // user.store_id, user.tailor_id 포함
```

**Server Action 반환 타입**: 모든 액션은 `{ success: boolean, error?: string }` 형태로 반환.

```typescript
// 성공 시
return { success: true, order_id: order.id };
// 실패 시
return { success: false, error: "인증이 필요합니다" };
```

**데이터 변경 후 반드시 `revalidatePath()`를 호출**해 캐시를 무효화.

## 페이지 컴포넌트 패턴

- **Server Component (기본)**: 페이지에서 직접 Supabase 쿼리 후 렌더링
- **Client Component**: 상태/이벤트가 필요한 경우 별도 파일로 분리, `_components/` 폴더에 위치
- 예시: `store/dashboard/page.tsx` (Server) + `store/dashboard/_components/refresh-button.tsx` (Client)

## 레이아웃 구조

각 역할별 `layout.tsx`에서 `getCurrentUser()`로 사용자 정보를 가져와 `Header` 컴포넌트에 전달. `MENU_CONFIG`(lib/menu-config.ts)에서 역할별 메뉴 항목 관리.
