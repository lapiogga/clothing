"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import Link from "next/link";

interface CartItem {
  product_id: string;
  product_name: string;
  product_type: string;
  spec_id: string | null;
  spec_name: string | null;
  quantity: number;
  unit_price: number;
  store_id?: string | null;
  store_name?: string | null;
}

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [checkedSet, setCheckedSet] = useState<Set<number>>(new Set());

  useEffect(() => {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    setItems(cart);
    // 초기 전체 선택
    setCheckedSet(new Set(cart.map((_: any, i: number) => i)));
  }, []);

  function save(updated: CartItem[]) {
    setItems(updated);
    localStorage.setItem("cart", JSON.stringify(updated));
  }

  function removeItem(index: number) {
    const updated = items.filter((_, i) => i !== index);
    save(updated);
    // 체크셋 인덱스 재조정
    setCheckedSet((prev) => {
      const next = new Set<number>();
      prev.forEach((idx) => {
        if (idx < index) next.add(idx);
        else if (idx > index) next.add(idx - 1);
      });
      return next;
    });
  }

  function changeQuantity(index: number, delta: number) {
    const updated = items.map((item, i) => {
      if (i !== index) return item;
      const newQty = Math.max(1, item.quantity + delta);
      return { ...item, quantity: newQty };
    });
    save(updated);
  }

  function toggleCheck(index: number) {
    setCheckedSet((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function toggleAll(indices: number[], checked: boolean) {
    setCheckedSet((prev) => {
      const next = new Set(prev);
      indices.forEach((i) => checked ? next.add(i) : next.delete(i));
      return next;
    });
  }

  // 완제품/맞춤피복 분리
  const finishedItems = items.map((item, i) => ({ item, i })).filter(({ item }) => item.product_type === "finished");
  const customItems = items.map((item, i) => ({ item, i })).filter(({ item }) => item.product_type === "custom");

  const checkedFinished = finishedItems.filter(({ i }) => checkedSet.has(i));
  const checkedCustom = customItems.filter(({ i }) => checkedSet.has(i));

  const finishedTotal = checkedFinished.reduce((s, { item }) => s + item.unit_price * item.quantity, 0);
  const customTotal = checkedCustom.reduce((s, { item }) => s + item.unit_price * item.quantity, 0);

  function gotoCheckout(type: "finished" | "custom") {
    const selected = type === "finished" ? checkedFinished : checkedCustom;
    if (selected.length === 0) return;
    // 선택된 항목만 checkoutItems에 저장
    localStorage.setItem("checkoutItems", JSON.stringify(selected.map(({ item }) => item)));
    router.push("/my/checkout");
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground mb-4">장바구니가 비어있습니다</div>
        <Link href="/my/shop"><Button variant="outline">쇼핑하러 가기</Button></Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">장바구니</h1>
        <Button variant="outline" size="sm" onClick={() => { save([]); setCheckedSet(new Set()); }}>
          전체 삭제
        </Button>
      </div>

      {/* 완제품 섹션 */}
      {finishedItems.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Badge variant="secondary">완제품</Badge>
            <Checkbox
              checked={finishedItems.every(({ i }) => checkedSet.has(i))}
              onCheckedChange={(v) => toggleAll(finishedItems.map(({ i }) => i), !!v)}
            />
            <span className="text-sm text-muted-foreground">전체 선택</span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>품목</TableHead>
                <TableHead>규격</TableHead>
                <TableHead>판매소</TableHead>
                <TableHead className="text-right w-32">수량</TableHead>
                <TableHead className="text-right">단가</TableHead>
                <TableHead className="text-right">소계</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {finishedItems.map(({ item, i }) => (
                <TableRow key={i} className={checkedSet.has(i) ? "" : "opacity-50"}>
                  <TableCell>
                    <Checkbox checked={checkedSet.has(i)} onCheckedChange={() => toggleCheck(i)} />
                  </TableCell>
                  <TableCell className="font-medium">{item.product_name}</TableCell>
                  <TableCell>{item.spec_name || "-"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{item.store_name || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={() => changeQuantity(i, -1)}>-</Button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={() => changeQuantity(i, 1)}>+</Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{item.unit_price.toLocaleString()}원</TableCell>
                  <TableCell className="text-right font-bold">{(item.unit_price * item.quantity).toLocaleString()}원</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-7 text-muted-foreground hover:text-destructive" onClick={() => removeItem(i)}>✕</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-end items-center gap-4 mt-3">
            <span className="text-sm text-muted-foreground">
              선택 {checkedFinished.length}개 합계:
              <span className="ml-1 font-bold text-foreground">{finishedTotal.toLocaleString()}원</span>
            </span>
            <Button
              onClick={() => gotoCheckout("finished")}
              disabled={checkedFinished.length === 0}
            >
              완제품 구매하기 ({checkedFinished.length})
            </Button>
          </div>
        </div>
      )}

      {finishedItems.length > 0 && customItems.length > 0 && <Separator className="mb-8" />}

      {/* 맞춤피복 섹션 */}
      {customItems.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Badge variant="outline">맞춤피복</Badge>
            <Checkbox
              checked={customItems.every(({ i }) => checkedSet.has(i))}
              onCheckedChange={(v) => toggleAll(customItems.map(({ i }) => i), !!v)}
            />
            <span className="text-sm text-muted-foreground">전체 선택</span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>품목</TableHead>
                <TableHead>분류</TableHead>
                <TableHead className="text-right">수량</TableHead>
                <TableHead className="text-right">단가</TableHead>
                <TableHead className="text-right">소계</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customItems.map(({ item, i }) => (
                <TableRow key={i} className={checkedSet.has(i) ? "" : "opacity-50"}>
                  <TableCell>
                    <Checkbox checked={checkedSet.has(i)} onCheckedChange={() => toggleCheck(i)} />
                  </TableCell>
                  <TableCell className="font-medium">{item.product_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">체척권 발행</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">1 (고정)</TableCell>
                  <TableCell className="text-right">{item.unit_price.toLocaleString()}원</TableCell>
                  <TableCell className="text-right font-bold">{item.unit_price.toLocaleString()}원</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-7 text-muted-foreground hover:text-destructive" onClick={() => removeItem(i)}>✕</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-end items-center gap-4 mt-3">
            <span className="text-sm text-muted-foreground">
              선택 {checkedCustom.length}개 합계:
              <span className="ml-1 font-bold text-foreground">{customTotal.toLocaleString()}원</span>
            </span>
            <Button
              variant="outline"
              onClick={() => gotoCheckout("custom")}
              disabled={checkedCustom.length === 0}
            >
              맞춤피복 구매하기 ({checkedCustom.length})
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
