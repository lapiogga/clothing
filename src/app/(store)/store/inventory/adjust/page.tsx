"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination } from "@/components/shared/pagination";
import { getCurrentUser } from "@/actions/auth";
import { getInventory, adjustInventory, getInventoryLog } from "@/actions/inventory";
import { toast } from "sonner";

const LOG_TYPE_LABELS: Record<string, string> = {
  incoming: "입고", sale: "판매", return: "반품", adjust_up: "조정(증)", adjust_down: "조정(감)",
};

export default function InventoryAdjustPage() {
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
  const [logProductName, setLogProductName] = useState("");

  const fetchData = useCallback(async () => {
    if (!storeId) return;
    const result = await getInventory({ page, store_id: storeId, search: search || undefined });
    const sorted = (result.inventory || []).sort((a: any, b: any) => {
      const nameA = a.products?.name || "";
      const nameB = b.products?.name || "";
      if (nameA !== nameB) return nameA.localeCompare(nameB, "ko");
      const specA = a.product_specs?.spec_name || "";
      const specB = b.product_specs?.spec_name || "";
      return specA.localeCompare(specB, "ko");
    });
    setInventory(sorted);
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
    if (!adjustReason.trim()) { toast.error("조정 사유를 입력해주세요"); return; }
    const result = await adjustInventory({
      inventory_id: adjustTarget.id,
      adjust_type: adjustType,
      quantity: adjustQty,
      reason: adjustReason,
    });
    if (result.success) {
      toast.success("재고가 조정되었습니다");
      setAdjustOpen(false);
      setAdjustQty(0);
      setAdjustReason("");
      fetchData();
    } else {
      toast.error(result.error || "조정에 실패했습니다");
    }
  }

  async function openLog(inv: any) {
    setLogProductName(`${inv.products?.name} - ${inv.product_specs?.spec_name || "규격없음"}`);
    const result = await getInventoryLog({ inventory_id: inv.id });
    setLogs(result.logs);
    setLogOpen(true);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">재고 조정</h1>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>품목별 재고 조정</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            조정할 품목을 선택하고 [조정] 버튼을 클릭하여 재고를 수동 증감합니다. [이력] 버튼으로 변동 내역을 확인할 수 있습니다.
          </p>
          <Input
            placeholder="품목명 검색"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-60 mb-4"
          />

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>품목</TableHead>
                <TableHead>규격</TableHead>
                <TableHead className="text-right">현재 수량</TableHead>
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setAdjustTarget(inv);
                          setAdjustType("adjust_up");
                          setAdjustQty(0);
                          setAdjustReason("");
                          setAdjustOpen(true);
                        }}
                      >
                        조정
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openLog(inv)}>이력</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination page={page} total={total} limit={20} onChange={setPage} />
        </CardContent>
      </Card>

      {/* 재고 조정 다이얼로그 */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>재고 조정</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded text-sm">
              <div className="font-medium">{adjustTarget?.products?.name}</div>
              <div className="text-muted-foreground">
                규격: {adjustTarget?.product_specs?.spec_name || "-"} / 현재 수량: <strong>{adjustTarget?.quantity}</strong>
              </div>
            </div>
            <div className="space-y-2">
              <Label>조정 유형</Label>
              <Select value={adjustType} onValueChange={(v) => setAdjustType(v as "adjust_up" | "adjust_down")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="adjust_up">증가 (현재량 + 수량)</SelectItem>
                  <SelectItem value="adjust_down">감소 (현재량 - 수량)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>조정 수량 *</Label>
              <Input
                type="number"
                min="1"
                placeholder="수량 입력"
                value={adjustQty || ""}
                onChange={(e) => setAdjustQty(parseInt(e.target.value) || 0)}
              />
              {adjustType === "adjust_down" && adjustTarget && (
                <p className="text-xs text-muted-foreground">
                  조정 후 수량: {adjustTarget.quantity - adjustQty}
                  {adjustTarget.quantity - adjustQty < 0 && (
                    <span className="text-destructive ml-2">수량이 음수가 됩니다</span>
                  )}
                </p>
              )}
              {adjustType === "adjust_up" && adjustTarget && (
                <p className="text-xs text-muted-foreground">
                  조정 후 수량: {adjustTarget.quantity + adjustQty}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>조정 사유 *</Label>
              <Input
                placeholder="조정 사유 입력 (예: 재고실사, 파손 등)"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
              />
            </div>
            <Button onClick={handleAdjust} className="w-full">조정 확정</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 변동 이력 다이얼로그 */}
      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>재고 변동 이력 - {logProductName}</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>일시</TableHead>
                <TableHead>유형</TableHead>
                <TableHead className="text-right">수량</TableHead>
                <TableHead>사유</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">이력이 없습니다</TableCell>
                </TableRow>
              ) : logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{new Date(log.created_at).toLocaleString("ko-KR")}</TableCell>
                  <TableCell>
                    <Badge variant={
                      log.log_type === "adjust_up" ? "default" :
                      log.log_type === "adjust_down" ? "destructive" : "secondary"
                    }>
                      {LOG_TYPE_LABELS[log.log_type] || log.log_type}
                    </Badge>
                  </TableCell>
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
