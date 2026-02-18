"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { getMenus, createMenu, updateMenu, deleteMenu } from "@/actions/menus";
import { toast } from "sonner";

const ROLES = [
  { value: "admin", label: "군수담당자" },
  { value: "store", label: "피복판매소" },
  { value: "tailor", label: "체척업체" },
  { value: "user", label: "일반사용자" },
];

const NONE = "__none__";

export default function MenusPage() {
  const [menus, setMenus] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [pending, setPending] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [parentId, setParentId] = useState("");
  const [isActive, setIsActive] = useState(true);

  const fetchData = useCallback(async () => {
    const result = await getMenus();
    setMenus(result.menus);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 루트 메뉴(parent_id = null) 목록
  const rootMenus = menus.filter((m) => !m.parent_id);
  const getChildren = (pid: string) => menus.filter((m) => m.parent_id === pid);

  // 상위 메뉴 옵션: 루트 메뉴만, 편집 중인 항목 제외
  const parentOptions = menus.filter((m) => !m.parent_id && m.id !== editItem?.id);

  function openCreate() {
    setEditItem(null);
    setSelectedRoles([]);
    setParentId("");
    setIsActive(true);
    setDialogOpen(true);
  }

  function openEdit(item: any) {
    setEditItem(item);
    setSelectedRoles(item.role_access || []);
    setParentId(item.parent_id || "");
    setIsActive(item.is_active);
    setDialogOpen(true);
  }

  function toggleRole(role: string) {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

  async function handleSubmit(formData: FormData) {
    setPending(true);
    // 역할 배열을 FormData에 추가
    selectedRoles.forEach((role) => formData.append("role_access", role));

    const result = editItem
      ? await updateMenu(editItem.id, formData)
      : await createMenu(formData);

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
    const result = await deleteMenu(id);
    if (result.success) {
      toast.success("삭제되었습니다");
      fetchData();
    } else {
      toast.error(result.error || "삭제에 실패했습니다");
    }
  }

  // 트리 형태로 행 렌더링 (재귀)
  function renderMenuRows(menu: any, level = 0): React.ReactNode[] {
    const children = getChildren(menu.id);
    return [
      <TableRow key={menu.id}>
        <TableCell>
          <span style={{ paddingLeft: `${level * 24}px` }}>
            {level > 0 && <span className="text-muted-foreground mr-1">└</span>}
            {menu.name}
          </span>
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {menu.url || "-"}
        </TableCell>
        <TableCell>
          <div className="flex flex-wrap gap-1">
            {(menu.role_access || []).length > 0
              ? (menu.role_access as string[]).map((r) => (
                  <Badge key={r} variant="secondary" className="text-xs">
                    {ROLES.find((role) => role.value === r)?.label || r}
                  </Badge>
                ))
              : <span className="text-muted-foreground text-sm">-</span>
            }
          </div>
        </TableCell>
        <TableCell className="text-center">{menu.sort_order}</TableCell>
        <TableCell>
          <Badge variant={menu.is_active ? "default" : "destructive"}>
            {menu.is_active ? "활성" : "비활성"}
          </Badge>
        </TableCell>
        <TableCell>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => openEdit(menu)}>
              수정
            </Button>
            <Button size="sm" variant="destructive" onClick={() => handleDelete(menu.id)}>
              삭제
            </Button>
          </div>
        </TableCell>
      </TableRow>,
      ...children.flatMap((child) => renderMenuRows(child, level + 1)),
    ];
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">메뉴 관리</h1>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setEditItem(null);
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={openCreate}>메뉴 등록</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editItem ? "메뉴 수정" : "메뉴 등록"}</DialogTitle>
            </DialogHeader>
            <form action={handleSubmit} className="space-y-4">
              {/* parent_id, is_active: 상태에서 hidden input으로 전달 */}
              <input type="hidden" name="parent_id" value={parentId} />
              <input type="hidden" name="is_active" value={isActive ? "true" : "false"} />

              <div className="space-y-2">
                <Label htmlFor="name">메뉴명 *</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editItem?.name || ""}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  name="url"
                  defaultValue={editItem?.url || ""}
                  placeholder="/admin/..."
                />
              </div>

              <div className="space-y-2">
                <Label>상위 메뉴</Label>
                <Select
                  value={parentId || NONE}
                  onValueChange={(v) => setParentId(v === NONE ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="최상위 (없음)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>최상위 (없음)</SelectItem>
                    {parentOptions.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sort_order">정렬 순서</Label>
                <Input
                  id="sort_order"
                  name="sort_order"
                  type="number"
                  min="0"
                  defaultValue={editItem?.sort_order ?? 0}
                />
              </div>

              <div className="space-y-2">
                <Label>접근 역할</Label>
                <div className="flex flex-wrap gap-4">
                  {ROLES.map((role) => (
                    <div key={role.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`role-${role.value}`}
                        checked={selectedRoles.includes(role.value)}
                        onCheckedChange={() => toggleRole(role.value)}
                      />
                      <label
                        htmlFor={`role-${role.value}`}
                        className="text-sm cursor-pointer"
                      >
                        {role.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="is_active_check"
                  checked={isActive}
                  onCheckedChange={(checked) => setIsActive(checked === true)}
                />
                <label htmlFor="is_active_check" className="text-sm cursor-pointer">
                  사용 (활성)
                </label>
              </div>

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
            <TableHead>메뉴명</TableHead>
            <TableHead>URL</TableHead>
            <TableHead>접근 역할</TableHead>
            <TableHead className="text-center w-20">순서</TableHead>
            <TableHead className="w-20">상태</TableHead>
            <TableHead className="w-28">관리</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {menus.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                데이터가 없습니다
              </TableCell>
            </TableRow>
          ) : (
            rootMenus.flatMap((menu) => renderMenuRows(menu))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
