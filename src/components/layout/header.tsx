"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/actions/auth";

type MenuItem = {
  label: string;
  href?: string;
  children?: { label: string; href: string }[];
};

type HeaderProps = {
  userName: string;
  roleName: string;
  menuItems: MenuItem[];
};

export function Header({ userName, roleName, menuItems }: HeaderProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b bg-card">
      <div className="flex h-14 items-center px-6">
        {/* 좌측: 시스템명 */}
        <div className="mr-8 font-bold text-lg">
          피복 구매관리
        </div>

        {/* 중앙: 메뉴 */}
        <nav className="flex items-center gap-1 flex-1">
          {menuItems.map((item) =>
            item.children ? (
              <DropdownMenu key={item.label}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={
                      item.children.some((c) => pathname.startsWith(c.href))
                        ? "bg-accent text-accent-foreground"
                        : ""
                    }
                  >
                    {item.label}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {item.children.map((child) => (
                    <DropdownMenuItem key={child.href} asChild>
                      <Link
                        href={child.href}
                        className={
                          pathname === child.href ? "bg-accent/50" : ""
                        }
                      >
                        {child.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                key={item.label}
                variant="ghost"
                size="sm"
                asChild
                className={
                  item.href && pathname.startsWith(item.href)
                    ? "bg-accent text-accent-foreground"
                    : ""
                }
              >
                <Link href={item.href || "#"}>{item.label}</Link>
              </Button>
            )
          )}
        </nav>

        {/* 우측: 사용자 정보 */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {userName} ({roleName})
          </span>
          <form action={logout}>
            <Button variant="outline" size="sm" type="submit">
              로그아웃
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
