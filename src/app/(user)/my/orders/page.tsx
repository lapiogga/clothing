"use client";

import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/shared/pagination";
import { getCurrentUser } from "@/actions/auth";
import { getOrders, cancelOrder } from "@/actions/orders";
import { toast } from "sonner";
import Link from "next/link";

const STATUS_LABELS: Record<string, string> = {
  pending: "주문 대기", confirmed: "주문 확인", shipping: "배송중", delivered: "배송 완료", cancelled: "취소", returned: "반품",
};
const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline", confirmed: "secondary", shipping: "secondary", delivered: "default", cancelled: "destructive", returned: "destructive",
};

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [userId, setUserId] = useState("");

  const fetchData = useCallback(async () => {
    if (!userId) return;
    const result = await getOrders({ page, user_id: userId });
    setOrders(result.orders);
    setTotal(result.total);
  }, [page, userId]);

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user) setUserId(user.id);
    });
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleCancel(orderId: string) {
    if (!confirm("주문을 취소하시겠습니까?")) return;
    const result = await cancelOrder(orderId);
    if (result.success) {
      toast.success("주문이 취소되었습니다");
      fetchData();
    } else {
      toast.error(result.error || "취소에 실패했습니다");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">구매 내역</h1>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>주문번호</TableHead>
            <TableHead>유형</TableHead>
            <TableHead>상태</TableHead>
            <TableHead className="text-right">금액</TableHead>
            <TableHead>주문일</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">주문 내역이 없습니다</TableCell>
            </TableRow>
          ) : orders.map((o) => (
            <TableRow key={o.id}>
              <TableCell>
                <Link href={`/my/orders/${o.id}`} className="font-mono text-sm text-primary hover:underline">
                  {o.order_number}
                </Link>
              </TableCell>
              <TableCell>{o.order_type === "online" ? "온라인" : "오프라인"} / {o.product_type === "finished" ? "완제품" : "맞춤"}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANTS[o.status] || "default"}>
                  {STATUS_LABELS[o.status] || o.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-bold">{o.total_amount.toLocaleString()}원</TableCell>
              <TableCell>{new Date(o.created_at).toLocaleDateString("ko-KR")}</TableCell>
              <TableCell>
                {["pending", "confirmed"].includes(o.status) && (
                  <Button size="sm" variant="destructive" onClick={() => handleCancel(o.id)}>취소</Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination page={page} total={total} limit={20} onChange={setPage} />
    </div>
  );
}
