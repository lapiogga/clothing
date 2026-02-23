"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ============================================================
// 체척권 목록 조회
// ============================================================
export async function getTickets({
  page = 1,
  limit = 20,
  status,
  user_id,
  tailor_id,
  search,
}: {
  page?: number;
  limit?: number;
  status?: string;
  user_id?: string;
  tailor_id?: string;
  search?: string;
} = {}) {
  const supabase = await createClient();
  const offset = (page - 1) * limit;

  let query = supabase
    .from("tailoring_tickets")
    .select(
      "*, users(name, rank, military_number), products(name), tailors(name), order_items(id, order_id, orders(id, order_number, order_type, created_at))",
      { count: "exact" }
    );

  if (status) query = query.eq("status", status);
  if (user_id) query = query.eq("user_id", user_id);
  if (tailor_id) query = query.eq("tailor_id", tailor_id);
  if (search) query = query.ilike("users.name", `%${search}%`);

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return { tickets: [], total: 0 };
  return { tickets: data || [], total: count || 0 };
}

// ============================================================
// 체척권 번호로 단건 조회
// ============================================================
export async function getTicketByNumber(ticketNumber: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("tailoring_tickets")
    .select("*, users(name, rank), products(name), tailors(name)")
    .eq("ticket_number", ticketNumber)
    .single();

  return data;
}

// ============================================================
// 체척업체: 체척권 등록
// - tailor 역할만 가능
// - cancel_requested 또는 cancelled 상태는 등록 불가
// ============================================================
export async function registerTicket(ticketNumber: string, tailorId: string) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return { success: false, error: "인증이 필요합니다" };

  // tailor 역할 확인
  const { data: currentUser } = await supabase
    .from("users")
    .select("role, tailor_id")
    .eq("id", authUser.id)
    .single();

  if (!currentUser || currentUser.role !== "tailor") {
    return { success: false, error: "체척업체 담당자만 체척권을 등록할 수 있습니다" };
  }

  // 체척권 조회
  const { data: ticket } = await supabase
    .from("tailoring_tickets")
    .select("id, status")
    .eq("ticket_number", ticketNumber)
    .single();

  if (!ticket) return { success: false, error: "체척권을 찾을 수 없습니다" };

  // 등록 불가 상태 차단
  if (ticket.status === "cancel_requested" || ticket.status === "cancelled") {
    return { success: false, error: "취소 요청 또는 취소된 체척권은 등록할 수 없습니다" };
  }

  if (ticket.status !== "issued") {
    return { success: false, error: "등록 가능한 상태가 아닙니다 (발행 상태만 등록 가능)" };
  }

  await supabase
    .from("tailoring_tickets")
    .update({
      status: "registered",
      tailor_id: tailorId,
      registered_at: new Date().toISOString(),
    })
    .eq("id", ticket.id);

  revalidatePath("/tailor/tickets");
  return { success: true };
}

// ============================================================
// 취소 요청 (사용자/관리자)
// ============================================================
export async function requestCancelTicket(ticketId: string) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return { success: false, error: "인증이 필요합니다" };

  const { data: ticket } = await supabase
    .from("tailoring_tickets")
    .select("id, status")
    .eq("id", ticketId)
    .single();

  if (!ticket) return { success: false, error: "체척권을 찾을 수 없습니다" };
  if (ticket.status !== "issued") {
    return { success: false, error: "발행 상태의 체척권만 취소 요청할 수 있습니다" };
  }

  await supabase
    .from("tailoring_tickets")
    .update({ status: "cancel_requested" })
    .eq("id", ticketId);

  revalidatePath("/admin/tickets");
  revalidatePath("/my/tickets");
  return { success: true };
}

// ============================================================
// 취소 승인 (관리자만 가능)
// - 예약포인트 해제
// ============================================================
export async function approveCancelTicket(ticketId: string) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return { success: false, error: "인증이 필요합니다" };

  // admin 역할 확인
  const { data: currentUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", authUser.id)
    .single();

  if (!currentUser || currentUser.role !== "admin") {
    return { success: false, error: "관리자만 체척권 취소를 승인할 수 있습니다" };
  }

  // 체척권 조회 (주문 항목도 함께 조회)
  const { data: ticket } = await supabase
    .from("tailoring_tickets")
    .select("*, order_items(order_id, unit_price, quantity, orders(order_type))")
    .eq("id", ticketId)
    .single();

  if (!ticket) return { success: false, error: "체척권을 찾을 수 없습니다" };
  if (ticket.status !== "cancel_requested") {
    return { success: false, error: "취소 요청 상태의 체척권만 승인할 수 있습니다" };
  }

  // 체척권 취소 처리
  await supabase
    .from("tailoring_tickets")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", ticketId);

  // 포인트 반환
  const refundAmount = ticket.amount;
  if (refundAmount > 0) {
    const { data: summary } = await supabase
      .from("point_summary")
      .select("used_points, reserved_points")
      .eq("user_id", ticket.user_id)
      .single();

    if (summary) {
      const orderType = ticket.order_items?.orders?.order_type;

      if (orderType === "online") {
        // 온라인 맞춤피복: 예약포인트 해제
        await supabase.from("point_ledger").insert({
          user_id: ticket.user_id,
          point_type: "release",
          amount: refundAmount,
          description: `체척권 취소 승인 예약해제 (${ticket.ticket_number})`,
          reference_type: "ticket",
          reference_id: ticketId,
          fiscal_year: new Date().getFullYear(),
          created_by: authUser.id,
        });

        await supabase
          .from("point_summary")
          .update({ reserved_points: Math.max(0, summary.reserved_points - refundAmount) })
          .eq("user_id", ticket.user_id);
      } else {
        // 오프라인 맞춤피복: 사용포인트 복원
        await supabase.from("point_ledger").insert({
          user_id: ticket.user_id,
          point_type: "return",
          amount: refundAmount,
          description: `체척권 취소 승인 포인트 반환 (${ticket.ticket_number})`,
          reference_type: "ticket",
          reference_id: ticketId,
          fiscal_year: new Date().getFullYear(),
          created_by: authUser.id,
        });

        await supabase
          .from("point_summary")
          .update({ used_points: Math.max(0, summary.used_points - refundAmount) })
          .eq("user_id", ticket.user_id);
      }
    }
  }

  revalidatePath("/admin/tickets");
  revalidatePath("/my/tickets");
  return { success: true };
}
