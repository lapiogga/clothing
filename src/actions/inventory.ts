"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// 재고 목록 조회
export async function getInventory({
  page = 1,
  limit = 20,
  store_id,
  search,
  category_id,
}: {
  page?: number;
  limit?: number;
  store_id?: string;
  search?: string;
  category_id?: string;
} = {}) {
  const supabase = await createClient();
  const offset = (page - 1) * limit;

  let query = supabase
    .from("inventory")
    .select(
      "*, products(name, category_id), product_specs(spec_name), stores(name)",
      { count: "exact" }
    );

  if (store_id) query = query.eq("store_id", store_id);
  if (search) query = query.ilike("products.name", `%${search}%`);
  if (category_id) query = query.eq("products.category_id", category_id);

  const { data, error, count } = await query
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return { inventory: [], total: 0 };
  return { inventory: data || [], total: count || 0 };
}

// 입고 처리
export async function processIncoming(data: {
  store_id: string;
  items: { product_id: string; spec_id: string; quantity: number }[];
}) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return { success: false, error: "인증이 필요합니다" };
  const { data: currentUser } = await supabase.from("users").select("role").eq("id", authUser.id).single();
  if (!currentUser || !["admin", "store"].includes(currentUser.role)) {
    return { success: false, error: "권한이 없습니다" };
  }

  for (const item of data.items) {
    // 기존 재고 조회
    const { data: existing } = await supabase
      .from("inventory")
      .select("id, quantity")
      .eq("store_id", data.store_id)
      .eq("product_id", item.product_id)
      .eq("spec_id", item.spec_id)
      .single();

    let inventoryId: string;

    if (existing) {
      await supabase
        .from("inventory")
        .update({ quantity: existing.quantity + item.quantity })
        .eq("id", existing.id);
      inventoryId = existing.id;
    } else {
      const { data: newInv } = await supabase
        .from("inventory")
        .insert({
          store_id: data.store_id,
          product_id: item.product_id,
          spec_id: item.spec_id,
          quantity: item.quantity,
        })
        .select("id")
        .single();
      if (!newInv) return { success: false, error: "재고 등록에 실패했습니다" };
      inventoryId = newInv.id;
    }

    // 변동 이력
    await supabase.from("inventory_log").insert({
      inventory_id: inventoryId,
      log_type: "incoming",
      quantity: item.quantity,
      created_by: authUser?.id,
    });
  }

  revalidatePath("/store/inventory");
  return { success: true };
}

// 재고 조정
export async function adjustInventory(data: {
  inventory_id: string;
  adjust_type: "adjust_up" | "adjust_down";
  quantity: number;
  reason?: string;
}) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return { success: false, error: "인증이 필요합니다" };
  const { data: currentUser } = await supabase.from("users").select("role").eq("id", authUser.id).single();
  if (!currentUser || !["admin", "store"].includes(currentUser.role)) {
    return { success: false, error: "권한이 없습니다" };
  }

  const { data: inv } = await supabase
    .from("inventory")
    .select("id, quantity")
    .eq("id", data.inventory_id)
    .single();

  if (!inv) return { success: false, error: "재고를 찾을 수 없습니다" };

  const newQty = data.adjust_type === "adjust_up"
    ? inv.quantity + data.quantity
    : inv.quantity - data.quantity;

  if (newQty < 0) return { success: false, error: "재고가 음수가 될 수 없습니다" };

  await supabase
    .from("inventory")
    .update({ quantity: newQty })
    .eq("id", data.inventory_id);

  await supabase.from("inventory_log").insert({
    inventory_id: data.inventory_id,
    log_type: data.adjust_type,
    quantity: data.quantity,
    reason: data.reason || null,
    created_by: authUser?.id,
  });

  revalidatePath("/store/inventory");
  return { success: true };
}

// 재고 변동 이력 조회
export async function getInventoryLog({
  inventory_id,
  page = 1,
  limit = 20,
}: {
  inventory_id?: string;
  page?: number;
  limit?: number;
}) {
  const supabase = await createClient();
  const offset = (page - 1) * limit;

  let query = supabase
    .from("inventory_log")
    .select("*, inventory(products(name), product_specs(spec_name), stores(name))", { count: "exact" });

  if (inventory_id) query = query.eq("inventory_id", inventory_id);

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return { logs: [], total: 0 };
  return { logs: data || [], total: count || 0 };
}

// 판매소에 재고가 있는 완제품 ID 목록 조회 (온라인 쇼핑 필터용)
export async function getProductIdsWithStock(storeId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("inventory")
    .select("product_id")
    .eq("store_id", storeId)
    .gt("quantity", 0);
  return [...new Set((data || []).map((r) => r.product_id))] as string[];
}

// 판매소별 품목 재고 조회 (판매 시 사용)
export async function getStoreInventoryForProduct(storeId: string, productId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("inventory")
    .select("*, product_specs(spec_name)")
    .eq("store_id", storeId)
    .eq("product_id", productId)
    .gt("quantity", 0);

  return data || [];
}
