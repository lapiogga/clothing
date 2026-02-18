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
import { Separator } from "@/components/ui/separator";
import { Pagination } from "@/components/shared/pagination";
import {
  getAllCategories, createCategory, deleteCategory,
  getProducts, createProduct, updateProduct,
  getSpecs, createSpec, deleteSpec,
} from "@/actions/products";
import { toast } from "sonner";

export default function ProductsPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string>("");
  const [products, setProducts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  // 다이얼로그 상태
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [catParentId, setCatParentId] = useState<string>("");
  const [catLevel, setCatLevel] = useState(1);
  const [prodDialogOpen, setProdDialogOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [specDialogOpen, setSpecDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [specs, setSpecs] = useState<any[]>([]);

  const [pending, setPending] = useState(false);

  // 카테고리 로드
  const loadCategories = useCallback(async () => {
    const data = await getAllCategories();
    setCategories(data);
  }, []);

  // 품목 로드
  const loadProducts = useCallback(async () => {
    const result = await getProducts({
      page,
      category_id: selectedCatId || undefined,
      search: search || undefined,
    });
    setProducts(result.products);
    setTotal(result.total);
  }, [page, selectedCatId, search]);

  useEffect(() => { loadCategories(); }, [loadCategories]);
  useEffect(() => { loadProducts(); }, [loadProducts]);

  // 카테고리 트리 구성
  const level1 = categories.filter((c) => c.level === 1);
  const getChildren = (parentId: string) => categories.filter((c) => c.parent_id === parentId);

  // 카테고리 등록
  async function handleCreateCategory(formData: FormData) {
    setPending(true);
    const result = await createCategory(formData);
    if (result.success) {
      toast.success("분류가 등록되었습니다");
      setCatDialogOpen(false);
      loadCategories();
    } else {
      toast.error(result.error || "등록에 실패했습니다");
    }
    setPending(false);
  }

  // 카테고리 삭제
  async function handleDeleteCategory(id: string) {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    const result = await deleteCategory(id);
    if (result.success) {
      toast.success("삭제되었습니다");
      if (selectedCatId === id) setSelectedCatId("");
      loadCategories();
    } else {
      toast.error(result.error || "삭제에 실패했습니다");
    }
  }

  // 품목 등록/수정
  async function handleProductSubmit(formData: FormData) {
    setPending(true);
    const result = editProduct
      ? await updateProduct(editProduct.id, formData)
      : await createProduct(formData);
    if (result.success) {
      toast.success(editProduct ? "수정되었습니다" : "등록되었습니다");
      setProdDialogOpen(false);
      setEditProduct(null);
      loadProducts();
    } else {
      toast.error(result.error || "처리에 실패했습니다");
    }
    setPending(false);
  }

  // 규격 관리
  async function openSpecDialog(product: any) {
    setSelectedProduct(product);
    const data = await getSpecs(product.id);
    setSpecs(data);
    setSpecDialogOpen(true);
  }

  async function handleCreateSpec(formData: FormData) {
    setPending(true);
    const result = await createSpec(formData);
    if (result.success) {
      toast.success("규격이 등록되었습니다");
      const data = await getSpecs(selectedProduct.id);
      setSpecs(data);
    } else {
      toast.error(result.error || "등록에 실패했습니다");
    }
    setPending(false);
  }

  async function handleDeleteSpec(id: string) {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    const result = await deleteSpec(id);
    if (result.success) {
      toast.success("삭제되었습니다");
      const data = await getSpecs(selectedProduct.id);
      setSpecs(data);
    } else {
      toast.error(result.error || "삭제에 실패했습니다");
    }
  }

  // 소분류만 필터 (품목 등록 시 사용)
  const level3Categories = categories.filter((c) => c.level === 3);

  return (
    <div className="flex gap-6">
      {/* 좌측: 카테고리 트리 */}
      <div className="w-64 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold">품목 분류</h2>
          <Button size="sm" variant="outline" onClick={() => {
            setCatParentId("");
            setCatLevel(1);
            setCatDialogOpen(true);
          }}>
            + 대분류
          </Button>
        </div>

        <div className="space-y-1 text-sm">
          <button
            className={`w-full text-left px-2 py-1 rounded ${!selectedCatId ? "bg-accent text-accent-foreground" : "hover:bg-muted"}`}
            onClick={() => { setSelectedCatId(""); setPage(1); }}
          >
            전체
          </button>
          {level1.map((cat1) => (
            <div key={cat1.id}>
              <div className="flex items-center group">
                <button
                  className={`flex-1 text-left px-2 py-1 rounded font-medium ${selectedCatId === cat1.id ? "bg-accent text-accent-foreground" : "hover:bg-muted"}`}
                  onClick={() => { setSelectedCatId(cat1.id); setPage(1); }}
                >
                  {cat1.name}
                </button>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100" onClick={() => {
                  setCatParentId(cat1.id);
                  setCatLevel(2);
                  setCatDialogOpen(true);
                }}>+</Button>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => handleDeleteCategory(cat1.id)}>×</Button>
              </div>
              {getChildren(cat1.id).map((cat2) => (
                <div key={cat2.id} className="ml-3">
                  <div className="flex items-center group">
                    <button
                      className={`flex-1 text-left px-2 py-1 rounded ${selectedCatId === cat2.id ? "bg-accent text-accent-foreground" : "hover:bg-muted"}`}
                      onClick={() => { setSelectedCatId(cat2.id); setPage(1); }}
                    >
                      {cat2.name}
                    </button>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100" onClick={() => {
                      setCatParentId(cat2.id);
                      setCatLevel(3);
                      setCatDialogOpen(true);
                    }}>+</Button>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => handleDeleteCategory(cat2.id)}>×</Button>
                  </div>
                  {getChildren(cat2.id).map((cat3) => (
                    <div key={cat3.id} className="ml-3">
                      <div className="flex items-center group">
                        <button
                          className={`flex-1 text-left px-2 py-1 rounded ${selectedCatId === cat3.id ? "bg-accent text-accent-foreground" : "hover:bg-muted"}`}
                          onClick={() => { setSelectedCatId(cat3.id); setPage(1); }}
                        >
                          {cat3.name}
                        </button>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => handleDeleteCategory(cat3.id)}>×</Button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <Separator orientation="vertical" className="h-auto" />

      {/* 우측: 품목 목록 */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">품목 관리</h1>
          <Button onClick={() => { setEditProduct(null); setProdDialogOpen(true); }}>
            품목 등록
          </Button>
        </div>

        <div className="mb-4">
          <Input placeholder="품목명 검색" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-60" />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>품목명</TableHead>
              <TableHead>분류</TableHead>
              <TableHead>유형</TableHead>
              <TableHead>단가</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">데이터가 없습니다</TableCell>
              </TableRow>
            ) : products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>{product.categories?.name || "-"}</TableCell>
                <TableCell>
                  <Badge variant={product.product_type === "finished" ? "secondary" : "default"}>
                    {product.product_type === "finished" ? "완제품" : "맞춤피복"}
                  </Badge>
                </TableCell>
                <TableCell>{product.price.toLocaleString()}원</TableCell>
                <TableCell>
                  <Badge variant={product.is_active ? "default" : "destructive"}>
                    {product.is_active ? "사용" : "미사용"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setEditProduct(product); setProdDialogOpen(true); }}>수정</Button>
                    {product.product_type === "finished" && (
                      <Button size="sm" variant="outline" onClick={() => openSpecDialog(product)}>규격</Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Pagination page={page} total={total} limit={20} onChange={setPage} />
      </div>

      {/* 카테고리 등록 다이얼로그 */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {catLevel === 1 ? "대분류" : catLevel === 2 ? "중분류" : "소분류"} 등록
            </DialogTitle>
          </DialogHeader>
          <form action={handleCreateCategory} className="space-y-4">
            <input type="hidden" name="level" value={catLevel} />
            <input type="hidden" name="parent_id" value={catParentId} />
            <div className="space-y-2">
              <Label htmlFor="cat_name">분류명 *</Label>
              <Input id="cat_name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat_order">정렬 순서</Label>
              <Input id="cat_order" name="sort_order" type="number" defaultValue="0" />
            </div>
            <Button type="submit" className="w-full" disabled={pending}>등록</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* 품목 등록/수정 다이얼로그 */}
      <Dialog open={prodDialogOpen} onOpenChange={(open) => { setProdDialogOpen(open); if (!open) setEditProduct(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editProduct ? "품목 수정" : "품목 등록"}</DialogTitle>
          </DialogHeader>
          <form action={handleProductSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prod_name">품목명 *</Label>
              <Input id="prod_name" name="name" defaultValue={editProduct?.name || ""} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>소분류 *</Label>
                <Select name="category_id" defaultValue={editProduct?.category_id || ""}>
                  <SelectTrigger>
                    <SelectValue placeholder="소분류 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {level3Categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!editProduct && (
                <div className="space-y-2">
                  <Label>유형 *</Label>
                  <Select name="product_type" defaultValue="finished">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="finished">완제품</SelectItem>
                      <SelectItem value="custom">맞춤피복</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="prod_price">단가 (원) *</Label>
              <Input id="prod_price" name="price" type="number" min="0" defaultValue={editProduct?.price || 0} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prod_desc">설명</Label>
              <Input id="prod_desc" name="description" defaultValue={editProduct?.description || ""} />
            </div>
            {editProduct && <input type="hidden" name="is_active" value={editProduct.is_active ? "true" : "false"} />}
            <Button type="submit" className="w-full" disabled={pending}>
              {editProduct ? "수정" : "등록"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* 규격 관리 다이얼로그 */}
      <Dialog open={specDialogOpen} onOpenChange={setSpecDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedProduct?.name} - 규격 관리</DialogTitle>
          </DialogHeader>

          {/* 규격 추가 폼 */}
          <form action={handleCreateSpec} className="flex gap-2">
            <input type="hidden" name="product_id" value={selectedProduct?.id || ""} />
            <Input name="spec_name" placeholder="규격명 (예: 95, 100)" required className="flex-1" />
            <Input name="sort_order" type="number" defaultValue="0" className="w-20" placeholder="순서" />
            <Button type="submit" disabled={pending}>추가</Button>
          </form>

          {/* 규격 목록 */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>규격명</TableHead>
                <TableHead>순서</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {specs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">규격이 없습니다</TableCell>
                </TableRow>
              ) : specs.map((spec) => (
                <TableRow key={spec.id}>
                  <TableCell>{spec.spec_name}</TableCell>
                  <TableCell>{spec.sort_order}</TableCell>
                  <TableCell>
                    <Badge variant={spec.is_active ? "default" : "destructive"}>
                      {spec.is_active ? "사용" : "미사용"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteSpec(spec.id)}>삭제</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}
