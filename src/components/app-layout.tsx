"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Sun, Moon, Calendar, User, ChevronDown } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import AppSidebar from "@/components/app-sidebar";
import { getUpcomingDeadlineCount } from "@/data/grant-pipeline";
import { UserProvider, useCurrentUser } from "@/contexts/user-context";
import { Badge } from "@/components/ui/badge";

const ROLE_LABELS: Record<string, string> = {
  drafter: "Drafter",
  reviewer: "Reviewer",
  certifying_official: "Certifying Official",
  admin: "Admin",
};

function ActingAsPicker() {
  const { currentUser, users, setCurrentUser, isLoading } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (isLoading || users.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted text-xs transition-colors"
      >
        <User className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-medium max-w-[160px] truncate">
          {currentUser?.name || "Select user"}
        </span>
        {currentUser && (
          <Badge variant="outline" className="text-[9px] px-1 py-0">
            {ROLE_LABELS[currentUser.role] || currentUser.role}
          </Badge>
        )}
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-72 rounded-md border bg-popover shadow-lg">
          <div className="px-3 py-2 border-b">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Acting as</p>
          </div>
          <div className="py-1 max-h-60 overflow-y-auto">
            {users.map(u => (
              <button
                key={u.id}
                onClick={() => { setCurrentUser(u.id); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors flex items-center justify-between gap-2 ${
                  currentUser?.id === u.id ? "bg-muted/60" : ""
                }`}
              >
                <div>
                  <p className="font-medium">{u.name}</p>
                  <p className="text-[10px] text-muted-foreground">{u.title} · {u.email}</p>
                </div>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0">
                  {ROLE_LABELS[u.role] || u.role}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  const upcomingCount = useMemo(() => getUpcomingDeadlineCount(), []);

  return (
    <UserProvider>
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
                <ActingAsPicker />
                <Link
                  href="/grants?tab=pipeline"
                  className="relative flex items-center justify-center h-8 w-8 rounded-full hover:bg-muted transition-colors"
                  aria-label={upcomingCount > 0 ? `${upcomingCount} upcoming deadlines` : "Pipeline"}
                >
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {upcomingCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 min-w-4 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white dark:bg-white dark:text-black">
                      {upcomingCount > 99 ? "99+" : upcomingCount}
                    </span>
                  )}
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
    </UserProvider>
  );
}
