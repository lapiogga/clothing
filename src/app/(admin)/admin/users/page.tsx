"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/shared/pagination";
import { getUsers } from "@/actions/users";
import { RANK_LABELS, ROLE_LABELS } from "@/lib/constants";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [role, setRole] = useState("");
  const [rank, setRank] = useState("");
  const [search, setSearch] = useState("");

  const fetchUsers = useCallback(async () => {
    const result = await getUsers({
      page,
      role: role || undefined,
      rank: rank || undefined,
      search: search || undefined,
    });
    setUsers(result.users);
    setTotal(result.total);
  }, [page, role, rank, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">사용자 목록</h1>
        <Button asChild>
          <Link href="/admin/users/new">사용자 등록</Link>
        </Button>
      </div>

      {/* 필터 */}
      <div className="flex gap-3 mb-4">
        <Select value={role} onValueChange={(v) => { setRole(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="역할 전체" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">역할 전체</SelectItem>
            {Object.entries(ROLE_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={rank} onValueChange={(v) => { setRank(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="계급 전체" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">계급 전체</SelectItem>
            {Object.entries(RANK_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="이름 검색"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-60"
        />
      </div>

      {/* 테이블 */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>이름</TableHead>
            <TableHead>군번/사번</TableHead>
            <TableHead>계급</TableHead>
            <TableHead>역할</TableHead>
            <TableHead>소속</TableHead>
            <TableHead>상태</TableHead>
            <TableHead>등록일</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                데이터가 없습니다
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <Link href={`/admin/users/${user.id}`} className="hover:underline font-medium">
                    {user.name}
                  </Link>
                </TableCell>
                <TableCell>{user.military_number || "-"}</TableCell>
                <TableCell>
                  {user.rank ? RANK_LABELS[user.rank as keyof typeof RANK_LABELS] || user.rank : "-"}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] || user.role}
                  </Badge>
                </TableCell>
                <TableCell>{user.unit || user.stores?.name || user.tailors?.name || "-"}</TableCell>
                <TableCell>
                  <Badge variant={user.is_active ? "default" : "destructive"}>
                    {user.is_active ? "활성" : "비활성"}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(user.created_at).toLocaleDateString("ko-KR")}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Pagination page={page} total={total} limit={20} onChange={setPage} />
    </div>
  );
}
