"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getStores({
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

  let query = supabase.from("stores").select("*", { count: "exact" });
  if (search) query = query.ilike("name", `%${search}%`);
  if (is_active !== undefined) query = query.eq("is_active", is_active);

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return { stores: [], total: 0 };
  return { stores: data || [], total: count || 0 };
}

export async function createStore(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("stores").insert({
    name: formData.get("name") as string,
    address: formData.get("address") as string || null,
    phone: formData.get("phone") as string || null,
    manager_name: formData.get("manager_name") as string || null,
  });

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/stores");
  return { success: true };
}

export async function updateStore(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("stores")
    .update({
      name: formData.get("name") as string,
      address: formData.get("address") as string || null,
      phone: formData.get("phone") as string || null,
      manager_name: formData.get("manager_name") as string || null,
      is_active: formData.get("is_active") === "true",
    })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/stores");
  return { success: true };
}

export async function deleteStore(id: string) {
  const supabase = await createClient();

  // 소속 사용자 확인
  const { count } = await supabase
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("store_id", id);

  if (count && count > 0) {
    return { success: false, error: "소속 사용자가 있어 삭제할 수 없습니다" };
  }

  const { error } = await supabase.from("stores").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/stores");
  return { success: true };
}
