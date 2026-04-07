"use client";

import { Suspense, useMemo, useCallback } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LayoutDashboard, Search, Layers, FolderKanban, Users, Anchor, BarChart3, Newspaper, Feather, Settings, Award, FileText, MapPin } from "lucide-react";
import { getUpcomingDeadlineCount } from "@/data/grant-pipeline";
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

// Corvus modules hidden for now – will re-enable later
// const corvusItems = [
//   { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
//   { title: "Vendor Upload", url: "/upload", icon: Upload },
//   { title: "Categorization Review", url: "/review", icon: Tags },
//   { title: "Taxonomy Mapper", url: "/taxonomy", icon: GitBranch },
//   { title: "Vendor Graph", url: "/vendor-graph", icon: Network },
//   { title: "Spend Analysis", url: "/spend-analysis", icon: TrendingUp },
//   { title: "Corvus", url: "/", icon: Feather },
//   { title: "Tariff Intelligence", url: "/tariff", icon: Globe2 },
//   { title: "HITL Queue", url: "/queue", icon: ListChecks },
//   { title: "Settings", url: "/settings", icon: Settings },
// ];

const grantMatchItems = [
  { title: "Dashboard", url: "/porter-dashboard", icon: LayoutDashboard },
  { title: "Discover", url: "/grants?tab=discover", icon: Search },
  { title: "Discover (State/Local)", url: "/grants/state-local", icon: MapPin },
  { title: "Pipeline", url: "/grants?tab=pipeline", icon: Layers },
  { title: "Projects", url: "/grants?tab=projects", icon: FolderKanban },
  { title: "Vendor Outreach", url: "/grants?tab=outreach", icon: Users },
  { title: "Grant Intelligence", url: "/grant-match", icon: Anchor },
  { title: "Awards", url: "/awards", icon: Award },
  { title: "Reporting", url: "/reporting", icon: FileText },
  { title: "Competitive Intel", url: "/competitive-intel", icon: BarChart3 },
  { title: "Newsroom", url: "/newsroom", icon: Newspaper },
];

function isItemActive(itemUrl: string, pathname: string, searchParams: URLSearchParams): boolean {
  const [itemPath, itemQuery] = itemUrl.split("?");
  if (pathname !== itemPath) return false;
  if (!itemQuery) return true;
  const itemParams = new URLSearchParams(itemQuery);
  for (const [key, value] of itemParams) {
    if (searchParams.get(key) !== value) return false;
  }
  return true;
}

export default function AppSidebar() {
  return (
    <Suspense>
      <AppSidebarInner />
    </Suspense>
  );
}

function AppSidebarInner() {
  const { state } = useSidebar();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const collapsed = state === "collapsed";
  const upcomingCount = useMemo(() => getUpcomingDeadlineCount(), []);

  const checkIsActive = useCallback(
    (itemUrl: string) => isItemActive(itemUrl, pathname, searchParams),
    [pathname, searchParams]
  );

  return (
    <Sidebar collapsible="icon" className={collapsed ? "w-14" : "w-64"}>
      <SidebarHeader className="border-b px-4 py-4">
        <span
          className="text-xl font-bold tracking-[0.2em] text-[#3d8b8b]"
          style={{ fontFamily: "system-ui, sans-serif" }}
        >
          {collapsed ? <Feather className="h-5 w-5 text-[#3d8b8b]" /> : "CORVO"}
        </span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          {!collapsed && (
            <div className="flex items-center gap-2 px-2 py-1">
              <Anchor className="h-4 w-4" />
              <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground p-0 font-normal">Porter</SidebarGroupLabel>
            </div>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {grantMatchItems.map((item) => {
                const isActive = checkIsActive(item.url);
                const isPipeline = item.title === "Pipeline";
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link href={item.url} className={`flex items-center w-full ${isActive ? "bg-muted text-primary font-medium" : "hover:bg-muted/50"}`}>
                        <item.icon className="mr-2 h-4 w-4 shrink-0" />
                        {!collapsed && (
                          <>
                            <span className="flex-1">{item.title}</span>
                            {isPipeline && upcomingCount > 0 && (
                              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-black px-1.5 text-[10px] font-bold text-white dark:bg-white dark:text-black">
                                {upcomingCount > 99 ? "99+" : upcomingCount}
                              </span>
                            )}
                          </>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/settings" className={`flex items-center w-full ${checkIsActive("/settings") ? "bg-muted text-primary font-medium" : "hover:bg-muted/50"}`}>
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
