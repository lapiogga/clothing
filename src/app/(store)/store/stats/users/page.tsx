"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { getCurrentUser } from "@/actions/auth";
import { getUserSalesStats } from "@/actions/orders";
import { RANK_LABELS } from "@/lib/constants";

export default function UserStatsPage() {
  const [storeId, setStoreId] = useState("");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [stats, setStats] = useState<any[]>([]);

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user?.store_id) setStoreId(user.store_id);
    });
  }, []);

  async function handleSearch() {
    if (!storeId) return;
    const data = await getUserSalesStats(storeId, dateFrom, dateTo);
    setStats(data);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">사용자별 판매현황</h1>

      <div className="flex gap-3 mb-6 items-center">
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
        <span>~</span>
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
        <Button onClick={handleSearch}>조회</Button>
      </div>

      {stats.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>이름</TableHead>
              <TableHead>계급</TableHead>
              <TableHead className="text-right">건수</TableHead>
              <TableHead className="text-right">총액</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stats.map((s, i) => (
              <TableRow key={i}>
                <TableCell>{s.user_name}</TableCell>
                <TableCell>{RANK_LABELS[s.rank as keyof typeof RANK_LABELS] || s.rank}</TableCell>
                <TableCell className="text-right">{s.count}건</TableCell>
                <TableCell className="text-right font-bold">{s.amount.toLocaleString()}원</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center text-muted-foreground py-8">조회 버튼을 눌러 통계를 확인하세요</div>
      )}
    </div>
  );
}
