"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, FileText, Key, Settings, LayoutDashboard, Building2 } from "lucide-react";
import { useCurrentUser } from "@/contexts/user-context";

const allAdminNav = [
  { title: "Dashboard", href: "/admin", icon: LayoutDashboard, moderatorVisible: true },
  { title: "Entities", href: "/admin/entities", icon: Building2, moderatorVisible: false },
  { title: "Users", href: "/admin/users", icon: Users, moderatorVisible: true },
  { title: "Audit Logs", href: "/admin/audit-logs", icon: FileText, moderatorVisible: false },
  { title: "API Keys", href: "/admin/api-keys", icon: Key, moderatorVisible: false },
  { title: "System", href: "/admin/system", icon: Settings, moderatorVisible: false },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isModerator } = useCurrentUser();

  const adminNav = isModerator
    ? allAdminNav.filter((item) => item.moderatorVisible)
    : allAdminNav;

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-6 py-3">
        <h1 className="text-lg font-semibold">{isModerator ? "User Management" : "Admin Panel"}</h1>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <nav className="w-52 border-r p-3 space-y-1 shrink-0">
          {adminNav.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </Link>
            );
          })}
        </nav>
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
