"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// 체척권 목록 조회
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
      "*, users(name, rank, military_number), products(name), tailors(name), order_items(orders(order_number))",
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

// 체척권 번호로 단건 조회
export async function getTicketByNumber(ticketNumber: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("tailoring_tickets")
    .select("*, users(name, rank), products(name), tailors(name)")
    .eq("ticket_number", ticketNumber)
    .single();

  return data;
}

// 체척업체: 체척권 등록
export async function registerTicket(ticketNumber: string, tailorId: string) {
  const supabase = await createClient();

  const { data: ticket } = await supabase
    .from("tailoring_tickets")
    .select("id, status")
    .eq("ticket_number", ticketNumber)
    .single();

  if (!ticket) return { success: false, error: "체척권을 찾을 수 없습니다" };
  if (ticket.status !== "issued") return { success: false, error: "등록 가능한 상태가 아닙니다" };

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

// 취소 요청 (사용자/관리자)
export async function requestCancelTicket(ticketId: string) {
  const supabase = await createClient();

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
  return { success: true };
}

// 취소 승인 (관리자)
export async function approveCancelTicket(ticketId: string) {
  const supabase = await createClient();

  const { data: ticket } = await supabase
    .from("tailoring_tickets")
    .select("*, order_items(order_id, unit_price, quantity)")
    .eq("id", ticketId)
    .single();

  if (!ticket) return { success: false, error: "체척권을 찾을 수 없습니다" };
  if (ticket.status !== "cancel_requested") {
    return { success: false, error: "취소 요청 상태의 체척권만 승인할 수 있습니다" };
  }

  const { data: { user: authUser } } = await supabase.auth.getUser();

  // 체척권 취소
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
      .select("used_points")
      .eq("user_id", ticket.user_id)
      .single();

    if (summary) {
      await supabase.from("point_ledger").insert({
        user_id: ticket.user_id,
        point_type: "add",
        amount: refundAmount,
        description: `체척권 취소 환불 (${ticket.ticket_number})`,
        reference_type: "ticket",
        reference_id: ticketId,
        fiscal_year: new Date().getFullYear(),
        created_by: authUser?.id,
      });

      await supabase
        .from("point_summary")
        .update({ used_points: Math.max(0, summary.used_points - refundAmount) })
        .eq("user_id", ticket.user_id);
    }
  }

  revalidatePath("/admin/tickets");
  return { success: true };
}
