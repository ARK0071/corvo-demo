"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, AlertTriangle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTenantHeaders, useTenant } from "@/contexts/tenant-context";
import { fmtDate, daysUntil, reportTypeLabel, statusColor, MONTH_NAMES } from "./helpers";

// ─── Types ───

interface Report {
  id: string;
  awardId: string;
  awardTitle: string;
  program: string;
  type: string;
  title: string;
  dueDate: string;
  periodStart: string;
  periodEnd: string;
  status: string;
}

interface Award {
  id: string;
  program: string;
  title: string;
}

const AWARD_COLORS = [
  "bg-[#3d8b8b]", "bg-blue-500", "bg-purple-500", "bg-amber-500",
  "bg-rose-500", "bg-indigo-500", "bg-emerald-500", "bg-orange-500",
];

interface ReportingCalendarProps {
  onSelectReport: (reportId: string) => void;
}

export default function ReportingCalendar({ onSelectReport }: ReportingCalendarProps) {
  const headers = useTenantHeaders();
  const tenant = useTenant();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [filterAwards, setFilterAwards] = useState<Set<string>>(new Set());
  const [allReports, setAllReports] = useState<Report[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch from API
  useEffect(() => {
    if (tenant.isLoading) return;
    (async () => {
      setLoading(true);
      const h = { ...headers, "Content-Type": "application/json" };
      try {
        const [reportsRes, awardsRes] = await Promise.all([
          fetch("/api/reports", { headers: h }),
          fetch("/api/awards", { headers: h }),
        ]);
        if (reportsRes.ok) {
          const data = await reportsRes.json();
          setAllReports(data.reports || []);
        }
        if (awardsRes.ok) {
          const data = await awardsRes.json();
          setAwards(data.awards || data || []);
        }
      } catch { /* */ }
      setLoading(false);
    })();
  }, [tenant.isLoading, tenant.portId]);

  // Assign colors
  const awardColorMap = useMemo(() => {
    const map = new Map<string, string>();
    awards.forEach((a, i) => map.set(a.id, AWARD_COLORS[i % AWARD_COLORS.length]));
    return map;
  }, [awards]);

  // Filter
  const filteredReports = useMemo(() => {
    if (filterAwards.size === 0) return allReports;
    return allReports.filter((r) => filterAwards.has(r.awardId));
  }, [allReports, filterAwards]);

  // Calendar grid
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date().toISOString().split("T")[0];

    const days: { date: string; day: number; isToday: boolean; isCurrentMonth: boolean; reports: Report[] }[] = [];

    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const dateStr = new Date(year, month - 1, d).toISOString().split("T")[0];
      days.push({ date: dateStr, day: d, isToday: false, isCurrentMonth: false, reports: [] });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = new Date(year, month, d).toISOString().split("T")[0];
      const dayReports = filteredReports.filter((r) => r.dueDate === dateStr);
      days.push({ date: dateStr, day: d, isToday: dateStr === today, isCurrentMonth: true, reports: dayReports });
    }

    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const dateStr = new Date(year, month + 1, d).toISOString().split("T")[0];
      days.push({ date: dateStr, day: d, isToday: false, isCurrentMonth: false, reports: [] });
    }

    return days;
  }, [currentDate, filteredReports]);

  const selectedDayReports = useMemo(() => {
    if (!selectedDay) return [];
    return filteredReports.filter((r) => r.dueDate === selectedDay).sort((a, b) => a.program.localeCompare(b.program));
  }, [selectedDay, filteredReports]);

  const next7Days = useMemo(() => {
    const now = Date.now();
    const cutoff = now + 7 * 24 * 60 * 60 * 1000;
    return filteredReports.filter((r) => {
      if (r.status === "submitted") return false;
      const due = new Date(r.dueDate).getTime();
      return due >= now && due <= cutoff;
    });
  }, [filteredReports]);

  const prevMonth = useCallback(() => { setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1)); setSelectedDay(null); }, []);
  const nextMonth = useCallback(() => { setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1)); setSelectedDay(null); }, []);
  const goToToday = useCallback(() => { setCurrentDate(new Date()); setSelectedDay(new Date().toISOString().split("T")[0]); }, []);

  const toggleAwardFilter = useCallback((awardId: string) => {
    setFilterAwards((prev) => { const next = new Set(prev); if (next.has(awardId)) next.delete(awardId); else next.add(awardId); return next; });
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4 mt-4">
      {/* Next 7 days */}
      {next7Days.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20 p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              {next7Days.length} report{next7Days.length > 1 ? "s" : ""} due in the next 7 days
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {next7Days.map((r) => (
              <button key={r.id} onClick={() => onSelectReport(r.id)} className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/60 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 text-xs transition-colors">
                <div className={`h-2 w-2 rounded-full ${awardColorMap.get(r.awardId) || "bg-gray-400"}`} />
                <span className="font-medium">{reportTypeLabel(r.type)}</span>
                <span className="text-muted-foreground">{fmtDate(r.dueDate)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
          <h2 className="text-lg font-bold min-w-[160px] text-center">{MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
          <Button variant="outline" size="sm" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={goToToday} className="text-xs">Today</Button>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Grid */}
        <div className="flex-1">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="grid grid-cols-7 gap-0 mb-1">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0">
                {calendarData.map((day, i) => {
                  const hasReports = day.reports.length > 0;
                  const hasOverdue = day.reports.some((r) => r.status !== "submitted" && daysUntil(r.dueDate) < 0);
                  const isSelected = selectedDay === day.date;
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDay(day.date)}
                      className={`relative h-16 p-1 border border-border/30 text-left transition-colors ${day.isCurrentMonth ? "" : "opacity-30"} ${day.isToday ? "bg-[#3d8b8b]/5" : ""} ${isSelected ? "ring-2 ring-[#3d8b8b] bg-[#3d8b8b]/10" : "hover:bg-muted/50"}`}
                    >
                      <span className={`text-xs tabular-nums ${day.isToday ? "font-bold text-[#3d8b8b]" : ""} ${hasOverdue ? "text-red-600 dark:text-red-400" : ""}`}>{day.day}</span>
                      {hasReports && (
                        <div className="flex flex-wrap gap-0.5 mt-0.5">
                          {day.reports.slice(0, 3).map((r) => (
                            <div key={r.id} className={`h-1.5 w-1.5 rounded-full ${r.status === "submitted" ? "bg-emerald-400" : daysUntil(r.dueDate) < 0 ? "bg-red-500" : awardColorMap.get(r.awardId) || "bg-gray-400"}`} title={`${reportTypeLabel(r.type)} - ${r.program}`} />
                          ))}
                          {day.reports.length > 3 && <span className="text-[8px] text-muted-foreground leading-none">+{day.reports.length - 3}</span>}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="w-64 shrink-0 space-y-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Filter by Award</h3>
              <div className="space-y-1.5">
                {awards.map((a) => {
                  const isActive = filterAwards.size === 0 || filterAwards.has(a.id);
                  return (
                    <button key={a.id} onClick={() => toggleAwardFilter(a.id)} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs transition-colors ${isActive ? "hover:bg-muted/50" : "opacity-40 hover:opacity-60"}`}>
                      <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${awardColorMap.get(a.id) || "bg-gray-400"}`} />
                      <span className="truncate">{a.program}</span>
                    </button>
                  );
                })}
                {filterAwards.size > 0 && (
                  <button onClick={() => setFilterAwards(new Set())} className="w-full text-center text-[10px] text-muted-foreground hover:text-foreground pt-1">Clear filters</button>
                )}
              </div>
            </CardContent>
          </Card>

          {selectedDay && (
            <Card>
              <CardContent className="pt-4 pb-4">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{fmtDate(selectedDay)}</h3>
                {selectedDayReports.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No reports due</p>
                ) : (
                  <div className="space-y-2">
                    {selectedDayReports.map((r) => {
                      const days = daysUntil(r.dueDate);
                      const isOverdue = days < 0 && r.status !== "submitted";
                      return (
                        <button key={r.id} onClick={() => onSelectReport(r.id)} className="w-full text-left p-2 rounded hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <div className={`h-2 w-2 rounded-full shrink-0 ${awardColorMap.get(r.awardId) || "bg-gray-400"}`} />
                            <span className="text-xs font-medium">{reportTypeLabel(r.type)}</span>
                            <Badge className={`text-[9px] ml-auto ${statusColor(isOverdue ? "overdue" : r.status)}`}>{isOverdue ? "overdue" : r.status.replace("_", " ")}</Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate pl-3.5">{r.program} &mdash; {r.awardTitle}</p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
