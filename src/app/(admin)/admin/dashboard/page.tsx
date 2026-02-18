import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const ORDER_STATUS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending:   { label: "대기",   variant: "default" },
  confirmed: { label: "확인",   variant: "secondary" },
  shipping:  { label: "배송중", variant: "outline" },
  delivered: { label: "완료",   variant: "secondary" },
  cancelled: { label: "취소",   variant: "destructive" },
  returned:  { label: "반품",   variant: "destructive" },
};

const TICKET_STATUS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  issued:           { label: "발행",     variant: "default" },
  registered:       { label: "등록",     variant: "secondary" },
  cancel_requested: { label: "취소요청", variant: "destructive" },
  cancelled:        { label: "취소",     variant: "destructive" },
};

const POINT_TYPE: Record<string, string> = {
  grant:   "지급",
  deduct:  "차감",
  add:     "추가",
  return:  "반환",
  reserve: "예약",
  release: "예약해제",
};

function formatAmount(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const now = new Date();
  const year = now.getFullYear();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [
    { count: activeUserCount },
    { data: grantData },
    { count: cancelRequestCount },
    { count: monthlyOrderCount },
    { data: recentOrders },
    { data: recentTickets },
    { data: recentPoints },
  ] = await Promise.all([
    supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("role", "user")
      .eq("is_active", true),
    supabase
      .from("point_ledger")
      .select("id, amount")
      .eq("point_type", "grant")
      .eq("fiscal_year", year),
    supabase
      .from("tailoring_tickets")
      .select("id", { count: "exact", head: true })
      .eq("status", "cancel_requested"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthStart),
    supabase
      .from("orders")
      .select("order_number, total_amount, status, created_at, users(name)")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("tailoring_tickets")
      .select("id, ticket_number, status, created_at, users(name), products(name)")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("point_ledger")
      .select("id, point_type, amount, description, created_at, users(name)")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const totalGrantAmount = (grantData || []).reduce((s, r) => s + (r.amount || 0), 0);
  const granteeCount = grantData?.length ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">군수담당자 대시보드</h1>

      {/* 요약 카드 4개 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>활성 사용자 (일반)</CardDescription>
            <CardTitle className="text-3xl">
              {(activeUserCount ?? 0).toLocaleString()}명
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/admin/users">
              <span className="text-sm text-muted-foreground hover:underline">
                사용자 관리 →
              </span>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>{year}년도 포인트 지급</CardDescription>
            <CardTitle className="text-2xl">{formatAmount(totalGrantAmount)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {granteeCount}명 지급 완료
            </p>
          </CardContent>
        </Card>

        <Card className={(cancelRequestCount ?? 0) > 0 ? "border-destructive" : ""}>
          <CardHeader>
            <CardDescription>미처리 체척권 취소 요청</CardDescription>
            <CardTitle className="text-3xl">
              {(cancelRequestCount ?? 0)}건
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/admin/tickets">
              <span className="text-sm text-muted-foreground hover:underline">
                체척권 관리 →
              </span>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>당월 주문 ({now.getMonth() + 1}월)</CardDescription>
            <CardTitle className="text-3xl">
              {(monthlyOrderCount ?? 0).toLocaleString()}건
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">이번 달 누적</p>
          </CardContent>
        </Card>
      </div>

      {/* 바로가기 버튼 */}
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/points">포인트 산정/지급</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/tickets">체척권 관리</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/users/new">사용자 등록</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/stores">판매소 관리</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/settlements">정산 관리</Link>
        </Button>
      </div>

      {/* 최근 활동 3열 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 최근 주문 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">최근 주문</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(recentOrders ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">데이터가 없습니다</p>
            ) : (
              (recentOrders ?? []).map((order: any) => (
                <div key={order.order_number} className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{order.order_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {(order.users as any)?.name} · {formatDate(order.created_at)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm">{formatAmount(order.total_amount)}</p>
                    <Badge
                      variant={ORDER_STATUS[order.status]?.variant ?? "default"}
                      className="text-xs"
                    >
                      {ORDER_STATUS[order.status]?.label ?? order.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* 최근 체척권 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">최근 체척권</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(recentTickets ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">데이터가 없습니다</p>
            ) : (
              (recentTickets ?? []).map((ticket: any) => (
                <div key={ticket.id} className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{ticket.ticket_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {(ticket.users as any)?.name} · {formatDate(ticket.created_at)}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {(ticket.products as any)?.name}
                    </p>
                  </div>
                  <Badge
                    variant={TICKET_STATUS[ticket.status]?.variant ?? "default"}
                    className="text-xs shrink-0"
                  >
                    {TICKET_STATUS[ticket.status]?.label ?? ticket.status}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* 최근 포인트 변동 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">최근 포인트 변동</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(recentPoints ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">데이터가 없습니다</p>
            ) : (
              (recentPoints ?? []).map((ledger: any) => {
                const isPositive = ["grant", "add", "return", "release"].includes(ledger.point_type);
                return (
                  <div key={ledger.id} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {(ledger.users as any)?.name}{" "}
                        <span className="font-normal text-muted-foreground">
                          ({POINT_TYPE[ledger.point_type] ?? ledger.point_type})
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {ledger.description}
                      </p>
                    </div>
                    <p
                      className={`text-sm font-medium shrink-0 ${
                        isPositive ? "text-green-600" : "text-destructive"
                      }`}
                    >
                      {isPositive ? "+" : "-"}{formatAmount(ledger.amount)}
                    </p>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
