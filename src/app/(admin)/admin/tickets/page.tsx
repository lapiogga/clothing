"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/shared/pagination";
import { getTickets, approveCancelTicket } from "@/actions/tickets";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, string> = {
  issued: "발행", registered: "등록", cancel_requested: "취소요청", cancelled: "취소",
};
const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  issued: "outline", registered: "default", cancel_requested: "secondary", cancelled: "destructive",
};

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    const result = await getTickets({
      page,
      status: status || undefined,
      search: search || undefined,
    });
    setTickets(result.tickets);
    setTotal(result.total);
  }, [page, status, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleApproveCancel(ticketId: string) {
    if (!confirm("체척권 취소를 승인하시겠습니까? 포인트가 환불됩니다.")) return;
    const result = await approveCancelTicket(ticketId);
    if (result.success) {
      toast.success("취소가 승인되었습니다");
      fetchData();
    } else {
      toast.error(result.error || "승인에 실패했습니다");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">체척권 관리</h1>

      <div className="flex gap-3 mb-4">
        <Input
          placeholder="이름 검색"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-60"
        />
        <Select value={status} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="상태 전체" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>체척권 번호</TableHead>
            <TableHead>사용자</TableHead>
            <TableHead>품목</TableHead>
            <TableHead className="text-right">금액</TableHead>
            <TableHead>업체</TableHead>
            <TableHead>상태</TableHead>
            <TableHead>발행일</TableHead>
            <TableHead>처리</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground">데이터가 없습니다</TableCell>
            </TableRow>
          ) : tickets.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="font-mono text-sm">{t.ticket_number}</TableCell>
              <TableCell>{t.users?.name}</TableCell>
              <TableCell>{t.products?.name}</TableCell>
              <TableCell className="text-right">{t.amount.toLocaleString()}원</TableCell>
              <TableCell>{t.tailors?.name || "-"}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANTS[t.status] || "default"}>
                  {STATUS_LABELS[t.status] || t.status}
                </Badge>
              </TableCell>
              <TableCell>{new Date(t.created_at).toLocaleDateString("ko-KR")}</TableCell>
              <TableCell>
                {t.status === "cancel_requested" && (
                  <Button size="sm" variant="outline" onClick={() => handleApproveCancel(t.id)}>
                    취소승인
                  </Button>
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
