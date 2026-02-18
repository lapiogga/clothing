"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getUserById, updateUser } from "@/actions/users";
import { RANK_LABELS, ROLE_LABELS } from "@/lib/constants";
import { toast } from "sonner";

export default function EditUserPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    getUserById(params.id as string).then((result) => {
      if (result.user) setUser(result.user);
    });
  }, [params.id]);

  if (!user) return <div className="p-6">로딩 중...</div>;

  async function handleSubmit(formData: FormData) {
    setPending(true);
    const result = await updateUser(params.id as string, formData);
    if (result.success) {
      toast.success("사용자 정보가 수정되었습니다");
      router.push("/admin/users");
    } else {
      toast.error(result.error || "수정에 실패했습니다");
      setPending(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">사용자 수정</h1>
        <Badge variant="secondary">
          {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS]}
        </Badge>
      </div>
      <Card>
        <CardContent className="pt-6">
          <form action={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">이름 *</Label>
                <Input id="name" name="name" defaultValue={user.name} required />
              </div>
              <div className="space-y-2">
                <Label>이메일</Label>
                <Input value={user.email} disabled />
              </div>
            </div>

            {user.role === "user" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>계급</Label>
                  <Select name="rank" defaultValue={user.rank || ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="계급 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(RANK_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">소속</Label>
                  <Input id="unit" name="unit" defaultValue={user.unit || ""} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="promotion_date">진급일</Label>
                <Input
                  id="promotion_date"
                  name="promotion_date"
                  type="date"
                  defaultValue={user.promotion_date || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="retirement_date">퇴직예정일</Label>
                <Input
                  id="retirement_date"
                  name="retirement_date"
                  type="date"
                  defaultValue={user.retirement_date || ""}
                />
              </div>
              <div className="space-y-2">
                <Label>상태</Label>
                <Select name="is_active" defaultValue={user.is_active ? "true" : "false"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">활성</SelectItem>
                    <SelectItem value="false">비활성</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={pending}>
                {pending ? "저장 중..." : "저장"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                취소
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
