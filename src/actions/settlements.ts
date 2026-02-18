"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// 정산 목록 조회
export async function getSettlements({
  page = 1,
  limit = 20,
  tailor_id,
  status,
}: {
  page?: number;
  limit?: number;
  tailor_id?: string;
  status?: string;
} = {}) {
  const supabase = await createClient();
  const offset = (page - 1) * limit;

  let query = supabase
    .from("tailor_settlements")
    .select("*, tailors(name, business_number, bank_name, account_number)", { count: "exact" });

  if (tailor_id) query = query.eq("tailor_id", tailor_id);
  if (status) query = query.eq("status", status);

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return { settlements: [], total: 0 };
  return { settlements: data || [], total: count || 0 };
}

// 정산 산출 (미정산 등록 체척권 집계)
export async function calculateSettlement(tailorId: string) {
  const supabase = await createClient();

  // 해당 업체의 등록된 미정산 체척권 조회
  const { data: tickets } = await supabase
    .from("tailoring_tickets")
    .select("id, ticket_number, amount, user_id, users(name), products(name), registered_at")
    .eq("tailor_id", tailorId)
    .eq("status", "registered")
    .is("settlement_id", null);

  if (!tickets || tickets.length === 0) {
    return { tickets: [], total_amount: 0, error: "정산 대상 체척권이 없습니다" };
  }

  const totalAmount = tickets.reduce((sum, t) => sum + t.amount, 0);
  return { tickets, total_amount: totalAmount };
}

// 정산 생성
export async function createSettlement(data: {
  tailor_id: string;
  ticket_ids: string[];
  total_amount: number;
  period_from: string;
  period_to: string;
}) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  // 정산 레코드 생성
  const { data: settlement, error } = await supabase
    .from("tailor_settlements")
    .insert({
      tailor_id: data.tailor_id,
      total_amount: data.total_amount,
      ticket_count: data.ticket_ids.length,
      period_from: data.period_from,
      period_to: data.period_to,
      status: "pending",
      created_by: authUser?.id,
    })
    .select()
    .single();

  if (error || !settlement) return { success: false, error: error?.message || "정산 생성 실패" };

  // 체척권에 정산 ID 연결
  await supabase
    .from("tailoring_tickets")
    .update({ settlement_id: settlement.id })
    .in("id", data.ticket_ids);

  revalidatePath("/admin/settlements");
  return { success: true, settlement_id: settlement.id };
}

// 정산 확정 (지급 완료)
export async function confirmSettlement(settlementId: string) {
  const supabase = await createClient();

  const { data: settlement } = await supabase
    .from("tailor_settlements")
    .select("id, status")
    .eq("id", settlementId)
    .single();

  if (!settlement) return { success: false, error: "정산을 찾을 수 없습니다" };
  if (settlement.status !== "pending") return { success: false, error: "대기 상태의 정산만 확정할 수 있습니다" };

  await supabase
    .from("tailor_settlements")
    .update({
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
    })
    .eq("id", settlementId);

  revalidatePath("/admin/settlements");
  return { success: true };
}
