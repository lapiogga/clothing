"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/actions/auth";
import { getOrders } from "@/actions/orders";
import { getInventory } from "@/actions/inventory";

export default function StoreDashboardPage() {
  const [storeId, setStoreId] = useState("");
  const [stats, setStats] = useState({
    todaySales: 0,
    todayAmount: 0,
    pendingOnline: 0,
    lowStock: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const user = await getCurrentUser();
      if (!user?.store_id) { setLoading(false); return; }
      const sid = user.store_id;
      setStoreId(sid);

      const today = new Date().toISOString().split("T")[0];

      const [todayData, pendingData, inventoryData] = await Promise.all([
        getOrders({ page: 1, limit: 1000, store_id: sid, order_type: "offline", status: "delivered", date_from: today, date_to: today }),
        getOrders({ page: 1, limit: 1000, store_id: sid, order_type: "online", status: "pending" }),
        getInventory({ page: 1, store_id: sid }),
      ]);

      const lowStock = (inventoryData.inventory || []).filter((inv: any) => inv.quantity < 10).length;

      setStats({
        todaySales: todayData.total,
        todayAmount: todayData.orders.reduce((s: number, o: any) => s + o.total_amount, 0),
        pendingOnline: pendingData.total,
        lowStock,
      });
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="text-muted-foreground p-6">불러오는 중...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">피복판매소 대시보드</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">오늘 판매건수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.todaySales}건</div>
            <p className="text-xs text-muted-foreground mt-1">오늘 완료된 오프라인 판매</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">오늘 매출액</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats.todayAmount.toLocaleString()}원</div>
            <p className="text-xs text-muted-foreground mt-1">오늘 판매 합계</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">온라인 대기</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-500">{stats.pendingOnline}건</div>
            <p className="text-xs text-muted-foreground mt-1">처리 대기 중인 온라인 주문</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">재고 부족</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{stats.lowStock}개</div>
            <p className="text-xs text-muted-foreground mt-1">수량 10 미만 품목</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
