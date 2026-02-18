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
import { getTailors, createTailor, updateTailor, deleteTailor } from "@/actions/tailors";
import { Pagination } from "@/components/shared/pagination";
import { toast } from "sonner";

export default function TailorsPage() {
  const [tailors, setTailors] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [pending, setPending] = useState(false);

  const fetchData = useCallback(async () => {
    const result = await getTailors({ page, search: search || undefined });
    setTailors(result.tailors);
    setTotal(result.total);
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    const result = editItem
      ? await updateTailor(editItem.id, formData)
      : await createTailor(formData);
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
    const result = await deleteTailor(id);
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
        <h1 className="text-2xl font-bold">체척업체 관리</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditItem(null); }}>
          <DialogTrigger asChild>
            <Button>업체 등록</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editItem ? "업체 수정" : "업체 등록"}</DialogTitle>
            </DialogHeader>
            <form action={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">업체명 *</Label>
                  <Input id="name" name="name" defaultValue={editItem?.name || ""} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business_number">사업자번호</Label>
                  <Input id="business_number" name="business_number" defaultValue={editItem?.business_number || ""} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="representative">대표자</Label>
                  <Input id="representative" name="representative" defaultValue={editItem?.representative || ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">연락처</Label>
                  <Input id="phone" name="phone" defaultValue={editItem?.phone || ""} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">주소</Label>
                <Input id="address" name="address" defaultValue={editItem?.address || ""} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bank_name">은행명</Label>
                  <Input id="bank_name" name="bank_name" defaultValue={editItem?.bank_name || ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account_number">계좌번호</Label>
                  <Input id="account_number" name="account_number" defaultValue={editItem?.account_number || ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account_holder">예금주</Label>
                  <Input id="account_holder" name="account_holder" defaultValue={editItem?.account_holder || ""} />
                </div>
              </div>
              {editItem && <input type="hidden" name="is_active" value={editItem.is_active ? "true" : "false"} />}
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "처리 중..." : editItem ? "수정" : "등록"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-4">
        <Input placeholder="업체명 검색" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-60" />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>업체명</TableHead>
            <TableHead>사업자번호</TableHead>
            <TableHead>대표자</TableHead>
            <TableHead>연락처</TableHead>
            <TableHead>상태</TableHead>
            <TableHead>관리</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tailors.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">데이터가 없습니다</TableCell>
            </TableRow>
          ) : tailors.map((tailor) => (
            <TableRow key={tailor.id}>
              <TableCell className="font-medium">{tailor.name}</TableCell>
              <TableCell>{tailor.business_number || "-"}</TableCell>
              <TableCell>{tailor.representative || "-"}</TableCell>
              <TableCell>{tailor.phone || "-"}</TableCell>
              <TableCell>
                <Badge variant={tailor.is_active ? "default" : "destructive"}>
                  {tailor.is_active ? "활성" : "비활성"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setEditItem(tailor); setDialogOpen(true); }}>수정</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(tailor.id)}>삭제</Button>
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
