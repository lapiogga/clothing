"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function getTailors({
  page = 1,
  limit = 20,
  search,
  is_active,
}: {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
} = {}) {
  const supabase = await createClient();
  const offset = (page - 1) * limit;

  let query = supabase.from("tailors").select("*", { count: "exact" });
  if (search) query = query.ilike("name", `%${search}%`);
  if (is_active !== undefined) query = query.eq("is_active", is_active);

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return { tailors: [], total: 0 };
  return { tailors: data || [], total: count || 0 };
}

export async function createTailor(formData: FormData) {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const email = formData.get("email") as string;
  const name = formData.get("name") as string;

  if (!email) return { success: false, error: "이메일을 입력하세요" };

  // Supabase Auth에 계정 생성 (초기 패스워드: 1111)
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

  // tailors 테이블에 업체 등록
  const { data: tailorData, error: tailorError } = await supabase
    .from("tailors")
    .insert({
      name,
      email,
      business_number: (formData.get("business_number") as string) || null,
      representative: (formData.get("representative") as string) || null,
      address: (formData.get("address") as string) || null,
      phone: (formData.get("phone") as string) || null,
      bank_name: (formData.get("bank_name") as string) || null,
      account_number: (formData.get("account_number") as string) || null,
      account_holder: (formData.get("account_holder") as string) || null,
    })
    .select("id")
    .single();

  if (tailorError) {
    await adminClient.auth.admin.deleteUser(authData.user.id);
    return { success: false, error: tailorError.message };
  }

  // users 테이블에 role='tailor'로 등록
  const { error: userError } = await supabase.from("users").insert({
    id: authData.user.id,
    email,
    name,
    role: "tailor",
    tailor_id: tailorData?.id || null,
  });

  if (userError) {
    await adminClient.auth.admin.deleteUser(authData.user.id);
    return { success: false, error: userError.message };
  }

  revalidatePath("/admin/tailors");
  return { success: true };
}

export async function updateTailor(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tailors")
    .update({
      name: formData.get("name") as string,
      business_number: (formData.get("business_number") as string) || null,
      representative: (formData.get("representative") as string) || null,
      address: (formData.get("address") as string) || null,
      phone: (formData.get("phone") as string) || null,
      bank_name: (formData.get("bank_name") as string) || null,
      account_number: (formData.get("account_number") as string) || null,
      account_holder: (formData.get("account_holder") as string) || null,
      is_active: formData.get("is_active") === "true",
    })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/tailors");
  return { success: true };
}

export async function deleteTailor(id: string) {
  const supabase = await createClient();

  const { count } = await supabase
    .from("tailoring_tickets")
    .select("id", { count: "exact", head: true })
    .eq("tailor_id", id);

  if (count && count > 0) {
    return { success: false, error: "등록된 체척권이 있어 삭제할 수 없습니다" };
  }

  const { error } = await supabase.from("tailors").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/tailors");
  return { success: true };
}
