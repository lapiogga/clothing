"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { getCurrentUser } from "@/actions/auth";
import { getDailySalesStats, getProductSalesStats, getUserSalesStats } from "@/actions/orders";
import { RANK_LABELS } from "@/lib/constants";

type StatsType = "daily" | "product" | "user";

export default function StatsPage() {
  const [storeId, setStoreId] = useState("");
  const [statsType, setStatsType] = useState<StatsType>("daily");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [dailyStats, setDailyStats] = useState<any[]>([]);
  const [productStats, setProductStats] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any[]>([]);

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user?.store_id) setStoreId(user.store_id);
    });
  }, []);

  async function handleSearch() {
    if (!storeId) return;
    if (statsType === "daily") {
      const data = await getDailySalesStats(storeId, dateFrom, dateTo);
      setDailyStats(data);
    } else if (statsType === "product") {
      const data = await getProductSalesStats(storeId, dateFrom, dateTo);
      setProductStats(data);
    } else {
      const data = await getUserSalesStats(storeId, dateFrom, dateTo);
      setUserStats(data);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">판매 통계</h1>

      <div className="flex gap-3 mb-6 items-end">
        <Select value={statsType} onValueChange={(v) => setStatsType(v as StatsType)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">일별</SelectItem>
            <SelectItem value="product">품목별</SelectItem>
            <SelectItem value="user">사용자별</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
        <span className="pb-2">~</span>
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
        <Button onClick={handleSearch}>조회</Button>
      </div>

      {statsType === "daily" && dailyStats.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>날짜</TableHead>
              <TableHead className="text-right">건수</TableHead>
              <TableHead className="text-right">매출액</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dailyStats.map((s) => (
              <TableRow key={s.date}>
                <TableCell>{s.date}</TableCell>
                <TableCell className="text-right">{s.count}건</TableCell>
                <TableCell className="text-right font-bold">{s.amount.toLocaleString()}원</TableCell>
              </TableRow>
            ))}
            <TableRow className="font-bold">
              <TableCell>합계</TableCell>
              <TableCell className="text-right">{dailyStats.reduce((s, d) => s + d.count, 0)}건</TableCell>
              <TableCell className="text-right">{dailyStats.reduce((s, d) => s + d.amount, 0).toLocaleString()}원</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )}

      {statsType === "product" && productStats.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>품목</TableHead>
              <TableHead>규격</TableHead>
              <TableHead className="text-right">수량</TableHead>
              <TableHead className="text-right">매출액</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productStats.map((s, i) => (
              <TableRow key={i}>
                <TableCell>{s.product_name}</TableCell>
                <TableCell>{s.spec_name || "-"}</TableCell>
                <TableCell className="text-right">{s.quantity}</TableCell>
                <TableCell className="text-right font-bold">{s.amount.toLocaleString()}원</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {statsType === "user" && userStats.length > 0 && (
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
            {userStats.map((s, i) => (
              <TableRow key={i}>
                <TableCell>{s.user_name}</TableCell>
                <TableCell>{RANK_LABELS[s.rank as keyof typeof RANK_LABELS] || s.rank}</TableCell>
                <TableCell className="text-right">{s.count}건</TableCell>
                <TableCell className="text-right font-bold">{s.amount.toLocaleString()}원</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {((statsType === "daily" && dailyStats.length === 0) ||
        (statsType === "product" && productStats.length === 0) ||
        (statsType === "user" && userStats.length === 0)) && (
        <div className="text-center text-muted-foreground py-8">조회 버튼을 눌러 통계를 확인하세요</div>
      )}
    </div>
  );
}
