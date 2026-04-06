"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, CalendarDays, Banknote, Users, ShieldCheck } from "lucide-react";

const navItems = [
  { label: "Overview", href: "/reporting/overview", icon: LayoutDashboard },
  { label: "Forms", href: "/reporting/forms", icon: FileText },
  { label: "Drawdowns", href: "/reporting/drawdowns", icon: Banknote },
  { label: "Subrecipients", href: "/reporting/subrecipients", icon: Users },
  { label: "Calendar", href: "/reporting/calendar", icon: CalendarDays },
  { label: "Audit", href: "/reporting/audit", icon: ShieldCheck },
];

export default function ReportingNav() {
  const pathname = usePathname();

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-1 px-6 pt-4 pb-0 overflow-x-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? "border-[#3d8b8b] text-[#3d8b8b]"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
