"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/shared/pagination";
import { getCurrentUser } from "@/actions/auth";
import { getOrders, updateOrderStatus, cancelOrder } from "@/actions/orders";
import { toast } from "sonner";
import Link from "next/link";

const STATUS_LABELS: Record<string, string> = {
  pending: "대기", confirmed: "확인", shipping: "배송중", delivered: "완료", cancelled: "취소",
};
const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline", confirmed: "secondary", shipping: "secondary", delivered: "default", cancelled: "destructive",
};

export default function StoreOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [storeId, setStoreId] = useState("");

  const fetchData = useCallback(async () => {
    if (!storeId) return;
    const result = await getOrders({
      page, store_id: storeId, order_type: "online", status: status || undefined,
    });
    setOrders(result.orders);
    setTotal(result.total);
  }, [page, status, storeId]);

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user?.store_id) setStoreId(user.store_id);
    });
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleStatusChange(orderId: string, newStatus: string) {
    const result = await updateOrderStatus(orderId, newStatus);
    if (result.success) {
      toast.success("상태가 변경되었습니다");
      fetchData();
    } else {
      toast.error(result.error || "변경에 실패했습니다");
    }
  }

  async function handleCancel(orderId: string) {
    if (!confirm("이 주문을 취소하시겠습니까?")) return;
    const result = await cancelOrder(orderId, "판매소 직권 취소");
    if (result.success) {
      toast.success("주문이 취소되었습니다");
      fetchData();
    } else {
      toast.error(result.error || "취소에 실패했습니다");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">온라인 주문 관리</h1>

      <div className="flex gap-3 mb-4">
        <Select value={status} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="상태 전체" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>주문번호</TableHead>
            <TableHead>주문자</TableHead>
            <TableHead>유형</TableHead>
            <TableHead>상태</TableHead>
            <TableHead className="text-right">금액</TableHead>
            <TableHead>일시</TableHead>
            <TableHead>처리</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">데이터가 없습니다</TableCell>
            </TableRow>
          ) : orders.map((o) => (
            <TableRow key={o.id}>
              <TableCell>
                <Link href={`/store/orders/${o.id}`} className="font-mono text-sm text-primary hover:underline">
                  {o.order_number}
                </Link>
              </TableCell>
              <TableCell>{o.users?.name}</TableCell>
              <TableCell>{o.product_type === "finished" ? "완제품" : "맞춤"}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANTS[o.status] || "default"}>
                  {STATUS_LABELS[o.status] || o.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">{o.total_amount.toLocaleString()}원</TableCell>
              <TableCell>{new Date(o.created_at).toLocaleDateString("ko-KR")}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {o.status === "pending" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleStatusChange(o.id, "confirmed")}>확인</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleCancel(o.id)}>취소</Button>
                    </>
                  )}
                  {o.status === "confirmed" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleStatusChange(o.id, "shipping")}>배송</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleCancel(o.id)}>취소</Button>
                    </>
                  )}
                  {o.status === "shipping" && (
                    <Button size="sm" variant="outline" onClick={() => handleStatusChange(o.id, "delivered")}>완료</Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination page={page} total={total} limit={20} onChange={setPage} />
    </div>
  );
}
