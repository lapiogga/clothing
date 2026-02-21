"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { getCurrentUser } from "@/actions/auth";
import { getAvailablePoints } from "@/actions/points";
import { createOnlineOrder } from "@/actions/orders";
import { getDeliveryZones } from "@/actions/delivery-zones";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [userId, setUserId] = useState("");
  const [points, setPoints] = useState({ total: 0, used: 0, reserved: 0, available: 0 });
  const [deliveryMethod, setDeliveryMethod] = useState("parcel");
  const [deliveryZones, setDeliveryZones] = useState<any[]>([]);
  const [deliveryZoneId, setDeliveryZoneId] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    // 장바구니에서 선택된 항목만 checkout (checkoutItems 우선, 없으면 cart 전체)
    const selected = localStorage.getItem("checkoutItems");
    const cart = selected
      ? JSON.parse(selected)
      : JSON.parse(localStorage.getItem("cart") || "[]");
    setItems(cart);
    getCurrentUser().then((user) => {
      if (user) {
        setUserId(user.id);
        getAvailablePoints(user.id).then(setPoints);
      }
    });
  }, []);

  const totalAmount = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const productType = items.length > 0 ? items[0].product_type : "finished";
  const isCustom = productType === "custom";
  // 완제품: cart item의 store_id 사용 (쇼핑 시 이미 선택됨)
  const storeId = isCustom ? null : (items[0]?.store_id || null);
  const storeName = isCustom ? null : (items[0]?.store_name || null);

  useEffect(() => {
    if (!isCustom && storeId && deliveryMethod === "direct") {
      getDeliveryZones(storeId).then((r) => setDeliveryZones(r.zones || []));
    }
  }, [storeId, deliveryMethod, isCustom]);

  async function handleOrder() {
    if (!isCustom && !storeId) {
      toast.error("판매소 정보가 없습니다. 다시 쇼핑해주세요");
      return;
    }
    if (totalAmount > points.available) {
      toast.error("가용 포인트가 부족합니다");
      return;
    }

    // 완제품 배송 정보 검증
    if (!isCustom) {
      if (deliveryMethod === "parcel" && !deliveryAddress.trim()) {
        toast.error("배송지 주소를 입력해주세요");
        return;
      }
      if (deliveryMethod === "direct" && !deliveryZoneId) {
        toast.error("배송지를 선택해주세요");
        return;
      }
    }

    setPending(true);
    const result = await createOnlineOrder({
      user_id: userId,
      store_id: storeId || undefined,
      product_type: productType,
      items: items.map((i) => ({
        product_id: i.product_id,
        spec_id: i.spec_id || undefined,
        quantity: i.quantity,
        unit_price: i.unit_price,
      })),
      // 맞춤피복은 배송 정보 불필요 (체척권 발행으로 처리)
      delivery_method: isCustom ? undefined : deliveryMethod,
      delivery_zone_id: isCustom ? undefined : (deliveryZoneId || undefined),
      delivery_address: isCustom ? undefined : (deliveryAddress || undefined),
    });

    if (result.success) {
      // 구매한 항목을 장바구니에서 제거 (나머지 유지)
      const purchasedIds = new Set(items.map((i) => i.product_id + (i.spec_id || "")));
      const cart = JSON.parse(localStorage.getItem("cart") || "[]");
      const remaining = cart.filter((i: CartItem) => !purchasedIds.has(i.product_id + (i.spec_id || "")));
      localStorage.setItem("cart", JSON.stringify(remaining));
      localStorage.removeItem("checkoutItems");
      toast.success("주문이 완료되었습니다");
      router.push("/my/orders");
    } else {
      toast.error(result.error || "주문에 실패했습니다");
    }
    setPending(false);
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        장바구니가 비어있습니다
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">구매 확인</h1>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          {/* 주문 품목 */}
          <Card>
            <CardHeader><CardTitle>주문 품목</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>품목</TableHead>
                    <TableHead>규격</TableHead>
                    <TableHead className="text-right">수량</TableHead>
                    <TableHead className="text-right">소계</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell>{item.product_name}</TableCell>
                      <TableCell>{item.spec_name || "-"}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{(item.unit_price * item.quantity).toLocaleString()}원</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* 맞춤피복: 체척권 안내 */}
          {isCustom ? (
            <Card>
              <CardHeader><CardTitle>체척권 안내</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground rounded-md border p-3">
                  맞춤피복 구매 시 체척권이 발행됩니다. 발행된 체척권으로 체척업체에서 맞춤 제작을 진행하세요.
                </p>
              </CardContent>
            </Card>
          ) : (
            /* 완제품: 배송 정보 */
            <Card>
              <CardHeader><CardTitle>배송 정보</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {storeName && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">판매소: </span>
                    <span className="font-medium">{storeName}</span>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium mb-1 block">배송 방법</label>
                  <Select value={deliveryMethod} onValueChange={setDeliveryMethod}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="parcel">택배</SelectItem>
                      <SelectItem value="direct">직접배송</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {deliveryMethod === "parcel" && (
                  <Input
                    placeholder="배송지 주소"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                  />
                )}
                {deliveryMethod === "direct" && (
                  <Select value={deliveryZoneId} onValueChange={setDeliveryZoneId}>
                    <SelectTrigger><SelectValue placeholder="배송지 선택" /></SelectTrigger>
                    <SelectContent>
                      {deliveryZones.map((z) => (
                        <SelectItem key={z.id} value={z.id}>{z.name} - {z.address}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* 결제 정보 */}
        <div>
          <Card>
            <CardHeader><CardTitle>결제 정보</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">가용 포인트</span>
                <span className="font-bold">{points.available.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">주문 금액</span>
                <span className="font-bold">{totalAmount.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">결제 후 잔여</span>
                <span className={`font-bold ${totalAmount > points.available ? "text-destructive" : "text-primary"}`}>
                  {(points.available - totalAmount).toLocaleString()}원
                </span>
              </div>
              <Button
                onClick={handleOrder}
                disabled={pending || totalAmount > points.available}
                className="w-full"
              >
                {pending ? "주문 중..." : "주문하기"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
