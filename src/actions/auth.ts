"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// 역할별 리다이렉트 경로
const ROLE_REDIRECTS: Record<string, string> = {
  admin: "/admin/dashboard",
  store: "/store/dashboard",
  tailor: "/tailor/dashboard",
  user: "/my/shop",
};

export async function login(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { success: false, error: "이메일 또는 비밀번호가 올바르지 않습니다" };
  }

  // 사용자 역할 조회
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "사용자 정보를 가져올 수 없습니다" };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role || "user";
  const redirectPath = ROLE_REDIRECTS[role] || "/my/shop";

  redirect(redirectPath);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SUPABASE_URL ? "" : "http://localhost:3000"}/change-password`,
  });

  if (error) {
    return { success: false, error: "비밀번호 재설정 링크 발송에 실패했습니다" };
  }

  return { success: true };
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (password.length < 8) {
    return { success: false, error: "비밀번호는 최소 8자 이상이어야 합니다" };
  }

  if (password !== confirmPassword) {
    return { success: false, error: "비밀번호가 일치하지 않습니다" };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { success: false, error: "비밀번호 변경에 실패했습니다" };
  }

  return { success: true };
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("*, stores(name), tailors(name)")
    .eq("id", user.id)
    .single();

  return profile;
}
