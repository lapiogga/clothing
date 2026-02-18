"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// === 카테고리 ===

export async function getCategories(parentId?: string | null, level?: number) {
  const supabase = await createClient();
  let query = supabase.from("categories").select("*").order("sort_order").order("name");

  if (parentId) query = query.eq("parent_id", parentId);
  else if (parentId === null && level === 1) query = query.is("parent_id", null);
  if (level) query = query.eq("level", level);

  const { data, error } = await query;
  if (error) return [];
  return data || [];
}

export async function getAllCategories() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("level")
    .order("sort_order")
    .order("name");
  return data || [];
}

export async function createCategory(formData: FormData) {
  const supabase = await createClient();
  const level = parseInt(formData.get("level") as string);
  const parent_id = formData.get("parent_id") as string || null;

  const { error } = await supabase.from("categories").insert({
    name: formData.get("name") as string,
    parent_id: parent_id || null,
    level,
    sort_order: parseInt(formData.get("sort_order") as string) || 0,
  });

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/products");
  return { success: true };
}

export async function updateCategory(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({
      name: formData.get("name") as string,
      sort_order: parseInt(formData.get("sort_order") as string) || 0,
      is_active: formData.get("is_active") !== "false",
    })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/products");
  return { success: true };
}

export async function deleteCategory(id: string) {
  const supabase = await createClient();

  // 하위 분류 확인
  const { count } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", id);

  if (count && count > 0) {
    return { success: false, error: "하위 분류가 있어 삭제할 수 없습니다" };
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/products");
  return { success: true };
}

// === 품목 ===

export async function getProducts({
  page = 1,
  limit = 20,
  category_id,
  product_type,
  search,
  is_active,
}: {
  page?: number;
  limit?: number;
  category_id?: string;
  product_type?: string;
  search?: string;
  is_active?: boolean;
} = {}) {
  const supabase = await createClient();
  const offset = (page - 1) * limit;

  let query = supabase
    .from("products")
    .select("*, categories(name)", { count: "exact" });

  if (category_id) query = query.eq("category_id", category_id);
  if (product_type) query = query.eq("product_type", product_type);
  if (search) query = query.ilike("name", `%${search}%`);
  if (is_active !== undefined) query = query.eq("is_active", is_active);

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return { products: [], total: 0 };
  return { products: data || [], total: count || 0 };
}

export async function getProductById(id: string) {
  const supabase = await createClient();

  const { data: product, error } = await supabase
    .from("products")
    .select("*, categories(id, name, parent_id, level)")
    .eq("id", id)
    .single();

  if (error) return { product: null };

  const { data: specs } = await supabase
    .from("product_specs")
    .select("*")
    .eq("product_id", id)
    .order("sort_order")
    .order("spec_name");

  return { product, specs: specs || [] };
}

export async function createProduct(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("products").insert({
    name: formData.get("name") as string,
    category_id: formData.get("category_id") as string,
    product_type: formData.get("product_type") as string,
    price: parseInt(formData.get("price") as string) || 0,
    image_url: formData.get("image_url") as string || null,
    description: formData.get("description") as string || null,
  });

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/products");
  return { success: true };
}

export async function updateProduct(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({
      name: formData.get("name") as string,
      category_id: formData.get("category_id") as string,
      price: parseInt(formData.get("price") as string) || 0,
      image_url: formData.get("image_url") as string || null,
      description: formData.get("description") as string || null,
      is_active: formData.get("is_active") !== "false",
    })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/products");
  return { success: true };
}

// === 규격 ===

export async function getSpecs(productId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("product_specs")
    .select("*")
    .eq("product_id", productId)
    .order("sort_order")
    .order("spec_name");
  return data || [];
}

export async function createSpec(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("product_specs").insert({
    product_id: formData.get("product_id") as string,
    spec_name: formData.get("spec_name") as string,
    sort_order: parseInt(formData.get("sort_order") as string) || 0,
  });

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/products");
  return { success: true };
}

export async function updateSpec(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("product_specs")
    .update({
      spec_name: formData.get("spec_name") as string,
      sort_order: parseInt(formData.get("sort_order") as string) || 0,
      is_active: formData.get("is_active") !== "false",
    })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/products");
  return { success: true };
}

export async function deleteSpec(id: string) {
  const supabase = await createClient();

  // 재고 확인
  const { count } = await supabase
    .from("inventory")
    .select("id", { count: "exact", head: true })
    .eq("spec_id", id);

  if (count && count > 0) {
    return { success: false, error: "관련 재고가 있어 삭제할 수 없습니다" };
  }

  const { error } = await supabase.from("product_specs").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/products");
  return { success: true };
}
