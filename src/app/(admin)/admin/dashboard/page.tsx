import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const TICKET_STATUS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  issued:           { label: "발행",     variant: "default" },
  registered:       { label: "등록",     variant: "secondary" },
  cancel_requested: { label: "취소요청", variant: "destructive" },
  cancelled:        { label: "취소",     variant: "destructive" },
};

const POINT_TYPE: Record<string, string> = {
  grant: "지급", deduct: "차감", add: "추가",
  return: "반환", reserve: "예약", release: "예약해제",
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

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const now = new Date();
  const year = now.getFullYear();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [
    { count: activeUserCount },
    { data: grantData },
    { count: cancelRequestCount },
    { count: registeredTicketCount },
    // 판매소 현황
    { data: stores },
    { data: todaySalesOrders },
    { data: monthlySalesOrders },
    { data: inventoryData },
    // 체척업체 현황
    { data: tailors },
    { data: todayTickets },
    { data: monthlyTickets },
    // 최근 활동
    { data: recentTickets },
    { data: recentPoints },
  ] = await Promise.all([
    supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "user").eq("is_active", true),
    supabase.from("point_ledger").select("id, amount").eq("point_type", "grant").eq("fiscal_year", year),
    supabase.from("tailoring_tickets").select("id", { count: "exact", head: true }).eq("status", "cancel_requested"),
    supabase.from("tailoring_tickets").select("id", { count: "exact", head: true }).eq("status", "registered"),

    // 활성 판매소 목록
    supabase.from("stores").select("id, name").eq("is_active", true).order("name"),
    // 당일 배송완료 주문
    supabase.from("orders").select("store_id, total_amount").eq("status", "delivered").gte("updated_at", todayStart),
    // 당월 배송완료 주문
    supabase.from("orders").select("store_id, total_amount").eq("status", "delivered").gte("updated_at", monthStart),
    // 재고 현황 (전 판매소)
    supabase.from("inventory").select("store_id, product_id, quantity"),

    // 활성 체척업체 목록
    supabase.from("tailors").select("id, name").eq("is_active", true).order("name"),
    // 당일 등록된 체척권
    supabase.from("tailoring_tickets").select("tailor_id").eq("status", "registered").gte("registered_at", todayStart),
    // 당월 등록된 체척권
    supabase.from("tailoring_tickets").select("tailor_id").eq("status", "registered").gte("registered_at", monthStart),

    // 최근 체척권
    supabase.from("tailoring_tickets").select("id, ticket_number, status, created_at, users(name), products(name)").order("created_at", { ascending: false }).limit(5),
    // 최근 포인트 변동
    supabase.from("point_ledger").select("id, point_type, amount, description, created_at, users(name)").order("created_at", { ascending: false }).limit(5),
  ]);

  const totalGrantAmount = (grantData || []).reduce((s, r) => s + (r.amount || 0), 0);
  const granteeCount = grantData?.length ?? 0;

  // 판매소별 집계
  type StoreStat = {
    id: string; name: string;
    todayCount: number; todayAmount: number;
    monthCount: number; monthAmount: number;
    productCount: number; lowStockCount: number;
  };
  const storeMap = new Map<string, StoreStat>();
  (stores || []).forEach(s => storeMap.set(s.id, {
    id: s.id, name: s.name,
    todayCount: 0, todayAmount: 0,
    monthCount: 0, monthAmount: 0,
    productCount: 0, lowStockCount: 0,
  }));
  (todaySalesOrders || []).forEach((o: any) => {
    const s = storeMap.get(o.store_id);
    if (s) { s.todayAmount += o.total_amount; s.todayCount++; }
  });
  (monthlySalesOrders || []).forEach((o: any) => {
    const s = storeMap.get(o.store_id);
    if (s) { s.monthAmount += o.total_amount; s.monthCount++; }
  });
  // 재고: product_id 중복 제거 위해 store별 Set 사용
  const storeProductSets = new Map<string, Set<string>>();
  (inventoryData || []).forEach((inv: any) => {
    if (!storeProductSets.has(inv.store_id)) storeProductSets.set(inv.store_id, new Set());
    storeProductSets.get(inv.store_id)!.add(inv.product_id);
    const s = storeMap.get(inv.store_id);
    if (s && inv.quantity === 0) s.lowStockCount++;
  });
  storeMap.forEach((s, id) => {
    s.productCount = storeProductSets.get(id)?.size ?? 0;
  });
  const storeStat = Array.from(storeMap.values());

  // 체척업체별 집계
  type TailorStat = { id: string; name: string; todayCount: number; monthCount: number };
  const tailorMap = new Map<string, TailorStat>();
  (tailors || []).forEach(t => tailorMap.set(t.id, { id: t.id, name: t.name, todayCount: 0, monthCount: 0 }));
  (todayTickets || []).forEach((t: any) => {
    const s = tailorMap.get(t.tailor_id);
    if (s) s.todayCount++;
  });
  (monthlyTickets || []).forEach((t: any) => {
    const s = tailorMap.get(t.tailor_id);
    if (s) s.monthCount++;
  });
  const tailorStat = Array.from(tailorMap.values());

  // 주의 필요 알림
  const alerts = [
    (registeredTicketCount ?? 0) > 0 && { color: "bg-amber-50 border-amber-300 text-amber-700", label: `미정산 체척권 ${registeredTicketCount}건`, href: "/admin/settlements" },
    (cancelRequestCount ?? 0) > 0  && { color: "bg-orange-50 border-orange-300 text-orange-700", label: `체척권 취소요청 ${cancelRequestCount}건`, href: "/admin/tickets" },
  ].filter(Boolean) as { color: string; label: string; href: string }[];

  const shortcuts = [
    { label: "포인트 산정/지급", href: "/admin/points" },
    { label: "체척권 관리", href: "/admin/tickets" },
    { label: "사용자 등록", href: "/admin/users/new" },
    { label: "판매소 관리", href: "/admin/stores" },
    { label: "정산 관리", href: "/admin/settlements" },
  ];

  return (
    <div className="space-y-4">

      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between border-b pb-2">
        <h1 className="text-base font-bold">군수담당자 대시보드</h1>
        <span className="text-xs text-muted-foreground">
          {year}.{String(now.getMonth() + 1).padStart(2, "0")}.{String(now.getDate()).padStart(2, "0")}
        </span>
      </div>

      {/* KPI 4개 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <div className="border rounded p-3 bg-card">
          <p className="text-[11px] text-muted-foreground mb-1">활성 사용자</p>
          <p className="text-xl font-bold leading-none tabular-nums">{(activeUserCount ?? 0).toLocaleString()}<span className="text-sm font-normal ml-0.5">명</span></p>
          <Link href="/admin/users" className="text-[11px] text-primary hover:underline mt-1 block">사용자 관리 →</Link>
        </div>
        <div className="border rounded p-3 bg-card">
          <p className="text-[11px] text-muted-foreground mb-1">{year}년도 포인트 지급</p>
          <p className="text-xl font-bold leading-none tabular-nums">{formatAmount(totalGrantAmount)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{granteeCount}명 지급 완료</p>
        </div>
        <div className={`border rounded p-3 bg-card ${(cancelRequestCount ?? 0) > 0 ? "border-orange-400 bg-orange-50" : ""}`}>
          <p className="text-[11px] text-muted-foreground mb-1">체척권 취소요청</p>
          <p className={`text-xl font-bold leading-none tabular-nums ${(cancelRequestCount ?? 0) > 0 ? "text-orange-600" : ""}`}>
            {(cancelRequestCount ?? 0)}<span className="text-sm font-normal ml-0.5">건</span>
          </p>
          <Link href="/admin/tickets" className="text-[11px] text-primary hover:underline mt-1 block">체척권 관리 →</Link>
        </div>
        <div className={`border rounded p-3 bg-card ${(registeredTicketCount ?? 0) > 0 ? "border-amber-400 bg-amber-50" : ""}`}>
          <p className="text-[11px] text-muted-foreground mb-1">미정산 체척권</p>
          <p className={`text-xl font-bold leading-none tabular-nums ${(registeredTicketCount ?? 0) > 0 ? "text-amber-600" : ""}`}>
            {(registeredTicketCount ?? 0)}<span className="text-sm font-normal ml-0.5">건</span>
          </p>
          <Link href="/admin/settlements" className="text-[11px] text-primary hover:underline mt-1 block">정산 관리 →</Link>
        </div>
      </div>

      {/* 판매소별 현황 */}
      <div className="border rounded bg-card">
        <div className="flex items-center justify-between px-3 py-2 border-b bg-[#FAF7F2]">
          <p className="text-xs font-semibold">판매소별 매출 현황</p>
          <span className="text-[11px] text-muted-foreground">{now.getMonth() + 1}월 기준 배송완료</span>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">판매소</th>
              <th className="text-right px-3 py-1.5 text-muted-foreground font-medium">당일 건수</th>
              <th className="text-right px-3 py-1.5 text-muted-foreground font-medium">당일 매출</th>
              <th className="text-right px-3 py-1.5 text-muted-foreground font-medium">당월 건수</th>
              <th className="text-right px-3 py-1.5 text-muted-foreground font-medium">당월 매출</th>
              <th className="text-right px-3 py-1.5 text-muted-foreground font-medium">취급 품목</th>
              <th className="text-right px-3 py-1.5 text-muted-foreground font-medium">재고부족</th>
            </tr>
          </thead>
          <tbody>
            {storeStat.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-4 text-center text-muted-foreground">등록된 판매소 없음</td></tr>
            ) : (
              storeStat.map(s => (
                <tr key={s.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-1.5 font-medium">{s.name}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{s.todayCount.toLocaleString()}건</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{formatAmount(s.todayAmount)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{s.monthCount.toLocaleString()}건</td>
                  <td className="px-3 py-1.5 text-right tabular-nums font-medium">{formatAmount(s.monthAmount)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{s.productCount.toLocaleString()}종</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {s.lowStockCount > 0
                      ? <span className="text-red-600 font-medium">{s.lowStockCount}종</span>
                      : <span className="text-muted-foreground">-</span>
                    }
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 체척업체별 현황 */}
      <div className="border rounded bg-card">
        <div className="flex items-center justify-between px-3 py-2 border-b bg-[#FAF7F2]">
          <p className="text-xs font-semibold">체척업체별 등록 현황</p>
          <span className="text-[11px] text-muted-foreground">{now.getMonth() + 1}월 기준</span>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">업체명</th>
              <th className="text-right px-3 py-1.5 text-muted-foreground font-medium">당일 등록</th>
              <th className="text-right px-3 py-1.5 text-muted-foreground font-medium">당월 등록</th>
            </tr>
          </thead>
          <tbody>
            {tailorStat.length === 0 ? (
              <tr><td colSpan={3} className="px-3 py-4 text-center text-muted-foreground">등록된 체척업체 없음</td></tr>
            ) : (
              tailorStat.map(t => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-1.5 font-medium">{t.name}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{t.todayCount}건</td>
                  <td className="px-3 py-1.5 text-right tabular-nums font-medium">{t.monthCount}건</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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

      {/* 최근 활동 2열 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

        {/* 최근 체척권 */}
        <div className="border rounded bg-card">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <p className="text-xs font-semibold">최근 체척권</p>
            <Link href="/admin/tickets" className="text-[11px] text-primary hover:underline">전체 →</Link>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">티켓번호</th>
                <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">성명 / 품목</th>
                <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">일시</th>
                <th className="text-center px-2 py-1.5 text-muted-foreground font-medium">상태</th>
              </tr>
            </thead>
            <tbody>
              {(recentTickets ?? []).length === 0 ? (
                <tr><td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">데이터 없음</td></tr>
              ) : (
                (recentTickets ?? []).map((ticket: any) => (
                  <tr key={ticket.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-3 py-1.5 font-mono text-[10px]">{ticket.ticket_number}</td>
                    <td className="px-2 py-1.5">
                      <span className="font-medium">{(ticket.users as any)?.name}</span>
                      <span className="text-muted-foreground ml-1 text-[10px]">{(ticket.products as any)?.name}</span>
                    </td>
                    <td className="px-2 py-1.5 text-muted-foreground">{formatDate(ticket.created_at)}</td>
                    <td className="px-2 py-1.5 text-center">
                      <Badge variant={TICKET_STATUS[ticket.status]?.variant ?? "default"} className="text-[10px] px-1.5 py-0">
                        {TICKET_STATUS[ticket.status]?.label ?? ticket.status}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 최근 포인트 변동 */}
        <div className="border rounded bg-card">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <p className="text-xs font-semibold">최근 포인트 변동</p>
            <Link href="/admin/points/status" className="text-[11px] text-primary hover:underline">전체 →</Link>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">성명</th>
                <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">구분</th>
                <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">일시</th>
                <th className="text-right px-3 py-1.5 text-muted-foreground font-medium">금액</th>
              </tr>
            </thead>
            <tbody>
              {(recentPoints ?? []).length === 0 ? (
                <tr><td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">데이터 없음</td></tr>
              ) : (
                (recentPoints ?? []).map((ledger: any) => {
                  const isPositive = ["grant", "add", "return", "release"].includes(ledger.point_type);
                  return (
                    <tr key={ledger.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-3 py-1.5 font-medium">{(ledger.users as any)?.name}</td>
                      <td className="px-2 py-1.5 text-muted-foreground">{POINT_TYPE[ledger.point_type] ?? ledger.point_type}</td>
                      <td className="px-2 py-1.5 text-muted-foreground">{formatDate(ledger.created_at)}</td>
                      <td className={`px-3 py-1.5 text-right tabular-nums font-medium ${isPositive ? "text-blue-600" : "text-zinc-500"}`}>
                        {isPositive ? "+" : "-"}{formatAmount(ledger.amount)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
