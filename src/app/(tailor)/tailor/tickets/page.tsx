"use client";

import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/shared/pagination";
import { getCurrentUser } from "@/actions/auth";
import { getTickets } from "@/actions/tickets";

const STATUS_LABELS: Record<string, string> = {
  issued: "발행", registered: "등록", cancel_requested: "취소요청", cancelled: "취소",
};
const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  issued: "outline", registered: "default", cancel_requested: "secondary", cancelled: "destructive",
};

export default function TailorTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [tailorId, setTailorId] = useState("");

  const fetchData = useCallback(async () => {
    if (!tailorId) return;

    // issued(tailor_id=null) 상태와 내 tailor_id 체척권을 모두 조회
    const fetchMine = status && status !== "issued"
      ? getTickets({ page: 1, limit: 1000, tailor_id: tailorId, status })
      : getTickets({ page: 1, limit: 1000, tailor_id: tailorId });

    const fetchIssued = !status || status === "issued"
      ? getTickets({ page: 1, limit: 1000, status: "issued" })
      : Promise.resolve({ tickets: [], total: 0 });

    const [myResult, issuedResult] = await Promise.all([fetchMine, fetchIssued]);

    let combined: any[] = [];
    if (!status || status === "issued") {
      combined = [...issuedResult.tickets, ...myResult.tickets.filter((t: any) => t.status !== "issued")];
    } else {
      combined = myResult.tickets;
    }

    const offset = (page - 1) * 20;
    setTickets(combined.slice(offset, offset + 20));
    setTotal(combined.length);
  }, [page, status, tailorId]);

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user?.tailor_id) setTailorId(user.tailor_id);
    });
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">체척권 현황</h1>

      <div className="flex gap-3 mb-4">
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
            <TableHead>상태</TableHead>
            <TableHead>등록일</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">데이터가 없습니다</TableCell>
            </TableRow>
          ) : tickets.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="font-mono text-sm">{t.ticket_number}</TableCell>
              <TableCell>{t.users?.name}</TableCell>
              <TableCell>{t.products?.name}</TableCell>
              <TableCell className="text-right">{t.amount.toLocaleString()}원</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANTS[t.status] || "default"}>
                  {STATUS_LABELS[t.status] || t.status}
                </Badge>
              </TableCell>
              <TableCell>{t.registered_at ? new Date(t.registered_at).toLocaleDateString("ko-KR") : "-"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination page={page} total={total} limit={20} onChange={setPage} />
    </div>
  );
}
