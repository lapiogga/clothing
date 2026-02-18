"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Pagination } from "@/components/shared/pagination";
import { getCurrentUser } from "@/actions/auth";
import { getInventory, adjustInventory, getInventoryLog } from "@/actions/inventory";
import { toast } from "sonner";
import Link from "next/link";

const LOG_TYPE_LABELS: Record<string, string> = {
  incoming: "입고", sale: "판매", return: "반품", adjust_up: "조정(증)", adjust_down: "조정(감)",
};

export default function InventoryPage() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [storeId, setStoreId] = useState("");

  // 조정 다이얼로그
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<any>(null);
  const [adjustType, setAdjustType] = useState<"adjust_up" | "adjust_down">("adjust_up");
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustReason, setAdjustReason] = useState("");

  // 이력 다이얼로그
  const [logOpen, setLogOpen] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    if (!storeId) return;
    const result = await getInventory({ page, store_id: storeId, search: search || undefined });
    setInventory(result.inventory);
    setTotal(result.total);
  }, [page, search, storeId]);

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user?.store_id) setStoreId(user.store_id);
    });
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleAdjust() {
    if (adjustQty <= 0) { toast.error("수량을 입력해주세요"); return; }
    const result = await adjustInventory({
      inventory_id: adjustTarget.id,
      adjust_type: adjustType,
      quantity: adjustQty,
      reason: adjustReason,
    });
    if (result.success) {
      toast.success("재고가 조정되었습니다");
      setAdjustOpen(false);
      fetchData();
    } else {
      toast.error(result.error || "조정에 실패했습니다");
    }
  }

  async function openLog(inventoryId: string) {
    const result = await getInventoryLog({ inventory_id: inventoryId });
    setLogs(result.logs);
    setLogOpen(true);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">재고 현황</h1>
        <Link href="/store/inventory/incoming">
          <Button>입고 처리</Button>
        </Link>
      </div>

      <div className="flex gap-3 mb-4">
        <Input
          placeholder="품목명 검색"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-60"
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>품목</TableHead>
            <TableHead>규격</TableHead>
            <TableHead className="text-right">수량</TableHead>
            <TableHead>최종 수정</TableHead>
            <TableHead>관리</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {inventory.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">데이터가 없습니다</TableCell>
            </TableRow>
          ) : inventory.map((inv) => (
            <TableRow key={inv.id}>
              <TableCell>{inv.products?.name}</TableCell>
              <TableCell>{inv.product_specs?.spec_name || "-"}</TableCell>
              <TableCell className="text-right font-bold">{inv.quantity}</TableCell>
              <TableCell>{new Date(inv.updated_at).toLocaleDateString("ko-KR")}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => { setAdjustTarget(inv); setAdjustType("adjust_up"); setAdjustQty(0); setAdjustReason(""); setAdjustOpen(true); }}>조정</Button>
                  <Button size="sm" variant="ghost" onClick={() => openLog(inv.id)}>이력</Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination page={page} total={total} limit={20} onChange={setPage} />

      {/* 재고 조정 */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>재고 조정</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="text-sm">{adjustTarget?.products?.name} - {adjustTarget?.product_specs?.spec_name} (현재: {adjustTarget?.quantity})</div>
            <Select value={adjustType} onValueChange={(v) => setAdjustType(v as "adjust_up" | "adjust_down")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="adjust_up">증가</SelectItem>
                <SelectItem value="adjust_down">감소</SelectItem>
              </SelectContent>
            </Select>
            <Input type="number" placeholder="수량" value={adjustQty} onChange={(e) => setAdjustQty(parseInt(e.target.value) || 0)} />
            <Input placeholder="사유" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} />
            <Button onClick={handleAdjust} className="w-full">조정 확정</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 변동 이력 */}
      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>재고 변동 이력</DialogTitle></DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>일시</TableHead>
                <TableHead>유형</TableHead>
                <TableHead className="text-right">수량</TableHead>
                <TableHead>비고</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{new Date(log.created_at).toLocaleString("ko-KR")}</TableCell>
                  <TableCell>{LOG_TYPE_LABELS[log.log_type] || log.log_type}</TableCell>
                  <TableCell className="text-right">{log.quantity}</TableCell>
                  <TableCell>{log.description || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}
