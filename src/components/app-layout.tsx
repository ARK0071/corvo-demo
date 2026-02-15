"use client";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import AppSidebar from "@/components/app-sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();

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
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </header>
          <main className="flex-1 flex flex-col">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
