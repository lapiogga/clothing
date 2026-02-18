"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/actions/auth";
import { getProducts } from "@/actions/products";
import { getStoreInventoryForProduct } from "@/actions/inventory";
import { getAvailablePoints } from "@/actions/points";
import { createOfflineSale } from "@/actions/orders";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function NewSalePage() {
  const router = useRouter();
  const [storeId, setStoreId] = useState("");
  const [productType, setProductType] = useState("finished");
  const [userId, setUserId] = useState("");
  const [userPoints, setUserPoints] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [items, setItems] = useState<{ product_id: string; product_name: string; spec_id?: string; spec_name?: string; quantity: number; unit_price: number }[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [specs, setSpecs] = useState<any[]>([]);
  const [selectedSpec, setSelectedSpec] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user?.store_id) setStoreId(user.store_id);
    });
    getProducts({ limit: 200 }).then((r) => setProducts(r.products));
  }, []);

  // 사용자 군번 입력 후 포인트 조회
  async function handleUserLookup() {
    if (!userId) return;
    const pts = await getAvailablePoints(userId);
    setUserPoints(pts);
  }

  // 품목 선택 시 규격 목록 조회
  async function handleProductSelect(productId: string) {
    setSelectedProduct(productId);
    setSelectedSpec("");
    if (productType === "finished" && storeId) {
      const inv = await getStoreInventoryForProduct(storeId, productId);
      setSpecs(inv);
    }
  }

  function addItem() {
    const product = products.find((p) => p.id === selectedProduct);
    if (!product) return;
    const spec = specs.find((s: any) => s.id === selectedSpec || s.spec_id === selectedSpec);
    setItems([...items, {
      product_id: selectedProduct,
      product_name: product.name,
      spec_id: productType === "finished" ? selectedSpec : undefined,
      spec_name: spec?.product_specs?.spec_name || "",
      quantity,
      unit_price: unitPrice,
    }]);
    setSelectedProduct("");
    setSelectedSpec("");
    setQuantity(1);
    setUnitPrice(0);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  const totalAmount = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

  async function handleSubmit() {
    if (!userId || items.length === 0) {
      toast.error("사용자와 품목을 입력해주세요");
      return;
    }
    setPending(true);
    const result = await createOfflineSale({
      user_id: userId,
      store_id: storeId,
      product_type: productType,
      items: items.map((i) => ({
        product_id: i.product_id,
        spec_id: i.spec_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
      })),
    });
    if (result.success) {
      toast.success("판매가 완료되었습니다");
      router.push("/store/sales");
    } else {
      toast.error(result.error || "판매에 실패했습니다");
    }
    setPending(false);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">오프라인 판매</h1>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader><CardTitle>구매자 정보</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="사용자 ID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
              <Button variant="outline" onClick={handleUserLookup}>조회</Button>
            </div>
            {userPoints && (
              <div className="text-sm space-y-1">
                <div>가용 포인트: <span className="font-bold text-primary">{userPoints.available.toLocaleString()}원</span></div>
                <div className="text-muted-foreground">총 {userPoints.total.toLocaleString()} / 사용 {userPoints.used.toLocaleString()} / 예약 {userPoints.reserved.toLocaleString()}</div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>품목 추가</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select value={productType} onValueChange={setProductType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="finished">완제품</SelectItem>
                <SelectItem value="custom">맞춤피복</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedProduct} onValueChange={handleProductSelect}>
              <SelectTrigger><SelectValue placeholder="품목 선택" /></SelectTrigger>
              <SelectContent>
                {products.filter((p) => p.product_type === productType).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {productType === "finished" && (
              <Select value={selectedSpec} onValueChange={setSelectedSpec}>
                <SelectTrigger><SelectValue placeholder="규격 선택" /></SelectTrigger>
                <SelectContent>
                  {specs.map((s: any) => (
                    <SelectItem key={s.spec_id || s.id} value={s.spec_id || s.id}>
                      {s.product_specs?.spec_name || s.spec_name} (재고: {s.quantity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="flex gap-2">
              <Input type="number" placeholder="수량" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} className="w-24" />
              <Input type="number" placeholder="단가" value={unitPrice} onChange={(e) => setUnitPrice(parseInt(e.target.value) || 0)} />
              <Button variant="outline" onClick={addItem} disabled={!selectedProduct || (productType === "finished" && !selectedSpec)}>추가</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>품목</TableHead>
            <TableHead>규격</TableHead>
            <TableHead className="text-right">수량</TableHead>
            <TableHead className="text-right">단가</TableHead>
            <TableHead className="text-right">소계</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">품목을 추가해주세요</TableCell>
            </TableRow>
          ) : items.map((item, i) => (
            <TableRow key={i}>
              <TableCell>{item.product_name}</TableCell>
              <TableCell>{item.spec_name || "-"}</TableCell>
              <TableCell className="text-right">{item.quantity}</TableCell>
              <TableCell className="text-right">{item.unit_price.toLocaleString()}</TableCell>
              <TableCell className="text-right">{(item.unit_price * item.quantity).toLocaleString()}</TableCell>
              <TableCell>
                <Button variant="ghost" size="sm" onClick={() => removeItem(i)}>삭제</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex justify-between items-center mt-4">
        <div className="text-lg font-bold">합계: {totalAmount.toLocaleString()}원</div>
        <Button onClick={handleSubmit} disabled={pending || items.length === 0}>
          {pending ? "처리 중..." : "판매 확정"}
        </Button>
      </div>
    </div>
  );
}
