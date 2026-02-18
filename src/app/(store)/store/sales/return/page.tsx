"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrderById, processReturn } from "@/actions/orders";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

export default function ReturnPage() {
  const [orderId, setOrderId] = useState("");
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState(false);

  async function handleSearch() {
    if (!orderId) return;
    const result = await getOrderById(orderId);
    if (!result.order) {
      toast.error("주문을 찾을 수 없습니다");
      return;
    }
    if (result.order.order_type !== "offline") {
      toast.error("오프라인 주문만 반품 가능합니다");
      return;
    }
    setOrder(result.order);
    setItems(result.items);
    setSelectedItems({});
  }

  async function handleReturn() {
    const returnItems = items
      .filter((item) => selectedItems[item.id])
      .map((item) => ({ order_item_id: item.id, quantity: item.quantity }));

    if (returnItems.length === 0) {
      toast.error("반품할 항목을 선택해주세요");
      return;
    }

    if (!confirm("선택한 항목을 반품 처리하시겠습니까?")) return;

    setPending(true);
    const result = await processReturn(order.id, returnItems);
    if (result.success) {
      toast.success("반품이 처리되었습니다");
      setOrder(null);
      setItems([]);
    } else {
      toast.error(result.error || "반품 처리에 실패했습니다");
    }
    setPending(false);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">반품 처리</h1>

      <Card className="mb-6">
        <CardHeader><CardTitle>주문 조회</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="주문 ID 입력"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
            />
            <Button variant="outline" onClick={handleSearch}>조회</Button>
          </div>
        </CardContent>
      </Card>

      {order && (
        <>
          <div className="mb-4 text-sm space-y-1">
            <div>주문번호: <span className="font-mono">{order.order_number}</span></div>
            <div>주문일: {new Date(order.created_at).toLocaleDateString("ko-KR")}</div>
            <div>총액: {order.total_amount.toLocaleString()}원</div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
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
                  <TableCell>
                    <Checkbox
                      checked={selectedItems[item.id] || false}
                      onCheckedChange={(checked) =>
                        setSelectedItems({ ...selectedItems, [item.id]: !!checked })
                      }
                    />
                  </TableCell>
                  <TableCell>{item.products?.name}</TableCell>
                  <TableCell>{item.product_specs?.spec_name || "-"}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{item.unit_price.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{item.subtotal.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex justify-end mt-4">
            <Button onClick={handleReturn} disabled={pending} variant="destructive">
              {pending ? "처리 중..." : "반품 처리"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
