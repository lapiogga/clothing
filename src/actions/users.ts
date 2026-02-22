"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function getUsers({
  page = 1,
  limit = 20,
  role,
  rank,
  search,
}: {
  page?: number;
  limit?: number;
  role?: string;
  rank?: string;
  search?: string;
} = {}) {
  const supabase = await createClient();
  const offset = (page - 1) * limit;

  let query = supabase
    .from("users")
    .select("*, stores(name), tailors(name)", { count: "exact" });

  if (role) query = query.eq("role", role);
  if (rank) query = query.eq("rank", rank);
  if (search) query = query.or(`name.ilike.%${search}%,military_number.ilike.%${search}%`);

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return { users: [], total: 0, error: error.message };
  return { users: data || [], total: count || 0 };
}

export async function getUserById(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .select("*, stores(name), tailors(name)")
    .eq("id", id)
    .single();

  if (error) return { user: null, error: error.message };
  return { user: data };
}

export async function createUser(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const name = formData.get("name") as string;
  const role = formData.get("role") as string;
  const rank = formData.get("rank") as string || null;
  const military_number = formData.get("military_number") as string || null;
  const unit = formData.get("unit") as string || null;
  const enlist_date = formData.get("enlist_date") as string || null;
  const promotion_date = formData.get("promotion_date") as string || null;
  const retirement_date = formData.get("retirement_date") as string || null;
  const store_id = formData.get("store_id") as string || null;
  const tailor_id = formData.get("tailor_id") as string || null;

  // 유효성 검사
  if (!email || !name || !role) {
    return { success: false, error: "필수 항목을 입력하세요" };
  }
  if (role === "store" && !store_id) {
    return { success: false, error: "판매소 담당자는 소속 판매소를 선택하세요" };
  }
  if (role === "tailor" && !tailor_id) {
    return { success: false, error: "체척업체 담당자는 소속 업체를 선택하세요" };
  }

  // Supabase Auth에 사용자 생성 (서비스 롤 키 필요)
  const adminClient = createAdminClient();
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password: "1111",
    email_confirm: true,
  });

  if (authError) {
    if (authError.message.includes("already")) {
      return { success: false, error: "이미 등록된 이메일입니다" };
    }
    return { success: false, error: authError.message };
  }

  // users 테이블에 저장
  const { error: insertError } = await supabase.from("users").insert({
    id: authData.user.id,
    email,
    name,
    role,
    rank,
    military_number,
    unit,
    enlist_date: enlist_date || null,
    promotion_date: promotion_date || null,
    retirement_date: retirement_date || null,
    store_id: store_id || null,
    tailor_id: tailor_id || null,
  });

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  // point_summary 초기 레코드 생성 (일반사용자만)
  if (role === "user") {
    await supabase.from("point_summary").insert({
      user_id: authData.user.id,
      total_points: 0,
      used_points: 0,
      reserved_points: 0,
    });
  }

  revalidatePath("/admin/users");
  return { success: true };
}

export async function updateUser(id: string, formData: FormData) {
  const supabase = await createClient();

  const name = formData.get("name") as string;
  const rank = formData.get("rank") as string || null;
  const unit = formData.get("unit") as string || null;
  const promotion_date = formData.get("promotion_date") as string || null;
  const retirement_date = formData.get("retirement_date") as string || null;
  const is_active = formData.get("is_active") === "true";

  const { error } = await supabase
    .from("users")
    .update({
      name,
      rank,
      unit,
      promotion_date: promotion_date || null,
      retirement_date: retirement_date || null,
      is_active,
    })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/users");
  return { success: true };
}

// 판매소 목록 (드롭다운용)
export async function getStoresList() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("stores")
    .select("id, name")
    .eq("is_active", true)
    .order("name");
  return data || [];
}

// 체척업체 목록 (드롭다운용)
export async function getTailorsList() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tailors")
    .select("id, name")
    .eq("is_active", true)
    .order("name");
  return data || [];
}
