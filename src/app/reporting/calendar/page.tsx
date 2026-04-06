"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { useTenantHeaders, useTenant } from "@/contexts/tenant-context";
import ReportingCalendar from "../components/ReportingCalendar";

export default function CalendarPage() {
  const headers = useTenantHeaders();
  const tenant = useTenant();
  const [loaded, setLoaded] = useState(false);

  // The ReportingCalendar component currently reads from in-memory data.
  // This wrapper ensures the tenant context is ready before rendering.
  useEffect(() => {
    if (!tenant.isLoading) setLoaded(true);
  }, [tenant.isLoading]);

  if (!loaded) {
    return <div className="flex-1 flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Reporting Calendar</h1>
        <p className="text-sm text-muted-foreground mt-1">All deadlines across all awards in one view</p>
      </div>
      <ReportingCalendar onSelectReport={(id) => { /* TODO: navigate to report detail */ }} />
    </div>
  );
}
