# 시스템 개요

군 피복 포인트 기반 온/오프라인 구매관리 시스템. 계급별 피복포인트를 지급하고, 피복판매소를 통한 온라인/오프라인 구매, 재고관리, 체척권(맞춤피복) 관리를 수행한다.

## 개발 명령어

```bash
npm run dev       # 개발 서버 실행 (localhost:3000)
npm run build     # 프로덕션 빌드
npm run lint      # ESLint 검사
```

환경변수 필수: `.env.local`에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` 설정.

## 기술 스택

- **Next.js 16** (App Router, React 19, TypeScript)
- **Supabase** (PostgreSQL + Auth + RLS)
- **shadcn/ui** (Tailwind CSS v4, radix-ui)
- **폼**: react-hook-form + zod
- **알림**: sonner (toast)
