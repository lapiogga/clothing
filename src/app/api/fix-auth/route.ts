import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 개발/테스트 전용 - 사용 후 삭제
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // 전체 auth 사용자 목록 조회
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({ perPage: 200 });
  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500 });
  }

  const testUsers = users.filter((u) => u.email?.endsWith("@test.com"));
  const results: { email: string; status: string; error?: string }[] = [];

  for (const user of testUsers) {
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      password: "test1234",
      email_confirm: true,
    });

    results.push({
      email: user.email ?? "",
      status: error ? "error" : "ok",
      error: error?.message,
    });
  }

  return NextResponse.json({ total: testUsers.length, results });
}
