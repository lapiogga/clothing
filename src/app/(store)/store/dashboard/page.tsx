import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/actions/auth";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshButton } from "./_components/refresh-button";

const ORDER_STATUS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending:   { label: "대기",   variant: "default" },
  confirmed: { label: "확인",   variant: "secondary" },
  shipping:  { label: "배송중", variant: "outline" },
  delivered: { label: "완료",   variant: "secondary" },
  cancelled: { label: "취소",   variant: "destructive" },
  returned:  { label: "반품",   variant: "destructive" },
};

function formatAmount(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

export default async function StoreDashboardPage() {
  const user = await getCurrentUser();
  if (!user?.store_id) redirect("/");

  const supabase = await createClient();
  const storeId = user.store_id;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [
    // 당일 판매 완료 (오프라인)
    { data: todaySales },
    // 당월 판매 완료 (전체)
    { data: monthlySales },
    // 미처리 온라인 주문 목록 (대기+확인)
    { data: pendingOrders },
    // 오늘 배송완료 처리된 주문
    { count: todayDeliveredCount },
    // 최근 주문 (배송완료 포함 전체)
    { data: recentOrders },
    // 재고부족 품목 (quantity < 10)
    { data: lowStockItems },
    // 판매소 정보
    { data: storeInfo },
  ] = await Promise.all([
    // 당일 판매완료
    supabase.from("orders")
      .select("total_amount")
      .eq("store_id", storeId)
      .eq("status", "delivered")
      .gte("updated_at", todayStart),

    // 당월 판매완료
    supabase.from("orders")
      .select("total_amount")
      .eq("store_id", storeId)
      .eq("status", "delivered")
      .gte("updated_at", monthStart),

    // 미처리 온라인 주문 목록
    supabase.from("orders")
      .select("id, order_number, total_amount, status, created_at, order_type, users(name, rank, unit)")
      .eq("store_id", storeId)
      .eq("order_type", "online")
      .in("status", ["pending", "confirmed"])
      .order("created_at", { ascending: true })
      .limit(10),

    // 오늘 배송완료 건수
    supabase.from("orders")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("status", "delivered")
      .gte("updated_at", todayStart),

    // 최근 주문 (오프라인 포함)
    supabase.from("orders")
      .select("id, order_number, total_amount, status, order_type, created_at, users(name)")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(8),

    // 재고부족 품목
    supabase.from("inventory")
      .select("id, quantity, products(name), product_specs(spec_name)")
      .eq("store_id", storeId)
      .lt("quantity", 10)
      .order("quantity", { ascending: true })
      .limit(10),

    // 판매소 정보
    supabase.from("stores").select("name").eq("id", storeId).single(),
  ]);

  const todayCount   = todaySales?.length ?? 0;
  const todayAmount  = (todaySales || []).reduce((s, o) => s + (o.total_amount || 0), 0);
  const monthCount   = monthlySales?.length ?? 0;
  const monthAmount  = (monthlySales || []).reduce((s, o) => s + (o.total_amount || 0), 0);
  const pendingCount = pendingOrders?.length ?? 0;
  const lowStockCount = lowStockItems?.length ?? 0;

  const RANK_LABELS: Record<string, string> = {
    general: "대장", colonel: "대령", lt_colonel: "중령", major: "소령",
    captain: "대위", first_lt: "중위", second_lt: "소위", warrant: "준위",
    sgt_major: "원사", master_sgt: "상사", sgt: "병장", civil_servant: "군무원",
  };

  const alerts = [
    pendingCount > 0 && { color: "bg-red-50 border-red-300 text-red-700", label: `미처리 온라인주문 ${pendingCount}건`, href: "/store/orders" },
    lowStockCount > 0 && { color: "bg-amber-50 border-amber-300 text-amber-700", label: `재고부족 품목 ${lowStockCount}종`, href: "/store/inventory" },
  ].filter(Boolean) as { color: string; label: string; href: string }[];

  const shortcuts = [
    { label: "새 판매", href: "/store/sales/new" },
    { label: "주문 처리", href: "/store/orders" },
    { label: "재고 관리", href: "/store/inventory" },
    { label: "입고 처리", href: "/store/inventory/incoming" },
    { label: "반품 처리", href: "/store/sales/return" },
    { label: "매출 통계", href: "/store/stats" },
  ];

  return (
    <div className="space-y-4">

      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between border-b pb-2">
        <div>
          <h1 className="text-base font-bold">피복판매소 대시보드</h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">{storeInfo?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {now.getFullYear()}.{String(now.getMonth() + 1).padStart(2, "0")}.{String(now.getDate()).padStart(2, "0")}
          </span>
          <RefreshButton />
        </div>
      </div>

      {/* KPI 6개 */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
        <div className="border rounded p-3 bg-card">
          <p className="text-[11px] text-muted-foreground mb-1">당일 판매건수</p>
          <p className="text-xl font-bold leading-none tabular-nums">{todayCount}<span className="text-sm font-normal ml-0.5">건</span></p>
          <p className="text-[11px] text-muted-foreground mt-0.5">오프라인 완료</p>
        </div>
        <div className="border rounded p-3 bg-card">
          <p className="text-[11px] text-muted-foreground mb-1">당일 매출</p>
          <p className="text-xl font-bold leading-none tabular-nums">{formatAmount(todayAmount)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">배송완료 기준</p>
        </div>
        <div className="border rounded p-3 bg-card">
          <p className="text-[11px] text-muted-foreground mb-1">당월 판매건수</p>
          <p className="text-xl font-bold leading-none tabular-nums">{monthCount}<span className="text-sm font-normal ml-0.5">건</span></p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{now.getMonth() + 1}월 누적</p>
        </div>
        <div className="border rounded p-3 bg-card">
          <p className="text-[11px] text-muted-foreground mb-1">당월 매출</p>
          <p className="text-xl font-bold leading-none tabular-nums">{formatAmount(monthAmount)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{now.getMonth() + 1}월 누적</p>
        </div>
        <div className={`border rounded p-3 bg-card ${pendingCount > 0 ? "border-red-400 bg-red-50" : ""}`}>
          <p className="text-[11px] text-muted-foreground mb-1">미처리 온라인주문</p>
          <p className={`text-xl font-bold leading-none tabular-nums ${pendingCount > 0 ? "text-red-600" : ""}`}>
            {pendingCount}<span className="text-sm font-normal ml-0.5">건</span>
          </p>
          <Link href="/store/orders" className="text-[11px] text-primary hover:underline mt-1 block">주문 처리 →</Link>
        </div>
        <div className={`border rounded p-3 bg-card ${lowStockCount > 0 ? "border-amber-400 bg-amber-50" : ""}`}>
          <p className="text-[11px] text-muted-foreground mb-1">재고부족 품목</p>
          <p className={`text-xl font-bold leading-none tabular-nums ${lowStockCount > 0 ? "text-amber-600" : ""}`}>
            {lowStockCount}<span className="text-sm font-normal ml-0.5">종</span>
          </p>
          <Link href="/store/inventory" className="text-[11px] text-primary hover:underline mt-1 block">재고 관리 →</Link>
        </div>
      </div>

      {/* 주의사항 + 바로가기 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="border rounded p-3 bg-card">
          <p className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">주의 필요</p>
          {alerts.length === 0 ? (
            <p className="text-xs text-muted-foreground">처리 필요 항목 없음</p>
          ) : (
            <div className="space-y-1.5">
              {alerts.map(a => (
                <Link key={a.href} href={a.href}>
                  <div className={`flex items-center gap-2 text-xs border rounded px-2 py-1.5 font-medium hover:opacity-80 ${a.color}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                    {a.label}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="lg:col-span-2 border rounded p-3 bg-card">
          <p className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">빠른 이동</p>
          <div className="flex flex-wrap gap-1.5">
            {shortcuts.map(s => (
              <Button key={s.href} asChild variant="outline" size="sm" className="h-7 text-xs">
                <Link href={s.href}>{s.label}</Link>
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* 미처리 온라인 주문 */}
      <div className="border rounded bg-card">
        <div className="flex items-center justify-between px-3 py-2 border-b bg-[#FAF7F2]">
          <p className="text-xs font-semibold">미처리 온라인 주문</p>
          <Link href="/store/orders" className="text-[11px] text-primary hover:underline">전체 →</Link>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">주문번호</th>
              <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">성명 / 소속</th>
              <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">접수일시</th>
              <th className="text-right px-3 py-1.5 text-muted-foreground font-medium">금액</th>
              <th className="text-center px-3 py-1.5 text-muted-foreground font-medium">상태</th>
              <th className="text-center px-3 py-1.5 text-muted-foreground font-medium">처리</th>
            </tr>
          </thead>
          <tbody>
            {(pendingOrders ?? []).length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">미처리 주문 없음</td></tr>
            ) : (
              (pendingOrders ?? []).map((order: any) => (
                <tr key={order.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-1.5 font-mono text-[10px]">{order.order_number}</td>
                  <td className="px-3 py-1.5">
                    <span className="font-medium">{(order.users as any)?.name}</span>
                    {(order.users as any)?.rank && (
                      <span className="text-muted-foreground ml-1">{RANK_LABELS[(order.users as any).rank] ?? ""}</span>
                    )}
                    {(order.users as any)?.unit && (
                      <span className="text-[10px] text-muted-foreground/70 ml-1">{(order.users as any).unit}</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-muted-foreground">{formatDate(order.created_at)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums font-medium">{formatAmount(order.total_amount)}</td>
                  <td className="px-3 py-1.5 text-center">
                    <Badge variant={ORDER_STATUS[order.status]?.variant ?? "default"} className="text-[10px] px-1.5 py-0">
                      {ORDER_STATUS[order.status]?.label ?? order.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    <Button asChild variant="secondary" size="sm" className="h-6 text-[10px] px-2">
                      <Link href={`/store/orders/${order.id}`}>처리</Link>
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 최근 주문 + 재고부족 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

        {/* 최근 주문 */}
        <div className="border rounded bg-card">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <p className="text-xs font-semibold">최근 주문</p>
            <Link href="/store/orders" className="text-[11px] text-primary hover:underline">전체 →</Link>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">주문번호</th>
                <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">성명</th>
                <th className="text-center px-2 py-1.5 text-muted-foreground font-medium">유형</th>
                <th className="text-right px-3 py-1.5 text-muted-foreground font-medium">금액</th>
                <th className="text-center px-2 py-1.5 text-muted-foreground font-medium">상태</th>
              </tr>
            </thead>
            <tbody>
              {(recentOrders ?? []).length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">데이터 없음</td></tr>
              ) : (
                (recentOrders ?? []).map((order: any) => (
                  <tr key={order.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-3 py-1.5 font-mono text-[10px]">{order.order_number}</td>
                    <td className="px-2 py-1.5">{(order.users as any)?.name}</td>
                    <td className="px-2 py-1.5 text-center text-muted-foreground">
                      {order.order_type === "online" ? "온라인" : "오프라인"}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{formatAmount(order.total_amount)}</td>
                    <td className="px-2 py-1.5 text-center">
                      <Badge variant={ORDER_STATUS[order.status]?.variant ?? "default"} className="text-[10px] px-1.5 py-0">
                        {ORDER_STATUS[order.status]?.label ?? order.status}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 재고부족 품목 */}
        <div className="border rounded bg-card">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <p className="text-xs font-semibold">재고부족 품목 <span className="text-[10px] text-muted-foreground font-normal">(10개 미만)</span></p>
            <Link href="/store/inventory" className="text-[11px] text-primary hover:underline">재고 관리 →</Link>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">품목명</th>
                <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">규격</th>
                <th className="text-right px-3 py-1.5 text-muted-foreground font-medium">현재고</th>
              </tr>
            </thead>
            <tbody>
              {(lowStockItems ?? []).length === 0 ? (
                <tr><td colSpan={3} className="px-3 py-4 text-center text-muted-foreground">재고부족 품목 없음</td></tr>
              ) : (
                (lowStockItems ?? []).map((inv: any) => (
                  <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-3 py-1.5 font-medium">{(inv.products as any)?.name}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{(inv.product_specs as any)?.spec_name ?? "-"}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      <span className={inv.quantity === 0 ? "text-red-600 font-bold" : "text-amber-600 font-medium"}>
                        {inv.quantity}개
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
