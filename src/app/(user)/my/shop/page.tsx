"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Pagination } from "@/components/shared/pagination";
import { getProducts, getAllCategories } from "@/actions/products";
import { getProductIdsWithStock } from "@/actions/inventory";
import { getStores } from "@/actions/stores";
import { getCurrentUser } from "@/actions/auth";
import { getAvailablePoints } from "@/actions/points";
import Link from "next/link";

const ALL = "__all__";

export default function ShopPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [productType, setProductType] = useState("finished"); // 기본값: 완제품
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [storeId, setStoreId] = useState("");
  const [stockProductIds, setStockProductIds] = useState<string[] | null>(null);
  const [points, setPoints] = useState({ total: 0, used: 0, reserved: 0, available: 0 });

  useEffect(() => {
    getAllCategories().then(setCategories);
    getStores().then((r) => setStores(r.stores || []));
    getCurrentUser().then((user) => {
      if (user) getAvailablePoints(user.id).then(setPoints);
    });
    // 이전에 선택한 판매소 복원
    const saved = localStorage.getItem("selectedStoreId");
    if (saved) setStoreId(saved);
  }, []);

  // 완제품 + 판매소 선택 시 재고 있는 품목 ID 로드
  useEffect(() => {
    if (productType === "finished" && storeId) {
      getProductIdsWithStock(storeId).then(setStockProductIds);
    } else {
      setStockProductIds(null);
    }
  }, [productType, storeId]);

  // 판매소 선택 시 localStorage 저장 (ID + 이름)
  function handleStoreChange(val: string) {
    const id = val === ALL ? "" : val;
    const name = stores.find((s) => s.id === id)?.name || "";
    setStoreId(id);
    if (id) {
      localStorage.setItem("selectedStoreId", id);
      localStorage.setItem("selectedStoreName", name);
    } else {
      localStorage.removeItem("selectedStoreId");
      localStorage.removeItem("selectedStoreName");
    }
    setPage(1);
    setStockProductIds(null);
  }

  // 유형 변경 시 판매소 필터 초기화 (맞춤피복은 판매소 불필요)
  function handleTypeChange(val: string) {
    const type = val === ALL ? "" : val;
    setProductType(type);
    if (type === "custom") {
      setStoreId("");
      localStorage.removeItem("selectedStoreId");
    }
    setPage(1);
  }

  useEffect(() => {
    // 완제품이면서 판매소 미선택 시 품목 로드 안 함
    if (productType === "finished" && !storeId) {
      setProducts([]);
      setTotal(0);
      return;
    }

    getProducts({
      page,
      is_active: true,
      search: search || undefined,
      product_type: productType || undefined,
      category_id: categoryId || undefined,
    }).then((r) => {
      let list = r.products;
      // 완제품: 재고 있는 품목만 필터
      if (productType === "finished" && stockProductIds !== null) {
        list = list.filter((p: any) => stockProductIds.includes(p.id));
      }
      setProducts(list);
      setTotal(r.total);
    });
  }, [page, search, productType, categoryId, stockProductIds, storeId]);

  const isFinished = productType === "finished" || productType === "";

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">피복 쇼핑</h1>
        <div className="text-sm">
          가용 포인트: <span className="text-lg font-bold text-primary">{points.available.toLocaleString()}원</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        {/* 유형 선택 */}
        <Select value={productType || ALL} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-32"><SelectValue placeholder="유형" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="finished">완제품</SelectItem>
            <SelectItem value="custom">맞춤피복</SelectItem>
          </SelectContent>
        </Select>

        {/* 완제품일 때만 판매소 선택 */}
        {isFinished && (
          <Select value={storeId || ALL} onValueChange={handleStoreChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="판매소 선택 (필수)" />
            </SelectTrigger>
            <SelectContent>
              {stores.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Input
          placeholder="품목 검색"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-60"
        />
        <Select value={categoryId || ALL} onValueChange={(v) => { setCategoryId(v === ALL ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="분류 전체" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>분류 전체</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{"─".repeat(c.level - 1)} {c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 완제품이면서 판매소 미선택 안내 */}
      {isFinished && !storeId && (
        <div className="text-center py-12 text-muted-foreground border rounded-lg">
          판매소를 먼저 선택하면 해당 판매소에 재고가 있는 품목을 확인할 수 있습니다.
        </div>
      )}

      {/* 품목 그리드 */}
      {(!isFinished || storeId) && (
        <>
          <div className="grid grid-cols-4 gap-4">
            {products.length === 0 ? (
              <div className="col-span-4 text-center text-muted-foreground py-8">
                {isFinished && storeId ? "해당 판매소에 재고가 있는 품목이 없습니다" : "품목이 없습니다"}
              </div>
            ) : products.map((p) => (
              <Link key={p.id} href={`/my/shop/${p.id}`}>
                <Card className="hover:border-primary transition-colors cursor-pointer">
                  <CardContent className="pt-4">
                    <div className="aspect-square bg-muted rounded mb-3 flex items-center justify-center text-muted-foreground text-sm">
                      {p.image_url
                        ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover rounded" />
                        : "이미지 없음"}
                    </div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-muted-foreground">{p.categories?.name}</div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-lg font-bold">{p.price.toLocaleString()}원</span>
                      <Badge variant={p.product_type === "finished" ? "secondary" : "outline"}>
                        {p.product_type === "finished" ? "완제품" : "맞춤"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          <Pagination page={page} total={total} limit={20} onChange={setPage} />
        </>
      )}
    </div>
  );
}
