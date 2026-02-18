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
import { getCurrentUser } from "@/actions/auth";
import { getProducts, getSpecs } from "@/actions/products";
import { processIncoming } from "@/actions/inventory";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function IncomingPage() {
  const router = useRouter();
  const [storeId, setStoreId] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [specs, setSpecs] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedSpec, setSelectedSpec] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [items, setItems] = useState<{ product_id: string; product_name: string; spec_id: string; spec_name: string; quantity: number }[]>([]);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user?.store_id) setStoreId(user.store_id);
    });
    getProducts({ limit: 200, product_type: "finished" }).then((r) => setProducts(r.products));
  }, []);

  async function handleProductSelect(productId: string) {
    setSelectedProduct(productId);
    setSelectedSpec("");
    const specList = await getSpecs(productId);
    setSpecs(specList);
  }

  function addItem() {
    const product = products.find((p) => p.id === selectedProduct);
    const spec = specs.find((s) => s.id === selectedSpec);
    if (!product || !spec || quantity <= 0) return;
    setItems([...items, {
      product_id: selectedProduct,
      product_name: product.name,
      spec_id: selectedSpec,
      spec_name: spec.spec_name,
      quantity,
    }]);
    setSelectedProduct("");
    setSelectedSpec("");
    setQuantity(0);
  }

  async function handleSubmit() {
    if (items.length === 0) { toast.error("입고 항목을 추가해주세요"); return; }
    setPending(true);
    const result = await processIncoming({
      store_id: storeId,
      items: items.map((i) => ({ product_id: i.product_id, spec_id: i.spec_id, quantity: i.quantity })),
    });
    if (result.success) {
      toast.success("입고가 처리되었습니다");
      router.push("/store/inventory");
    } else {
      toast.error(result.error || "입고 처리에 실패했습니다");
    }
    setPending(false);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">입고 처리</h1>

      <div className="flex gap-3 mb-6 items-end">
        <div className="space-y-1">
          <label className="text-sm font-medium">품목</label>
          <Select value={selectedProduct} onValueChange={handleProductSelect}>
            <SelectTrigger className="w-48"><SelectValue placeholder="품목 선택" /></SelectTrigger>
            <SelectContent>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">규격</label>
          <Select value={selectedSpec} onValueChange={setSelectedSpec}>
            <SelectTrigger className="w-48"><SelectValue placeholder="규격 선택" /></SelectTrigger>
            <SelectContent>
              {specs.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.spec_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">수량</label>
          <Input type="number" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 0)} className="w-24" />
        </div>
        <Button variant="outline" onClick={addItem} disabled={!selectedProduct || !selectedSpec || quantity <= 0}>추가</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>품목</TableHead>
            <TableHead>규격</TableHead>
            <TableHead className="text-right">수량</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">항목을 추가해주세요</TableCell>
            </TableRow>
          ) : items.map((item, i) => (
            <TableRow key={i}>
              <TableCell>{item.product_name}</TableCell>
              <TableCell>{item.spec_name}</TableCell>
              <TableCell className="text-right">{item.quantity}</TableCell>
              <TableCell>
                <Button variant="ghost" size="sm" onClick={() => setItems(items.filter((_, idx) => idx !== i))}>삭제</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex justify-end mt-4">
        <Button onClick={handleSubmit} disabled={pending || items.length === 0}>
          {pending ? "처리 중..." : "입고 확정"}
        </Button>
      </div>
    </div>
  );
}
