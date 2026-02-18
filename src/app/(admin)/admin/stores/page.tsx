"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { getStores, createStore, updateStore, deleteStore } from "@/actions/stores";
import { Pagination } from "@/components/shared/pagination";
import { toast } from "sonner";

export default function StoresPage() {
  const [stores, setStores] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [pending, setPending] = useState(false);

  const fetchData = useCallback(async () => {
    const result = await getStores({ page, search: search || undefined });
    setStores(result.stores);
    setTotal(result.total);
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    const result = editItem
      ? await updateStore(editItem.id, formData)
      : await createStore(formData);
    if (result.success) {
      toast.success(editItem ? "수정되었습니다" : "등록되었습니다");
      setDialogOpen(false);
      setEditItem(null);
      fetchData();
    } else {
      toast.error(result.error || "처리에 실패했습니다");
    }
    setPending(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    const result = await deleteStore(id);
    if (result.success) {
      toast.success("삭제되었습니다");
      fetchData();
    } else {
      toast.error(result.error || "삭제에 실패했습니다");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">판매소 관리</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditItem(null); }}>
          <DialogTrigger asChild>
            <Button>판매소 등록</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editItem ? "판매소 수정" : "판매소 등록"}</DialogTitle>
            </DialogHeader>
            <form action={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">판매소명 *</Label>
                <Input id="name" name="name" defaultValue={editItem?.name || ""} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">주소</Label>
                <Input id="address" name="address" defaultValue={editItem?.address || ""} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">연락처</Label>
                  <Input id="phone" name="phone" defaultValue={editItem?.phone || ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manager_name">담당자</Label>
                  <Input id="manager_name" name="manager_name" defaultValue={editItem?.manager_name || ""} />
                </div>
              </div>
              {editItem && (
                <input type="hidden" name="is_active" value={editItem.is_active ? "true" : "false"} />
              )}
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "처리 중..." : editItem ? "수정" : "등록"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-4">
        <Input
          placeholder="판매소명 검색"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-60"
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>판매소명</TableHead>
            <TableHead>주소</TableHead>
            <TableHead>연락처</TableHead>
            <TableHead>담당자</TableHead>
            <TableHead>상태</TableHead>
            <TableHead>관리</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stores.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">데이터가 없습니다</TableCell>
            </TableRow>
          ) : stores.map((store) => (
            <TableRow key={store.id}>
              <TableCell className="font-medium">{store.name}</TableCell>
              <TableCell>{store.address || "-"}</TableCell>
              <TableCell>{store.phone || "-"}</TableCell>
              <TableCell>{store.manager_name || "-"}</TableCell>
              <TableCell>
                <Badge variant={store.is_active ? "default" : "destructive"}>
                  {store.is_active ? "활성" : "비활성"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setEditItem(store); setDialogOpen(true); }}>수정</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(store.id)}>삭제</Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination page={page} total={total} limit={20} onChange={setPage} />
    </div>
  );
}
