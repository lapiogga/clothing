"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/shared/pagination";
import { getCurrentUser } from "@/actions/auth";
import { getOrders } from "@/actions/orders";
import Link from "next/link";

const STATUS_LABELS: Record<string, string> = {
  pending: "대기", confirmed: "확인", shipping: "배송중", delivered: "완료", cancelled: "취소", returned: "반품",
};
const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline", confirmed: "secondary", shipping: "secondary", delivered: "default", cancelled: "destructive", returned: "destructive",
};

export default function SalesListPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [storeId, setStoreId] = useState("");

  const fetchData = useCallback(async () => {
    if (!storeId) return;
    const result = await getOrders({
      page, store_id: storeId, order_type: "offline", status: status || undefined,
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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">판매 내역</h1>
        <div className="flex gap-2">
          <Link href="/store/sales/return">
            <Button variant="outline">반품 처리</Button>
          </Link>
          <Link href="/store/sales/new">
            <Button>새 판매</Button>
          </Link>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <Select value={status} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="상태 전체" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="delivered">완료</SelectItem>
            <SelectItem value="returned">반품</SelectItem>
            <SelectItem value="cancelled">취소</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>주문번호</TableHead>
            <TableHead>구매자</TableHead>
            <TableHead>유형</TableHead>
            <TableHead>상태</TableHead>
            <TableHead className="text-right">금액</TableHead>
            <TableHead>일시</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">데이터가 없습니다</TableCell>
            </TableRow>
          ) : orders.map((o) => (
            <TableRow key={o.id}>
              <TableCell className="font-mono text-sm">{o.order_number}</TableCell>
              <TableCell>{o.users?.name}</TableCell>
              <TableCell>{o.product_type === "finished" ? "완제품" : "맞춤"}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANTS[o.status] || "default"}>
                  {STATUS_LABELS[o.status] || o.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">{o.total_amount.toLocaleString()}원</TableCell>
              <TableCell>{new Date(o.created_at).toLocaleDateString("ko-KR")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination page={page} total={total} limit={20} onChange={setPage} />
    </div>
  );
}
