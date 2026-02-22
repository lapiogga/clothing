"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/actions/auth";
import { getAvailablePoints } from "@/actions/points";
import { getOrders } from "@/actions/orders";
import { getTickets } from "@/actions/tickets";
import Link from "next/link";

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "주문 대기", confirmed: "주문 확인", shipping: "배송중",
  delivered: "배송 완료", cancelled: "취소", returned: "반품",
};
const ORDER_STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline", confirmed: "secondary", shipping: "secondary",
  delivered: "default", cancelled: "destructive", returned: "destructive",
};
const TICKET_STATUS_LABELS: Record<string, string> = {
  issued: "발행", registered: "등록", cancel_requested: "취소요청", cancelled: "취소",
};

export default function MyDashboardPage() {
  const [userName, setUserName] = useState("");
  const [points, setPoints] = useState({ total: 0, used: 0, reserved: 0, available: 0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [recentTickets, setRecentTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const user = await getCurrentUser();
      if (!user) return;
      setUserName(user.name);
      const [pointData, orderData, ticketData] = await Promise.all([
        getAvailablePoints(user.id),
        getOrders({ page: 1, limit: 5, user_id: user.id }),
        getTickets({ page: 1, limit: 5, user_id: user.id }),
      ]);
      setPoints(pointData);
      setRecentOrders(orderData.orders);
      setRecentTickets(ticketData.tickets);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="text-muted-foreground p-4">불러오는 중...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{userName}님 환영합니다</h1>
        <p className="text-sm text-muted-foreground mt-1">피복 구매관리 시스템</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">총 포인트</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{points.total.toLocaleString()}<span className="text-sm font-normal ml-1">원</span></div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">사용 포인트</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-muted-foreground">{points.used.toLocaleString()}<span className="text-sm font-normal ml-1">원</span></div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">예약 포인트</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-muted-foreground">{points.reserved.toLocaleString()}<span className="text-sm font-normal ml-1">원</span></div></CardContent>
        </Card>
        <Card className="border-primary">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">가용 포인트</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-primary">{points.available.toLocaleString()}<span className="text-sm font-normal ml-1">원</span></div></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">최근 구매 내역</CardTitle>
            <Link href="/my/orders"><Button variant="ghost" size="sm" className="text-xs">전체 보기</Button></Link>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-6">주문 내역이 없습니다</div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((o) => (
                  <div key={o.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0 last:pb-0">
                    <div>
                      <div className="font-mono text-xs text-primary">{o.order_number}</div>
                      <div className="text-muted-foreground text-xs mt-0.5">
                        {o.order_type === "online" ? "온라인" : "오프라인"} / {o.product_type === "finished" ? "완제품" : "맞춤"}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={ORDER_STATUS_VARIANTS[o.status] || "outline"} className="text-xs">
                        {ORDER_STATUS_LABELS[o.status] || o.status}
                      </Badge>
                      <span className="font-bold text-xs">{o.total_amount.toLocaleString()}원</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">체척권 현황</CardTitle>
            <Link href="/my/tickets"><Button variant="ghost" size="sm" className="text-xs">전체 보기</Button></Link>
          </CardHeader>
          <CardContent>
            {recentTickets.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-6">체척권이 없습니다</div>
            ) : (
              <div className="space-y-3">
                {recentTickets.map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0 last:pb-0">
                    <div>
                      <div className="font-mono text-xs">{t.ticket_number}</div>
                      <div className="text-muted-foreground text-xs mt-0.5">{t.products?.name || "-"}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge
                        variant={t.status === "cancelled" ? "destructive" : t.status === "registered" ? "default" : "outline"}
                        className="text-xs"
                      >
                        {TICKET_STATUS_LABELS[t.status] || t.status}
                      </Badge>
                      <span className="font-bold text-xs">{t.amount.toLocaleString()}원</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">빠른 이동</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            <Link href="/my/shop"><Button variant="outline">쇼핑하기</Button></Link>
            <Link href="/my/orders"><Button variant="outline">구매 내역</Button></Link>
            <Link href="/my/tickets"><Button variant="outline">체척권 현황</Button></Link>
            <Link href="/my/points"><Button variant="outline">포인트 내역</Button></Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
