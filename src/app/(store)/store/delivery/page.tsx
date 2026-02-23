"use client";

import { useEffect, useState } from "react";
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
import { getDeliveryZones, createDeliveryZone, updateDeliveryZone, deleteDeliveryZone } from "@/actions/delivery-zones";
import { getCurrentUser } from "@/actions/auth";
import { toast } from "sonner";

export default function DeliveryZonesPage() {
  const [zones, setZones] = useState<any[]>([]);
  const [storeId, setStoreId] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user?.store_id) {
        setStoreId(user.store_id);
        getDeliveryZones(user.store_id).then((r) => setZones(r.zones));
      }
    });
  }, []);

  function refreshData() {
    if (storeId) getDeliveryZones(storeId).then((r) => setZones(r.zones));
  }

  async function handleSubmit(formData: FormData) {
    setPending(true);
    formData.set("store_id", storeId);
    const result = editItem
      ? await updateDeliveryZone(editItem.id, formData)
      : await createDeliveryZone(formData);
    if (result.success) {
      toast.success(editItem ? "수정되었습니다" : "등록되었습니다");
      setDialogOpen(false);
      setEditItem(null);
      refreshData();
    } else {
      toast.error(result.error || "처리에 실패했습니다");
    }
    setPending(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    const result = await deleteDeliveryZone(id);
    if (result.success) {
      toast.success("삭제되었습니다");
      refreshData();
    } else {
      toast.error(result.error || "삭제에 실패했습니다");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">배송지 관리</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditItem(null); }}>
          <DialogTrigger asChild>
            <Button>배송지 등록</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editItem ? "배송지 수정" : "배송지 등록"}</DialogTitle>
            </DialogHeader>
            <form action={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">배송지명 *</Label>
                <Input id="name" name="name" defaultValue={editItem?.name || ""} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">주소</Label>
                <Input id="address" name="address" defaultValue={editItem?.address || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="note">비고</Label>
                <Input id="note" name="note" defaultValue={editItem?.note || ""} />
              </div>
              {editItem && <input type="hidden" name="is_active" value={editItem.is_active ? "true" : "false"} />}
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "처리 중..." : editItem ? "수정" : "등록"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>배송지명</TableHead>
            <TableHead>주소</TableHead>
            <TableHead>비고</TableHead>
            <TableHead>상태</TableHead>
            <TableHead>관리</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {zones.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">데이터가 없습니다</TableCell>
            </TableRow>
          ) : zones.map((zone) => (
            <TableRow key={zone.id}>
              <TableCell className="font-medium">{zone.name}</TableCell>
              <TableCell>{zone.address || "-"}</TableCell>
              <TableCell>{zone.note || "-"}</TableCell>
              <TableCell>
                <Badge variant={zone.is_active ? "default" : "destructive"}>
                  {zone.is_active ? "활성" : "비활성"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => { setEditItem(zone); setDialogOpen(true); }}>수정</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(zone.id)}>삭제</Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
