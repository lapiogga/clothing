"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword } from "@/actions/auth";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    const result = await resetPassword(formData);
    if (result?.success) {
      toast.success("비밀번호 재설정 링크가 발송되었습니다");
    } else {
      toast.error(result?.error || "처리 중 오류가 발생했습니다");
    }
    setPending(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">비밀번호 찾기</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="등록된 이메일을 입력하세요"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "발송 중..." : "비밀번호 재설정 링크 발송"}
            </Button>
            <div className="text-center">
              <a href="/" className="text-sm text-muted-foreground hover:underline">
                로그인으로 돌아가기
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
