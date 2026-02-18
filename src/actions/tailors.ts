"use server";

import { createClient } from "@/lib/supabase/server";
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
  const { error } = await supabase.from("tailors").insert({
    name: formData.get("name") as string,
    business_number: formData.get("business_number") as string || null,
    representative: formData.get("representative") as string || null,
    address: formData.get("address") as string || null,
    phone: formData.get("phone") as string || null,
    bank_name: formData.get("bank_name") as string || null,
    account_number: formData.get("account_number") as string || null,
    account_holder: formData.get("account_holder") as string || null,
  });

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/tailors");
  return { success: true };
}

export async function updateTailor(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tailors")
    .update({
      name: formData.get("name") as string,
      business_number: formData.get("business_number") as string || null,
      representative: formData.get("representative") as string || null,
      address: formData.get("address") as string || null,
      phone: formData.get("phone") as string || null,
      bank_name: formData.get("bank_name") as string || null,
      account_number: formData.get("account_number") as string || null,
      account_holder: formData.get("account_holder") as string || null,
      is_active: formData.get("is_active") === "true",
    })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/tailors");
  return { success: true };
}

export async function deleteTailor(id: string) {
  const supabase = await createClient();

  // 등록된 체척권 확인
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
