"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LayoutDashboard, Upload, Tags, GitBranch, ListChecks, Settings, Network, Globe2, TrendingUp, Feather, Anchor, Award, Building2, FileUp, BarChart3, Newspaper, Search, Layers, FolderKanban, Users } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const corvusItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Vendor Upload", url: "/upload", icon: Upload },
  { title: "Categorization Review", url: "/review", icon: Tags },
  { title: "Taxonomy Mapper", url: "/taxonomy", icon: GitBranch },
  { title: "Vendor Graph", url: "/vendor-graph", icon: Network },
  { title: "Spend Analysis", url: "/spend-analysis", icon: TrendingUp },
  { title: "Corvus", url: "/", icon: Feather },
  { title: "Tariff Intelligence", url: "/tariff", icon: Globe2 },
  { title: "HITL Queue", url: "/queue", icon: ListChecks },
  { title: "Settings", url: "/settings", icon: Settings },
];

const grantMatchItems = [
  { title: "Dashboard", url: "/porter-dashboard", icon: LayoutDashboard },
  { title: "Discover", url: "/grants?tab=discover", icon: Search },
  { title: "Pipeline", url: "/grants?tab=pipeline", icon: Layers },
  { title: "Projects", url: "/grants?tab=projects", icon: FolderKanban },
  { title: "Vendor Outreach", url: "/grants?tab=outreach", icon: Users },
  { title: "Grant Intelligence", url: "/grant-match", icon: Anchor },
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
          {!collapsed && <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Corvus</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {corvusItems.map((item) => {
                const isActive = isItemActive(item.url, pathname, searchParams);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link
                        href={item.url}
                        className={
                          isActive
                            ? "bg-muted text-primary font-medium"
                            : "hover:bg-muted/50"
                        }
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Porter</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {grantMatchItems.map((item) => {
                const isActive = isItemActive(item.url, pathname, searchParams);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link
                        href={item.url}
                        className={
                          isActive
                            ? "bg-muted text-primary font-medium"
                            : "hover:bg-muted/50"
                        }
                      >
                        <item.icon className="mr-2 h-4 w-4" />
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
    </Sidebar>
  );
}
