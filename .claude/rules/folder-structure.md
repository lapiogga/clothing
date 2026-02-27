# 폴더 구조

```
src/
├── actions/        # Server Actions (데이터 변경 로직)
├── app/            # Next.js App Router 페이지
│   ├── (admin)/    # 군수담당자 페이지
│   ├── (auth)/     # 인증 페이지 (로그인, 비밀번호 변경 등)
│   ├── (store)/    # 피복판매소 담당자 페이지
│   ├── (tailor)/   # 체척업체 담당자 페이지
│   ├── (user)/     # 일반사용자 페이지
│   └── api/        # API 라우트
├── components/     # 공통 컴포넌트
│   ├── forms/      # 폼 컴포넌트
│   ├── layout/     # 레이아웃 컴포넌트 (Header 등)
│   ├── shared/     # 공유 컴포넌트
│   ├── tables/     # 테이블 컴포넌트
│   └── ui/         # shadcn/ui 기본 컴포넌트
├── lib/            # 유틸리티 및 설정
│   ├── supabase/   # Supabase 클라이언트 3종
│   ├── constants.ts
│   ├── menu-config.ts
│   └── utils.ts
└── types/          # TypeScript 타입 정의
```
