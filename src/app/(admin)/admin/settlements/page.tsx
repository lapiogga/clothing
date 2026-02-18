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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Pagination } from "@/components/shared/pagination";
import { getSettlements, calculateSettlement, createSettlement, confirmSettlement } from "@/actions/settlements";
import { getTailors } from "@/actions/tailors";
import { toast } from "sonner";

export default function SettlementsPage() {
  const [settlements, setSettlements] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [tailors, setTailors] = useState<any[]>([]);

  // 정산 생성 다이얼로그
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTailor, setSelectedTailor] = useState("");
  const [calcTickets, setCalcTickets] = useState<any[]>([]);
  const [calcTotal, setCalcTotal] = useState(0);
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [pending, setPending] = useState(false);

  const fetchData = useCallback(async () => {
    const result = await getSettlements({ page, status: status || undefined });
    setSettlements(result.settlements);
    setTotal(result.total);
  }, [page, status]);

  useEffect(() => {
    fetchData();
    getTailors().then((r) => setTailors(r.tailors || []));
  }, [fetchData]);

  async function handleCalculate() {
    if (!selectedTailor) { toast.error("업체를 선택해주세요"); return; }
    const result = await calculateSettlement(selectedTailor);
    if (result.error) {
      toast.error(result.error);
    } else {
      setCalcTickets(result.tickets);
      setCalcTotal(result.total_amount);
    }
  }

  async function handleCreate() {
    if (!periodFrom || !periodTo) { toast.error("정산 기간을 입력해주세요"); return; }
    setPending(true);
    const result = await createSettlement({
      tailor_id: selectedTailor,
      ticket_ids: calcTickets.map((t) => t.id),
      total_amount: calcTotal,
      period_from: periodFrom,
      period_to: periodTo,
    });
    if (result.success) {
      toast.success("정산이 생성되었습니다");
      setCreateOpen(false);
      setCalcTickets([]);
      fetchData();
    } else {
      toast.error(result.error || "정산 생성에 실패했습니다");
    }
    setPending(false);
  }

  async function handleConfirm(settlementId: string) {
    if (!confirm("정산을 확정(지급완료)하시겠습니까?")) return;
    const result = await confirmSettlement(settlementId);
    if (result.success) {
      toast.success("정산이 확정되었습니다");
      fetchData();
    } else {
      toast.error(result.error || "확정에 실패했습니다");
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">체척업체 정산</h1>
        <Button onClick={() => { setCreateOpen(true); setSelectedTailor(""); setCalcTickets([]); setCalcTotal(0); }}>
          새 정산
        </Button>
      </div>

      <div className="flex gap-3 mb-4">
        <Select value={status} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="상태 전체" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="pending">대기</SelectItem>
            <SelectItem value="confirmed">확정</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>업체명</TableHead>
            <TableHead>기간</TableHead>
            <TableHead className="text-right">건수</TableHead>
            <TableHead className="text-right">금액</TableHead>
            <TableHead>상태</TableHead>
            <TableHead>생성일</TableHead>
            <TableHead>처리</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {settlements.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">데이터가 없습니다</TableCell>
            </TableRow>
          ) : settlements.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-medium">{s.tailors?.name}</TableCell>
              <TableCell className="text-sm">{s.period_from} ~ {s.period_to}</TableCell>
              <TableCell className="text-right">{s.ticket_count}건</TableCell>
              <TableCell className="text-right font-bold">{s.total_amount.toLocaleString()}원</TableCell>
              <TableCell>
                <Badge variant={s.status === "confirmed" ? "default" : "outline"}>
                  {s.status === "confirmed" ? "확정" : "대기"}
                </Badge>
              </TableCell>
              <TableCell>{new Date(s.created_at).toLocaleDateString("ko-KR")}</TableCell>
              <TableCell>
                {s.status === "pending" && (
                  <Button size="sm" variant="outline" onClick={() => handleConfirm(s.id)}>확정</Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination page={page} total={total} limit={20} onChange={setPage} />

      {/* 정산 생성 다이얼로그 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>새 정산 생성</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">체척업체</label>
                <Select value={selectedTailor} onValueChange={setSelectedTailor}>
                  <SelectTrigger><SelectValue placeholder="업체 선택" /></SelectTrigger>
                  <SelectContent>
                    {tailors.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={handleCalculate}>산출</Button>
            </div>

            {calcTickets.length > 0 && (
              <>
                <Card>
                  <CardContent className="pt-4 flex gap-8">
                    <div>
                      <div className="text-sm text-muted-foreground">대상 체척권</div>
                      <div className="text-xl font-bold">{calcTickets.length}건</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">총 금액</div>
                      <div className="text-xl font-bold">{calcTotal.toLocaleString()}원</div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">기간 시작</label>
                    <Input type="date" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">기간 종료</label>
                    <Input type="date" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} />
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>체척권 번호</TableHead>
                      <TableHead>사용자</TableHead>
                      <TableHead>품목</TableHead>
                      <TableHead className="text-right">금액</TableHead>
                      <TableHead>등록일</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calcTickets.map((t: any) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono text-sm">{t.ticket_number}</TableCell>
                        <TableCell>{t.users?.name}</TableCell>
                        <TableCell>{t.products?.name}</TableCell>
                        <TableCell className="text-right">{t.amount.toLocaleString()}</TableCell>
                        <TableCell>{t.registered_at ? new Date(t.registered_at).toLocaleDateString("ko-KR") : "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <Button onClick={handleCreate} disabled={pending} className="w-full">
                  {pending ? "생성 중..." : "정산 생성"}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
