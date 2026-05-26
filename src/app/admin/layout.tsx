"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, FileText, Key, Settings, LayoutDashboard, Building2 } from "lucide-react";

const adminNav = [
  { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { title: "Entities", href: "/admin/entities", icon: Building2 },
  { title: "Users", href: "/admin/users", icon: Users },
  { title: "Audit Logs", href: "/admin/audit-logs", icon: FileText },
  { title: "API Keys", href: "/admin/api-keys", icon: Key },
  { title: "System", href: "/admin/system", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-6 py-3">
        <h1 className="text-lg font-semibold">Admin Panel</h1>
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
