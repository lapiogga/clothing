"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { getOrderById } from "@/actions/orders";

const STATUS_LABELS: Record<string, string> = {
  pending: "주문 대기", confirmed: "주문 확인", shipping: "배송중", delivered: "배송 완료", cancelled: "취소", returned: "반품",
};

export default function MyOrderDetailPage() {
  const params = useParams();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (params.id) {
      getOrderById(params.id as string).then((r) => {
        setOrder(r.order);
        setItems(r.items);
      });
    }
  }, [params.id]);

  if (!order) return <div className="text-muted-foreground">로딩 중...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">주문 상세</h1>

      <Card className="mb-6">
        <CardHeader><CardTitle>주문 정보</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">주문번호</span><span className="font-mono">{order.order_number}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">상태</span><Badge>{STATUS_LABELS[order.status]}</Badge></div>
          <div className="flex justify-between"><span className="text-muted-foreground">유형</span><span>{order.order_type === "online" ? "온라인" : "오프라인"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">총액</span><span className="font-bold">{order.total_amount.toLocaleString()}원</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">주문일</span><span>{new Date(order.created_at).toLocaleString("ko-KR")}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">판매소</span><span>{order.stores?.name}</span></div>
          {order.delivery_method && (
            <div className="flex justify-between"><span className="text-muted-foreground">배송</span><span>{order.delivery_method === "direct" ? "직접배송" : "택배"}</span></div>
          )}
          {order.delivery_address && (
            <div className="flex justify-between col-span-2"><span className="text-muted-foreground">주소</span><span>{order.delivery_address}</span></div>
          )}
          {order.cancel_reason && (
            <div className="flex justify-between col-span-2"><span className="text-muted-foreground">취소 사유</span><span className="text-destructive">{order.cancel_reason}</span></div>
          )}
        </CardContent>
      </Card>

      <h2 className="text-lg font-bold mb-3">주문 항목</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>품목</TableHead>
            <TableHead>규격</TableHead>
            <TableHead className="text-right">수량</TableHead>
            <TableHead className="text-right">단가</TableHead>
            <TableHead className="text-right">소계</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.products?.name}</TableCell>
              <TableCell>{item.product_specs?.spec_name || "-"}</TableCell>
              <TableCell className="text-right">{item.quantity}</TableCell>
              <TableCell className="text-right">{item.unit_price.toLocaleString()}</TableCell>
              <TableCell className="text-right font-bold">{item.subtotal.toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
