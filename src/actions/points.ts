"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ANNUAL_POINTS, STEP_INCREMENT } from "@/lib/constants";
import type { Rank } from "@/types";

// 연간 포인트 산정 (미리보기)
export async function calculateAnnualPoints(fiscalYear: number) {
  const supabase = await createClient();

  // 일반사용자(role='user') 중 활성 사용자 조회
  const { data: users, error } = await supabase
    .from("users")
    .select("id, name, rank, enlist_date, retirement_date")
    .eq("role", "user")
    .eq("is_active", true);

  if (error || !users) return { calculations: [], total_amount: 0, error: error?.message };

  const calculations = users.map((user) => {
    const rank = user.rank as Rank;
    const baseAmount = ANNUAL_POINTS[rank] || 0;

    // 호봉 계산: 근무년수
    let step = 0;
    if (user.enlist_date) {
      const enlistYear = new Date(user.enlist_date).getFullYear();
      step = Math.max(0, fiscalYear - enlistYear);
    }
    const stepBonus = step * STEP_INCREMENT;

    // 퇴직예정자 일할계산
    let prorationRatio: number | null = null;
    let proratedAmount = baseAmount + stepBonus;

    if (user.retirement_date) {
      const retDate = new Date(user.retirement_date);
      if (retDate.getFullYear() === fiscalYear) {
        const yearStart = new Date(fiscalYear, 0, 1);
        const diffDays = Math.ceil(
          (retDate.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24)
        );
        prorationRatio = Math.max(0, diffDays) / 365;
        proratedAmount = Math.round((baseAmount + stepBonus) * prorationRatio);
      }
    }

    return {
      user_id: user.id,
      name: user.name,
      rank,
      base_amount: baseAmount,
      step,
      step_bonus: stepBonus,
      proration_ratio: prorationRatio,
      final_amount: proratedAmount,
    };
  });

  const totalAmount = calculations.reduce((sum, c) => sum + c.final_amount, 0);

  return { calculations, total_amount: totalAmount };
}

// 포인트 일괄 지급
export async function grantAnnualPoints(
  fiscalYear: number,
  calculations: { user_id: string; final_amount: number }[]
) {
  const supabase = await createClient();

  // 중복 지급 확인
  const { count } = await supabase
    .from("point_ledger")
    .select("id", { count: "exact", head: true })
    .eq("point_type", "grant")
    .eq("fiscal_year", fiscalYear);

  if (count && count > 0) {
    return { success: false, error: `${fiscalYear}년도 포인트가 이미 지급되었습니다` };
  }

  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return { success: false, error: "인증이 필요합니다" };
  const { data: currentUser } = await supabase.from("users").select("role").eq("id", authUser.id).single();
  if (!currentUser || currentUser.role !== "admin") return { success: false, error: "권한이 없습니다" };

  // 각 사용자에게 지급
  for (const calc of calculations) {
    if (calc.final_amount <= 0) continue;

    // point_ledger 기록
    await supabase.from("point_ledger").insert({
      user_id: calc.user_id,
      point_type: "grant",
      amount: calc.final_amount,
      description: `${fiscalYear}년도 피복포인트 지급`,
      reference_type: "annual",
      fiscal_year: fiscalYear,
      created_by: authUser?.id,
    });

    // point_summary 갱신 (upsert)
    const { data: existing } = await supabase
      .from("point_summary")
      .select("total_points")
      .eq("user_id", calc.user_id)
      .single();

    if (existing) {
      await supabase
        .from("point_summary")
        .update({ total_points: existing.total_points + calc.final_amount })
        .eq("user_id", calc.user_id);
    } else {
      await supabase.from("point_summary").insert({
        user_id: calc.user_id,
        total_points: calc.final_amount,
        used_points: 0,
        reserved_points: 0,
      });
    }
  }

  revalidatePath("/admin/points");
  return { success: true, count: calculations.length };
}

// 진급 포인트 추가 지급
export async function triggerPromotionPoints(
  userId: string,
  oldRank: Rank,
  newRank: Rank,
  promotionDate: string
) {
  const supabase = await createClient();

  const oldDaily = ANNUAL_POINTS[oldRank] / 365;
  const newDaily = ANNUAL_POINTS[newRank] / 365;
  const pDate = new Date(promotionDate);
  const yearEnd = new Date(pDate.getFullYear(), 11, 31);
  const remainingDays = Math.ceil(
    (yearEnd.getTime() - pDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const addedAmount = Math.round((newDaily - oldDaily) * remainingDays);
  if (addedAmount <= 0) return { success: true, added_amount: 0 };

  const { data: { user: authUser } } = await supabase.auth.getUser();

  await supabase.from("point_ledger").insert({
    user_id: userId,
    point_type: "add",
    amount: addedAmount,
    description: `진급 추가 지급 (${oldRank} → ${newRank})`,
    reference_type: "promotion",
    fiscal_year: pDate.getFullYear(),
    created_by: authUser?.id,
  });

  // point_summary 갱신
  const { data: summary } = await supabase
    .from("point_summary")
    .select("total_points")
    .eq("user_id", userId)
    .single();

  if (summary) {
    await supabase
      .from("point_summary")
      .update({ total_points: summary.total_points + addedAmount })
      .eq("user_id", userId);
  }

  return { success: true, added_amount: addedAmount };
}

// 포인트 현황 조회 (관리자용)
export async function getPointSummaries({
  page = 1,
  limit = 20,
  search,
  rank,
}: {
  page?: number;
  limit?: number;
  search?: string;
  rank?: string;
} = {}) {
  const supabase = await createClient();
  const offset = (page - 1) * limit;

  let query = supabase
    .from("point_summary")
    .select("*, users!inner(name, rank, unit, military_number)", { count: "exact" });

  if (search) query = query.ilike("users.name", `%${search}%`);
  if (rank) query = query.eq("users.rank", rank);

  const { data, error, count } = await query
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return { summaries: [], total: 0 };
  return { summaries: data || [], total: count || 0 };
}

// 포인트 변동 이력 조회
export async function getPointLedger({
  userId,
  page = 1,
  limit = 20,
  fiscalYear,
  pointType,
}: {
  userId: string;
  page?: number;
  limit?: number;
  fiscalYear?: number;
  pointType?: string;
}) {
  const supabase = await createClient();
  const offset = (page - 1) * limit;

  let query = supabase
    .from("point_ledger")
    .select("*", { count: "exact" })
    .eq("user_id", userId);

  if (fiscalYear) query = query.eq("fiscal_year", fiscalYear);
  if (pointType) query = query.eq("point_type", pointType);

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return { ledger: [], total: 0 };
  return { ledger: data || [], total: count || 0 };
}

// 가용 포인트 조회
export async function getAvailablePoints(userId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("point_summary")
    .select("total_points, used_points, reserved_points")
    .eq("user_id", userId)
    .single();

  if (!data) return { total: 0, used: 0, reserved: 0, available: 0 };

  return {
    total: data.total_points,
    used: data.used_points,
    reserved: data.reserved_points,
    available: data.total_points - data.used_points - data.reserved_points,
  };
}
