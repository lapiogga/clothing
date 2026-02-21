"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// 오프라인 판매
export async function createOfflineSale(data: {
  user_id: string;
  store_id: string;
  product_type: string;
  items: { product_id: string; spec_id?: string; quantity: number; unit_price: number }[];
}) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  const totalAmount = data.items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

  // 가용포인트 검증
  const { data: summary } = await supabase
    .from("point_summary")
    .select("total_points, used_points, reserved_points")
    .eq("user_id", data.user_id)
    .single();

  if (!summary) return { success: false, error: "사용자 포인트 정보가 없습니다" };
  const available = summary.total_points - summary.used_points - summary.reserved_points;
  if (totalAmount > available) return { success: false, error: "가용 포인트가 부족합니다" };

  // 주문 생성
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      order_number: "TEMP", // 트리거에서 자동 생성
      user_id: data.user_id,
      store_id: data.store_id,
      order_type: "offline",
      product_type: data.product_type,
      status: "delivered",
      total_amount: totalAmount,
    })
    .select()
    .single();

  if (orderErr) return { success: false, error: orderErr.message };

  // 주문 항목 생성
  for (const item of data.items) {
    const { data: orderItem } = await supabase
      .from("order_items")
      .insert({
        order_id: order.id,
        product_id: item.product_id,
        spec_id: item.spec_id || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.unit_price * item.quantity,
      })
      .select()
      .single();

    // 완제품: 재고 차감
    if (data.product_type === "finished" && item.spec_id) {
      const { data: inv } = await supabase
        .from("inventory")
        .select("id, quantity")
        .eq("store_id", data.store_id)
        .eq("product_id", item.product_id)
        .eq("spec_id", item.spec_id)
        .single();

      if (!inv || inv.quantity < item.quantity) {
        return { success: false, error: "재고가 부족합니다" };
      }

      await supabase
        .from("inventory")
        .update({ quantity: inv.quantity - item.quantity })
        .eq("id", inv.id);

      await supabase.from("inventory_log").insert({
        inventory_id: inv.id,
        log_type: "sale",
        quantity: item.quantity,
        order_item_id: orderItem?.id,
        created_by: authUser?.id,
      });
    }

    // 맞춤피복: 체척권 발행
    if (data.product_type === "custom" && orderItem) {
      await supabase.from("tailoring_tickets").insert({
        ticket_number: "TEMP", // 트리거에서 자동 생성
        order_item_id: orderItem.id,
        user_id: data.user_id,
        product_id: item.product_id,
        amount: item.unit_price,
        status: "issued",
      });
    }
  }

  // 포인트 차감
  await supabase.from("point_ledger").insert({
    user_id: data.user_id,
    point_type: "deduct",
    amount: totalAmount,
    description: `오프라인 구매 (${order.order_number})`,
    reference_type: "order",
    reference_id: order.id,
    fiscal_year: new Date().getFullYear(),
    created_by: authUser?.id,
  });

  await supabase
    .from("point_summary")
    .update({ used_points: summary.used_points + totalAmount })
    .eq("user_id", data.user_id);

  revalidatePath("/store/sales");
  return { success: true, order_id: order.id };
}

// 온라인 구매
export async function createOnlineOrder(data: {
  user_id: string;
  store_id?: string;
  product_type: string;
  items: { product_id: string; spec_id?: string; quantity: number; unit_price: number }[];
  delivery_method?: string;  // 맞춤피복은 배송 불필요
  delivery_zone_id?: string;
  delivery_address?: string;
}) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  const totalAmount = data.items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

  // 가용포인트 검증
  const { data: summary } = await supabase
    .from("point_summary")
    .select("total_points, used_points, reserved_points")
    .eq("user_id", data.user_id)
    .single();

  if (!summary) return { success: false, error: "포인트 정보가 없습니다" };
  const available = summary.total_points - summary.used_points - summary.reserved_points;
  if (totalAmount > available) return { success: false, error: "가용 포인트가 부족합니다" };

  // 주문 생성
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      order_number: "TEMP",
      user_id: data.user_id,
      store_id: data.store_id || null,
      order_type: "online",
      product_type: data.product_type,
      status: "pending",
      total_amount: totalAmount,
      delivery_method: data.delivery_method,
      delivery_zone_id: data.delivery_zone_id || null,
      delivery_address: data.delivery_address || null,
    })
    .select()
    .single();

  if (orderErr) return { success: false, error: orderErr.message };

  for (const item of data.items) {
    const { data: orderItem } = await supabase
      .from("order_items")
      .insert({
        order_id: order.id,
        product_id: item.product_id,
        spec_id: item.spec_id || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.unit_price * item.quantity,
      })
      .select()
      .single();

    // 맞춤피복: 체척권 발행
    if (data.product_type === "custom" && orderItem) {
      await supabase.from("tailoring_tickets").insert({
        ticket_number: "TEMP",
        order_item_id: orderItem.id,
        user_id: data.user_id,
        product_id: item.product_id,
        amount: item.unit_price,
        status: "issued",
      });
    }
  }

  // 예약포인트 추가
  await supabase.from("point_ledger").insert({
    user_id: data.user_id,
    point_type: "reserve",
    amount: totalAmount,
    description: `온라인 구매 예약 (${order.order_number})`,
    reference_type: "order",
    reference_id: order.id,
    fiscal_year: new Date().getFullYear(),
    created_by: authUser?.id,
  });

  await supabase
    .from("point_summary")
    .update({ reserved_points: summary.reserved_points + totalAmount })
    .eq("user_id", data.user_id);

  revalidatePath("/my/orders");
  return { success: true, order_id: order.id };
}

// 주문 취소 (사용자 취소 + 직권 취소)
export async function cancelOrder(orderId: string, cancelReason?: string) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  const { data: order } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", orderId)
    .single();

  if (!order) return { success: false, error: "주문을 찾을 수 없습니다" };
  if (!["pending", "confirmed"].includes(order.status)) {
    return { success: false, error: "취소할 수 없는 상태입니다" };
  }

  // 주문 상태 변경
  await supabase
    .from("orders")
    .update({
      status: "cancelled",
      cancel_reason: cancelReason || null,
      cancelled_by: authUser?.id,
    })
    .eq("id", orderId);

  // 예약포인트 해제
  const { data: summary } = await supabase
    .from("point_summary")
    .select("reserved_points")
    .eq("user_id", order.user_id)
    .single();

  if (summary) {
    await supabase.from("point_ledger").insert({
      user_id: order.user_id,
      point_type: "release",
      amount: order.total_amount,
      description: `주문 취소 (${order.order_number})`,
      reference_type: "order",
      reference_id: orderId,
      fiscal_year: new Date().getFullYear(),
      created_by: authUser?.id,
    });

    await supabase
      .from("point_summary")
      .update({ reserved_points: Math.max(0, summary.reserved_points - order.total_amount) })
      .eq("user_id", order.user_id);
  }

  // 맞춤피복 체척권 취소 (미등록만)
  if (order.product_type === "custom") {
    for (const item of order.order_items) {
      await supabase
        .from("tailoring_tickets")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("order_item_id", item.id)
        .eq("status", "issued");
    }
  }

  revalidatePath("/store/orders");
  revalidatePath("/my/orders");
  return { success: true };
}

// 반품 처리
export async function processReturn(orderId: string, items: { order_item_id: string; quantity: number }[]) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (!order) return { success: false, error: "주문을 찾을 수 없습니다" };
  if (order.order_type !== "offline") return { success: false, error: "오프라인 주문만 반품 가능합니다" };

  let totalRefund = 0;

  for (const item of items) {
    const { data: orderItem } = await supabase
      .from("order_items")
      .select("*, products(product_type)")
      .eq("id", item.order_item_id)
      .single();

    if (!orderItem) continue;

    const refundAmount = orderItem.unit_price * item.quantity;
    totalRefund += refundAmount;

    // 주문항목 상태 변경
    await supabase
      .from("order_items")
      .update({ status: "returned" })
      .eq("id", item.order_item_id);

    // 완제품: 재고 추가
    if (orderItem.products?.product_type === "finished" && orderItem.spec_id) {
      const { data: inv } = await supabase
        .from("inventory")
        .select("id, quantity")
        .eq("store_id", order.store_id)
        .eq("product_id", orderItem.product_id)
        .eq("spec_id", orderItem.spec_id)
        .single();

      if (inv) {
        await supabase
          .from("inventory")
          .update({ quantity: inv.quantity + item.quantity })
          .eq("id", inv.id);

        await supabase.from("inventory_log").insert({
          inventory_id: inv.id,
          log_type: "return",
          quantity: item.quantity,
          order_item_id: item.order_item_id,
          created_by: authUser?.id,
        });
      }
    }

    // 맞춤피복: 체척권 취소 (미등록만)
    if (orderItem.products?.product_type === "custom") {
      const { data: ticket } = await supabase
        .from("tailoring_tickets")
        .select("id, status")
        .eq("order_item_id", item.order_item_id)
        .single();

      if (ticket?.status === "registered") {
        return { success: false, error: "체척권이 등록되어 반품할 수 없습니다" };
      }
      if (ticket) {
        await supabase
          .from("tailoring_tickets")
          .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
          .eq("id", ticket.id);
      }
    }
  }

  // 포인트 반환
  const { data: summary } = await supabase
    .from("point_summary")
    .select("used_points")
    .eq("user_id", order.user_id)
    .single();

  if (summary && totalRefund > 0) {
    await supabase.from("point_ledger").insert({
      user_id: order.user_id,
      point_type: "add",
      amount: totalRefund,
      description: `반품 포인트 반환 (${order.order_number})`,
      reference_type: "order",
      reference_id: orderId,
      fiscal_year: new Date().getFullYear(),
      created_by: authUser?.id,
    });

    await supabase
      .from("point_summary")
      .update({ used_points: Math.max(0, summary.used_points - totalRefund) })
      .eq("user_id", order.user_id);
  }

  revalidatePath("/store/sales");
  return { success: true };
}

// 주문 상태 변경 (배송 처리)
export async function updateOrderStatus(orderId: string, newStatus: string) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  const { data: order } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", orderId)
    .single();

  if (!order) return { success: false, error: "주문을 찾을 수 없습니다" };

  // 상태 전이 검증
  const validTransitions: Record<string, string[]> = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["shipping", "cancelled"],
    shipping: ["delivered"],
  };

  if (!validTransitions[order.status]?.includes(newStatus)) {
    return { success: false, error: "유효하지 않은 상태 변경입니다" };
  }

  await supabase
    .from("orders")
    .update({ status: newStatus })
    .eq("id", orderId);

  // 배송 확정 시 처리
  if (newStatus === "delivered") {
    // 재고 차감 (완제품)
    if (order.product_type === "finished") {
      for (const item of order.order_items) {
        if (!item.spec_id) continue;
        const { data: inv } = await supabase
          .from("inventory")
          .select("id, quantity")
          .eq("store_id", order.store_id)
          .eq("product_id", item.product_id)
          .eq("spec_id", item.spec_id)
          .single();

        if (!inv || inv.quantity < item.quantity) {
          return { success: false, error: "재고가 부족합니다" };
        }

        await supabase
          .from("inventory")
          .update({ quantity: inv.quantity - item.quantity })
          .eq("id", inv.id);

        await supabase.from("inventory_log").insert({
          inventory_id: inv.id,
          log_type: "sale",
          quantity: item.quantity,
          order_item_id: item.id,
          created_by: authUser?.id,
        });
      }
    }

    // 포인트: 실차감 + 예약 해제
    const { data: summary } = await supabase
      .from("point_summary")
      .select("used_points, reserved_points")
      .eq("user_id", order.user_id)
      .single();

    if (summary) {
      await supabase.from("point_ledger").insert({
        user_id: order.user_id,
        point_type: "deduct",
        amount: order.total_amount,
        description: `배송 확정 차감 (${order.order_number})`,
        reference_type: "order",
        reference_id: orderId,
        fiscal_year: new Date().getFullYear(),
        created_by: authUser?.id,
      });

      await supabase.from("point_ledger").insert({
        user_id: order.user_id,
        point_type: "release",
        amount: order.total_amount,
        description: `배송 확정 예약해제 (${order.order_number})`,
        reference_type: "order",
        reference_id: orderId,
        fiscal_year: new Date().getFullYear(),
        created_by: authUser?.id,
      });

      await supabase
        .from("point_summary")
        .update({
          used_points: summary.used_points + order.total_amount,
          reserved_points: Math.max(0, summary.reserved_points - order.total_amount),
        })
        .eq("user_id", order.user_id);
    }
  }

  revalidatePath("/store/orders");
  revalidatePath("/my/orders");
  return { success: true };
}

// 주문 목록 조회
export async function getOrders({
  page = 1,
  limit = 20,
  status,
  order_type,
  product_type,
  store_id,
  user_id,
  search,
  date_from,
  date_to,
}: {
  page?: number;
  limit?: number;
  status?: string;
  order_type?: string;
  product_type?: string;
  store_id?: string;
  user_id?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
} = {}) {
  const supabase = await createClient();
  const offset = (page - 1) * limit;

  let query = supabase
    .from("orders")
    .select("*, users(name, rank, military_number), stores(name)", { count: "exact" });

  if (status) query = query.eq("status", status);
  if (order_type) query = query.eq("order_type", order_type);
  if (product_type) query = query.eq("product_type", product_type);
  if (store_id) query = query.eq("store_id", store_id);
  if (user_id) query = query.eq("user_id", user_id);
  if (date_from) query = query.gte("created_at", date_from);
  if (date_to) query = query.lte("created_at", date_to + "T23:59:59");

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return { orders: [], total: 0 };
  return { orders: data || [], total: count || 0 };
}

// 주문 상세 조회
export async function getOrderById(id: string) {
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("*, users(name, rank, military_number), stores(name), delivery_zones(name, address)")
    .eq("id", id)
    .single();

  if (!order) return { order: null, items: [] };

  const { data: items } = await supabase
    .from("order_items")
    .select("*, products(name, product_type), product_specs(spec_name)")
    .eq("order_id", id);

  return { order, items: items || [] };
}

// 통계 - 일별 판매현황
export async function getDailySalesStats(storeId: string, dateFrom: string, dateTo: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("orders")
    .select("created_at, total_amount")
    .eq("store_id", storeId)
    .eq("status", "delivered")
    .gte("created_at", dateFrom)
    .lte("created_at", dateTo + "T23:59:59");

  // 날짜별 집계
  const statsMap: Record<string, { count: number; amount: number }> = {};
  (data || []).forEach((order) => {
    const date = new Date(order.created_at).toISOString().split("T")[0];
    if (!statsMap[date]) statsMap[date] = { count: 0, amount: 0 };
    statsMap[date].count++;
    statsMap[date].amount += order.total_amount;
  });

  return Object.entries(statsMap)
    .map(([date, stats]) => ({ date, ...stats }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// 통계 - 품목별 판매현황
export async function getProductSalesStats(storeId: string, dateFrom: string, dateTo: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("order_items")
    .select("quantity, subtotal, products(name), product_specs(spec_name), orders!inner(store_id, status, created_at)")
    .eq("orders.store_id", storeId)
    .eq("orders.status", "delivered")
    .gte("orders.created_at", dateFrom)
    .lte("orders.created_at", dateTo + "T23:59:59");

  const statsMap: Record<string, { product_name: string; spec_name: string; quantity: number; amount: number }> = {};
  (data || []).forEach((item: any) => {
    const key = `${item.products?.name}-${item.product_specs?.spec_name || ""}`;
    if (!statsMap[key]) statsMap[key] = { product_name: item.products?.name || "", spec_name: item.product_specs?.spec_name || "", quantity: 0, amount: 0 };
    statsMap[key].quantity += item.quantity;
    statsMap[key].amount += item.subtotal;
  });

  return Object.values(statsMap);
}

// 통계 - 사용자별 판매현황
export async function getUserSalesStats(storeId: string, dateFrom: string, dateTo: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("orders")
    .select("total_amount, users(name, rank)")
    .eq("store_id", storeId)
    .eq("status", "delivered")
    .gte("created_at", dateFrom)
    .lte("created_at", dateTo + "T23:59:59");

  const statsMap: Record<string, { user_name: string; rank: string; count: number; amount: number }> = {};
  (data || []).forEach((order: any) => {
    const name = order.users?.name || "";
    if (!statsMap[name]) statsMap[name] = { user_name: name, rank: order.users?.rank || "", count: 0, amount: 0 };
    statsMap[name].count++;
    statsMap[name].amount += order.total_amount;
  });

  return Object.values(statsMap);
}
