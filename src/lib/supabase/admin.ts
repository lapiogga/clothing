import { createClient } from "@supabase/supabase-js";

// 서비스 롤 키를 사용하는 관리자 전용 클라이언트
// Server Actions에서만 사용 (클라이언트 사이드 노출 금지)
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
