"use client";

import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/shared/pagination";
import { getCurrentUser } from "@/actions/auth";
import { getTickets, requestCancelTicket } from "@/actions/tickets";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, string> = {
  issued: "발행", registered: "등록", cancel_requested: "취소요청", cancelled: "취소",
};
const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  issued: "outline", registered: "default", cancel_requested: "secondary", cancelled: "destructive",
};

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [userId, setUserId] = useState("");

  const fetchData = useCallback(async () => {
    if (!userId) return;
    const result = await getTickets({ page, user_id: userId });
    setTickets(result.tickets);
    setTotal(result.total);
  }, [page, userId]);

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user) setUserId(user.id);
    });
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleCancelRequest(ticketId: string) {
    if (!confirm("체척권 취소를 요청하시겠습니까?")) return;
    const result = await requestCancelTicket(ticketId);
    if (result.success) {
      toast.success("취소 요청이 접수되었습니다");
      fetchData();
    } else {
      toast.error(result.error || "요청에 실패했습니다");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">체척권 현황</h1>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>체척권 번호</TableHead>
            <TableHead>품목</TableHead>
            <TableHead className="text-right">금액</TableHead>
            <TableHead>업체</TableHead>
            <TableHead>상태</TableHead>
            <TableHead>발행일</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">체척권이 없습니다</TableCell>
            </TableRow>
          ) : tickets.map((t) => (
            <TableRow key={t.id}>
              <TableCell>
                <div className="font-mono text-sm">{t.ticket_number}</div>
                {t.order_items?.orders?.order_number && (
                  <div className="text-xs text-muted-foreground mt-0.5">주문: {t.order_items.orders.order_number}</div>
                )}
              </TableCell>
              <TableCell>{t.products?.name || "-"}</TableCell>
              <TableCell className="text-right">{t.amount.toLocaleString()}원</TableCell>
              <TableCell>{t.tailors?.name || "-"}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANTS[t.status] || "default"}>
                  {STATUS_LABELS[t.status] || t.status}
                </Badge>
              </TableCell>
              <TableCell>{new Date(t.created_at).toLocaleDateString("ko-KR")}</TableCell>
              <TableCell>
                {t.status === "issued" && (
                  <Button size="sm" variant="destructive" onClick={() => handleCancelRequest(t.id)}>취소요청</Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination page={page} total={total} limit={20} onChange={setPage} />
    </div>
  );
}
