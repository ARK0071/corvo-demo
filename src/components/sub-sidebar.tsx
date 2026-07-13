"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Receipt,
  ClipboardCheck,
  CalendarDays,
  Settings,
  Anchor,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const subItems = [
  { title: "Dashboard", url: "/sub/dashboard", icon: LayoutDashboard },
  { title: "Documents", url: "/sub/documents", icon: FileText },
  { title: "Expenses", url: "/sub/expenses", icon: Receipt },
  { title: "Compliance", url: "/sub/compliance", icon: ClipboardCheck },
  { title: "Calendar", url: "/sub/calendar", icon: CalendarDays },
];

export default function SubrecipientSidebar() {
  return (
    <Suspense>
      <SubrecipientSidebarInner />
    </Suspense>
  );
}

function SubrecipientSidebarInner() {
  const pathname = usePathname();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <Anchor className="h-5 w-5 shrink-0 text-[#3d8b8b]" />
          {!collapsed && (
            <span className="font-semibold text-sm">Corvo Portal</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Subrecipient Portal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {subItems.map((item) => {
                const isActive = pathname === item.url || pathname.startsWith(item.url + "/");
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link
                        href={item.url}
                        className={`flex items-center w-full ${
                          isActive
                            ? "bg-muted text-primary font-medium"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <item.icon className="mr-2 h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link
                href="/settings"
                className={`flex items-center w-full ${
                  pathname === "/settings"
                    ? "bg-muted text-primary font-medium"
                    : "hover:bg-muted/50"
                }`}
              >
                <Settings className="mr-2 h-4 w-4 shrink-0" />
                {!collapsed && <span>Settings</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
