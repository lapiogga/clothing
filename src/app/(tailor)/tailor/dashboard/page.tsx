"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/actions/auth";
import { getTickets } from "@/actions/tickets";

export default function TailorDashboardPage() {
  const [stats, setStats] = useState({ issued: 0, registered: 0, cancel_requested: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const user = await getCurrentUser();
      if (!user?.tailor_id) { setLoading(false); return; }

      const [myData, issuedData] = await Promise.all([
        getTickets({ page: 1, limit: 1000, tailor_id: user.tailor_id }),
        getTickets({ page: 1, limit: 1000, status: "issued" }),
      ]);

      const myTickets = myData.tickets;
      setStats({
        issued: issuedData.tickets.length,
        registered: myTickets.filter((t: any) => t.status === "registered").length,
        cancel_requested: myTickets.filter((t: any) => t.status === "cancel_requested").length,
        cancelled: myTickets.filter((t: any) => t.status === "cancelled").length,
      });
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="text-muted-foreground p-6">불러오는 중...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">체척업체 대시보드</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">발행(미등록)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.issued}</div>
            <p className="text-xs text-muted-foreground mt-1">등록 대기 중인 체척권</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">등록 완료</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats.registered}</div>
            <p className="text-xs text-muted-foreground mt-1">제작 진행 중</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">취소요청</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-500">{stats.cancel_requested}</div>
            <p className="text-xs text-muted-foreground mt-1">승인 대기 중</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">취소 완료</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{stats.cancelled}</div>
            <p className="text-xs text-muted-foreground mt-1">취소 처리됨</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
