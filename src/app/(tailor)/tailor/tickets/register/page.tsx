"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/actions/auth";
import { getTicketByNumber, registerTicket } from "@/actions/tickets";
import { toast } from "sonner";

export default function RegisterTicketPage() {
  const [tailorId, setTailorId] = useState("");
  const [ticketNumber, setTicketNumber] = useState("");
  const [ticket, setTicket] = useState<any>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user?.tailor_id) setTailorId(user.tailor_id);
    });
  }, []);

  async function handleSearch() {
    if (!ticketNumber.trim()) return;
    const result = await getTicketByNumber(ticketNumber.trim());
    if (!result) {
      toast.error("체척권을 찾을 수 없습니다");
      setTicket(null);
      return;
    }
    setTicket(result);
  }

  async function handleRegister() {
    if (!ticket) return;
    setPending(true);
    const result = await registerTicket(ticket.ticket_number, tailorId);
    if (result.success) {
      toast.success("체척권이 등록되었습니다");
      setTicket(null);
      setTicketNumber("");
    } else {
      toast.error(result.error || "등록에 실패했습니다");
    }
    setPending(false);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">체척권 등록</h1>

      <Card className="mb-6">
        <CardHeader><CardTitle>체척권 조회</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              일반사용자의 체척권 현황 화면에서 확인한 체척권 번호(TKT-로 시작)를 입력하세요.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="체척권 번호 입력 (예: TKT-20260101-00001)"
                value={ticketNumber}
                onChange={(e) => setTicketNumber(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button variant="outline" onClick={handleSearch}>조회</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {ticket && (
        <Card>
          <CardHeader><CardTitle>체척권 정보</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">체척권 번호</span>
                <span className="font-mono">{ticket.ticket_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">상태</span>
                <Badge>{ticket.status === "issued" ? "발행" : ticket.status}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">사용자</span>
                <span>{ticket.users?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">품목</span>
                <span>{ticket.products?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">금액</span>
                <span className="font-bold">{ticket.amount.toLocaleString()}원</span>
              </div>
            </div>

            {ticket.status === "issued" ? (
              <Button onClick={handleRegister} disabled={pending} className="w-full mt-4">
                {pending ? "등록 중..." : "등록하기"}
              </Button>
            ) : (
              <div className="text-center text-muted-foreground mt-4">
                이 체척권은 등록할 수 없는 상태입니다 (현재: {ticket.status})
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
