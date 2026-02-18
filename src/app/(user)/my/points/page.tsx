"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { getCurrentUser } from "@/actions/auth";
import { getAvailablePoints, getPointLedger } from "@/actions/points";
import { Pagination } from "@/components/shared/pagination";

const POINT_TYPE_LABELS: Record<string, string> = {
  grant: "지급", deduct: "차감", add: "추가", return: "반환", reserve: "예약", release: "해제",
};

export default function MyPointsPage() {
  const [points, setPoints] = useState({ total: 0, used: 0, reserved: 0, available: 0 });
  const [ledger, setLedger] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user) {
        getAvailablePoints(user.id).then(setPoints);
        getPointLedger({ userId: user.id, page }).then((r) => {
          setLedger(r.ledger);
          setTotal(r.total);
        });
      }
    });
  }, [page]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">포인트 현황</h1>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-sm text-muted-foreground">총 지급</div>
            <div className="text-2xl font-bold">{points.total.toLocaleString()}원</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-sm text-muted-foreground">사용</div>
            <div className="text-2xl font-bold">{points.used.toLocaleString()}원</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-sm text-muted-foreground">예약</div>
            <div className="text-2xl font-bold">{points.reserved.toLocaleString()}원</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-sm text-muted-foreground">가용 잔액</div>
            <div className="text-2xl font-bold text-primary">{points.available.toLocaleString()}원</div>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-lg font-bold mb-3">변동 이력</h2>
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
          {ledger.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">변동 이력이 없습니다</TableCell>
            </TableRow>
          ) : ledger.map((l) => (
            <TableRow key={l.id}>
              <TableCell>{new Date(l.created_at).toLocaleString("ko-KR")}</TableCell>
              <TableCell>
                <Badge variant={["grant", "add", "return", "release"].includes(l.point_type) ? "secondary" : "destructive"}>
                  {POINT_TYPE_LABELS[l.point_type] || l.point_type}
                </Badge>
              </TableCell>
              <TableCell className="text-right">{l.amount.toLocaleString()}원</TableCell>
              <TableCell>{l.description || "-"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination page={page} total={total} limit={20} onChange={setPage} />
    </div>
  );
}
