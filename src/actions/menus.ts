"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getMenus() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menus")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return { menus: [] };
  return { menus: data || [] };
}

export async function createMenu(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "인증이 필요합니다" };

  const roleAccess = formData.getAll("role_access") as string[];
  const parentId = (formData.get("parent_id") as string) || null;

  const { error } = await supabase.from("menus").insert({
    name: formData.get("name") as string,
    url: (formData.get("url") as string) || null,
    parent_id: parentId,
    sort_order: parseInt((formData.get("sort_order") as string) || "0"),
    role_access: roleAccess,
    is_active: formData.get("is_active") === "true",
  });

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/menus");
  return { success: true };
}

export async function updateMenu(id: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "인증이 필요합니다" };

  const roleAccess = formData.getAll("role_access") as string[];
  const parentId = (formData.get("parent_id") as string) || null;

  const { error } = await supabase
    .from("menus")
    .update({
      name: formData.get("name") as string,
      url: (formData.get("url") as string) || null,
      parent_id: parentId,
      sort_order: parseInt((formData.get("sort_order") as string) || "0"),
      role_access: roleAccess,
      is_active: formData.get("is_active") === "true",
    })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/menus");
  return { success: true };
}

export async function deleteMenu(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "인증이 필요합니다" };

  // 하위 메뉴 확인
  const { count } = await supabase
    .from("menus")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", id);

  if (count && count > 0) {
    return { success: false, error: "하위 메뉴가 있어 삭제할 수 없습니다" };
  }

  const { error } = await supabase.from("menus").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/menus");
  return { success: true };
}
