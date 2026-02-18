"use client";

import { useEffect, useState, useCallback } from "react";
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
import { Pagination } from "@/components/shared/pagination";
import { getPointSummaries, getPointLedger } from "@/actions/points";
import { RANK_LABELS } from "@/lib/constants";

const POINT_TYPE_LABELS: Record<string, string> = {
  grant: "지급", deduct: "차감", add: "추가", return: "반환", reserve: "예약", release: "해제",
};

export default function PointStatusPage() {
  const [summaries, setSummaries] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [rank, setRank] = useState("");

  // 이력 다이얼로그
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [ledger, setLedger] = useState<any[]>([]);
  const [ledgerUser, setLedgerUser] = useState("");

  const fetchData = useCallback(async () => {
    const result = await getPointSummaries({
      page,
      search: search || undefined,
      rank: rank || undefined,
    });
    setSummaries(result.summaries);
    setTotal(result.total);
  }, [page, search, rank]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function openLedger(userId: string, userName: string) {
    setLedgerUser(userName);
    const result = await getPointLedger({ userId });
    setLedger(result.ledger);
    setLedgerOpen(true);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">포인트 현황</h1>

      <div className="flex gap-3 mb-4">
        <Input
          placeholder="이름 검색"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-60"
        />
        <Select value={rank} onValueChange={(v) => { setRank(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="계급 전체" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">계급 전체</SelectItem>
            {Object.entries(RANK_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>이름</TableHead>
            <TableHead>계급</TableHead>
            <TableHead className="text-right">총지급</TableHead>
            <TableHead className="text-right">사용</TableHead>
            <TableHead className="text-right">예약</TableHead>
            <TableHead className="text-right">잔여</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {summaries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">데이터가 없습니다</TableCell>
            </TableRow>
          ) : summaries.map((s) => {
            const available = s.total_points - s.used_points - s.reserved_points;
            return (
              <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openLedger(s.user_id, s.users?.name || "")}>
                <TableCell className="font-medium">{s.users?.name}</TableCell>
                <TableCell>{RANK_LABELS[s.users?.rank as keyof typeof RANK_LABELS] || "-"}</TableCell>
                <TableCell className="text-right">{s.total_points.toLocaleString()}</TableCell>
                <TableCell className="text-right">{s.used_points.toLocaleString()}</TableCell>
                <TableCell className="text-right">{s.reserved_points.toLocaleString()}</TableCell>
                <TableCell className="text-right font-bold">{available.toLocaleString()}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <Pagination page={page} total={total} limit={20} onChange={setPage} />

      {/* 변동 이력 다이얼로그 */}
      <Dialog open={ledgerOpen} onOpenChange={setLedgerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{ledgerUser} - 포인트 변동 이력</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>일시</TableHead>
                <TableHead>유형</TableHead>
                <TableHead className="text-right">금액</TableHead>
                <TableHead>설명</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledger.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{new Date(l.created_at).toLocaleString("ko-KR")}</TableCell>
                  <TableCell>
                    <Badge variant={["grant", "add", "return", "release"].includes(l.point_type) ? "secondary" : "destructive"}>
                      {POINT_TYPE_LABELS[l.point_type] || l.point_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{l.amount.toLocaleString()}</TableCell>
                  <TableCell>{l.description || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}
