import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// 역할별 허용 경로 접두사
const ROLE_PATHS: Record<string, string> = {
  admin: "/admin",
  store: "/store",
  tailor: "/tailor",
  user: "/my",
};

// 역할별 기본 리다이렉트 경로
const ROLE_REDIRECTS: Record<string, string> = {
  admin: "/admin/dashboard",
  store: "/store/dashboard",
  tailor: "/tailor/dashboard",
  user: "/my/shop",
};

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // 공개 경로
  const publicPaths = ["/", "/forgot-password", "/change-password"];
  const isPublicPath = publicPaths.includes(pathname);

  // 비인증 사용자 → 공개 경로만 허용
  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // 인증된 사용자가 로그인 페이지 접근 → 역할별 대시보드로
  if (user && pathname === "/") {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role) {
      const url = request.nextUrl.clone();
      url.pathname = ROLE_REDIRECTS[profile.role] || "/my/shop";
      return NextResponse.redirect(url);
    }
  }

  // 역할별 경로 접근 제어
  if (user) {
    const protectedPrefixes = ["/admin", "/store", "/tailor", "/my"];
    const matchedPrefix = protectedPrefixes.find((p) => pathname.startsWith(p));

    if (matchedPrefix) {
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      const userRole = profile?.role;
      const allowedPrefix = userRole ? ROLE_PATHS[userRole] : null;

      if (allowedPrefix !== matchedPrefix) {
        const url = request.nextUrl.clone();
        url.pathname = userRole ? ROLE_REDIRECTS[userRole] : "/";
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
