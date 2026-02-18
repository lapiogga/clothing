"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { getProductById } from "@/actions/products";
import { getStoreInventoryForProduct } from "@/actions/inventory";
import { toast } from "sonner";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [selectedSpec, setSelectedSpec] = useState("");
  // 판매소별 재고 (완제품): [{ spec_id, spec_name, quantity }]
  const [storeInventory, setStoreInventory] = useState<any[]>([]);
  const [storeId, setStoreId] = useState("");
  const [storeName, setStoreName] = useState("");

  useEffect(() => {
    if (!params.id) return;
    getProductById(params.id as string).then((r) => setProduct(r.product));
  }, [params.id]);

  useEffect(() => {
    if (!product) return;
    if (product.product_type === "finished") {
      // 쇼핑 메인에서 선택한 판매소 읽기
      const savedId = localStorage.getItem("selectedStoreId") || "";
      const savedName = localStorage.getItem("selectedStoreName") || "";
      setStoreId(savedId);
      setStoreName(savedName);
      if (savedId) {
        getStoreInventoryForProduct(savedId, product.id).then(setStoreInventory);
      }
    }
  }, [product]);

  function addToCart() {
    if (!product) return;

    if (product.product_type === "finished") {
      if (!storeId) {
        toast.error("판매소를 먼저 선택해주세요");
        router.push("/my/shop");
        return;
      }
      if (!selectedSpec) {
        toast.error("규격을 선택해주세요");
        return;
      }
      const inv = storeInventory.find((i) => i.spec_id === selectedSpec);
      if (!inv || inv.quantity < 1) {
        toast.error("재고가 없습니다");
        return;
      }
    }

    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const inv = storeInventory.find((i) => i.spec_id === selectedSpec);

    cart.push({
      product_id: product.id,
      product_name: product.name,
      product_type: product.product_type,
      spec_id: selectedSpec || null,
      spec_name: inv?.product_specs?.spec_name || null,
      quantity: 1,
      unit_price: product.price,
      // 완제품은 판매소 정보 포함
      store_id: product.product_type === "finished" ? storeId : null,
      store_name: product.product_type === "finished" ? storeName : null,
    });
    localStorage.setItem("cart", JSON.stringify(cart));
    toast.success("장바구니에 추가되었습니다");
  }

  if (!product) return <div className="text-muted-foreground">로딩 중...</div>;

  const isFinished = product.product_type === "finished";

  return (
    <div>
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">&larr; 목록으로</Button>

      <div className="grid grid-cols-2 gap-8">
        <div className="aspect-square bg-muted rounded flex items-center justify-center text-muted-foreground">
          {product.image_url
            ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover rounded" />
            : "이미지 없음"}
        </div>

        <div>
          <Badge variant={isFinished ? "secondary" : "outline"} className="mb-2">
            {isFinished ? "완제품" : "맞춤피복"}
          </Badge>
          <h1 className="text-2xl font-bold mb-2">{product.name}</h1>
          <div className="text-sm text-muted-foreground mb-4">{product.categories?.name}</div>
          <div className="text-3xl font-bold text-primary mb-6">{product.price.toLocaleString()}원</div>

          {product.description && (
            <p className="text-sm text-muted-foreground mb-6">{product.description}</p>
          )}

          {isFinished ? (
            <>
              {/* 판매소 표시 */}
              {storeName && (
                <div className="mb-4 text-sm">
                  <span className="text-muted-foreground">판매소: </span>
                  <span className="font-medium">{storeName}</span>
                </div>
              )}
              {!storeId && (
                <p className="text-sm text-destructive mb-4">
                  판매소가 선택되지 않았습니다. 목록으로 돌아가 판매소를 먼저 선택해주세요.
                </p>
              )}

              {/* 재고 있는 규격만 표시 */}
              {storeInventory.length > 0 ? (
                <div className="mb-4">
                  <label className="text-sm font-medium mb-1 block">규격 *</label>
                  <Select value={selectedSpec} onValueChange={setSelectedSpec}>
                    <SelectTrigger className="w-56"><SelectValue placeholder="규격 선택" /></SelectTrigger>
                    <SelectContent>
                      {storeInventory.map((inv) => (
                        <SelectItem key={inv.spec_id} value={inv.spec_id}>
                          {inv.product_specs?.spec_name} (재고 {inv.quantity}개)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                storeId && (
                  <p className="text-sm text-muted-foreground mb-4">해당 판매소에 재고가 없습니다.</p>
                )
              )}

              <div className="mb-6 text-sm text-muted-foreground">수량: 1개</div>
            </>
          ) : (
            /* 맞춤피복: 체척권 안내 */
            <div className="mb-6 rounded-md border p-4 text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">체척권 발행 안내</p>
              <p>맞춤피복 구매 시 체척권이 자동으로 발행됩니다.</p>
              <p>발행된 체척권으로 지정 체척업체에서 맞춤 제작을 진행하세요.</p>
              <p className="mt-2">수량: 1개 (고정)</p>
            </div>
          )}

          <Button
            onClick={addToCart}
            className="w-full"
            disabled={isFinished && (!storeId || storeInventory.length === 0)}
          >
            장바구니 담기
          </Button>
        </div>
      </div>
    </div>
  );
}
