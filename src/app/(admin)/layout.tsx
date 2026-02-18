import { getCurrentUser } from "@/actions/auth";
import { Header } from "@/components/layout/header";
import { MENU_CONFIG } from "@/lib/menu-config";
import { ROLE_LABELS } from "@/lib/constants";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  return (
    <div className="min-h-screen">
      <Header
        userName={user.name}
        roleName={ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] || user.role}
        menuItems={MENU_CONFIG.admin as any}
      />
      <main className="p-6">{children}</main>
    </div>
  );
}
