"use client";

import Link from "next/link";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Sun, Moon, Calendar } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import AppSidebar from "@/components/app-sidebar";
import { getUpcomingDeadlineCount } from "@/data/grant-pipeline";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  const upcomingCount = getUpcomingDeadlineCount();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-12 border-b flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger aria-label="Toggle navigation" />
              <span className="font-semibold">Corvo</span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/grants?tab=pipeline"
                className="relative flex items-center justify-center h-8 w-8 rounded-full hover:bg-muted transition-colors"
                aria-label={`${upcomingCount} upcoming deadlines`}
              >
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 min-w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                  {upcomingCount > 99 ? "99+" : upcomingCount}
                </span>
              </Link>
              <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8">
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          </header>
          <main className="flex-1 flex flex-col">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
