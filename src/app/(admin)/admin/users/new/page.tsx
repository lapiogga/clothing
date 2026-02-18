"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createUser, getStoresList, getTailorsList } from "@/actions/users";
import { RANK_LABELS, ROLE_LABELS } from "@/lib/constants";
import { toast } from "sonner";

export default function NewUserPage() {
  const router = useRouter();
  const [role, setRole] = useState("user");
  const [pending, setPending] = useState(false);
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [tailors, setTailors] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    getStoresList().then(setStores);
    getTailorsList().then(setTailors);
  }, []);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    const result = await createUser(formData);
    if (result.success) {
      toast.success("사용자가 등록되었습니다");
      router.push("/admin/users");
    } else {
      toast.error(result.error || "등록에 실패했습니다");
      setPending(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">사용자 등록</h1>
      <Card>
        <CardContent className="pt-6">
          <form action={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">이름 *</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">이메일 *</Label>
                <Input id="email" name="email" type="email" required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>역할 *</Label>
                <Select name="role" value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {role === "user" && (
                <div className="space-y-2">
                  <Label>계급</Label>
                  <Select name="rank">
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
              )}
            </div>

            {role === "store" && (
              <div className="space-y-2">
                <Label>소속 판매소 *</Label>
                <Select name="store_id">
                  <SelectTrigger>
                    <SelectValue placeholder="판매소 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {role === "tailor" && (
              <div className="space-y-2">
                <Label>소속 업체 *</Label>
                <Select name="tailor_id">
                  <SelectTrigger>
                    <SelectValue placeholder="업체 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {tailors.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="military_number">군번/사번</Label>
                <Input id="military_number" name="military_number" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">소속</Label>
                <Input id="unit" name="unit" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="enlist_date">입대일/근무시작일</Label>
                <Input id="enlist_date" name="enlist_date" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="promotion_date">진급일</Label>
                <Input id="promotion_date" name="promotion_date" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="retirement_date">퇴직예정일</Label>
                <Input id="retirement_date" name="retirement_date" type="date" />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={pending}>
                {pending ? "등록 중..." : "등록"}
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
