import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 개발/테스트 전용 시드 라우트 - 운영 환경에서는 제거할 것
const SEED_KEY = "seed-military-2026";

const TEST_USERS = [
  // admin
  { email: "admin1@test.com", role: "admin", name: "홍관리", rank: "major", unit: "군수사령부", id: "c1000000-0000-0000-0000-000000000001" },
  { email: "admin2@test.com", role: "admin", name: "김관리", rank: "captain", unit: "군수사령부", id: "c1000000-0000-0000-0000-000000000002" },
  // store
  { email: "store1@test.com", role: "store", name: "김판매", unit: "제1피복판매소", id: "c2000000-0000-0000-0000-000000000001", store_id: "a1000000-0000-0000-0000-000000000001" },
  { email: "store2@test.com", role: "store", name: "이판매", unit: "제2피복판매소", id: "c2000000-0000-0000-0000-000000000002", store_id: "a1000000-0000-0000-0000-000000000002" },
  { email: "store3@test.com", role: "store", name: "박판매", unit: "제3피복판매소", id: "c2000000-0000-0000-0000-000000000003", store_id: "a1000000-0000-0000-0000-000000000003" },
  // tailor
  { email: "tailor1@test.com", role: "tailor", name: "정체척", unit: "대한맞춤피복", id: "c3000000-0000-0000-0000-000000000001", tailor_id: "b1000000-0000-0000-0000-000000000001" },
  { email: "tailor2@test.com", role: "tailor", name: "강체척", unit: "우리체척업체", id: "c3000000-0000-0000-0000-000000000002", tailor_id: "b1000000-0000-0000-0000-000000000002" },
  { email: "tailor3@test.com", role: "tailor", name: "최체척", unit: "군복전문점", id: "c3000000-0000-0000-0000-000000000003", tailor_id: "b1000000-0000-0000-0000-000000000003" },
  // user 5명만 (대표 샘플)
  { email: "user01@test.com", role: "user", name: "이장교", rank: "captain", unit: "보병1사단", id: "d1000000-0000-0000-0000-000000000001" },
  { email: "user02@test.com", role: "user", name: "박장교", rank: "first_lt", unit: "보병2사단", id: "d1000000-0000-0000-0000-000000000002" },
  { email: "user03@test.com", role: "user", name: "김부사관", rank: "sgt_major", unit: "보병3사단", id: "d1000000-0000-0000-0000-000000000003" },
  { email: "user04@test.com", role: "user", name: "최부사관", rank: "master_sgt", unit: "기갑1사단", id: "d1000000-0000-0000-0000-000000000004" },
  { email: "user05@test.com", role: "user", name: "정군무원", rank: "civil_servant", unit: "군수사령부", id: "d1000000-0000-0000-0000-000000000005" },
];

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("key") !== SEED_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const results: { email: string; status: string; detail?: string }[] = [];

  for (const u of TEST_USERS) {
    try {
      // Admin API로 유저 생성 (이미 존재하면 비밀번호만 갱신)
      const { data, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: "test1234",
        email_confirm: true,
        user_metadata: { name: u.name },
      });

      if (error) {
        if (error.message.includes("already been registered")) {
          // 이미 존재 → 비밀번호 업데이트
          const { data: existing } = await supabase
            .from("auth.users" as any)
            .select("id")
            .eq("email", u.email)
            .single();

          // users 테이블에서 ID로 업데이트
          const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
          const found = authUsers.find((au) => au.email === u.email);
          if (found) {
            await supabase.auth.admin.updateUserById(found.id, { password: "test1234" });
            results.push({ email: u.email, status: "updated" });
          } else {
            results.push({ email: u.email, status: "error", detail: "not found" });
          }
        } else {
          results.push({ email: u.email, status: "error", detail: error.message });
        }
        continue;
      }

      if (data.user) {
        // public.users 테이블 upsert
        await supabase.from("users").upsert({
          id: data.user.id,
          email: u.email,
          name: u.name,
          role: u.role,
          rank: (u as any).rank || null,
          unit: u.unit || null,
          store_id: (u as any).store_id || null,
          tailor_id: (u as any).tailor_id || null,
          is_active: true,
        }, { onConflict: "email" });

        // point_summary (일반사용자만)
        if (u.role === "user") {
          await supabase.from("point_summary").upsert({
            user_id: data.user.id,
            total_points: 600000,
            used_points: 0,
            reserved_points: 0,
          }, { onConflict: "user_id" });
        }

        results.push({ email: u.email, status: "created" });
      }
    } catch (e: any) {
      results.push({ email: u.email, status: "error", detail: e.message });
    }
  }

  return NextResponse.json({ results });
}
