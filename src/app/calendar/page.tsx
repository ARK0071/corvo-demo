"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  FileText,
  CheckSquare,
  Loader2,
  Layers,
  Award,
  Users,
  FolderKanban,
  Shield,
} from "lucide-react";
import { useTenantHeaders, useTenant } from "@/contexts/tenant-context";
import { TaskDetailPanel } from "@/components/tasks/task-detail-panel";
import type { TaskWithRelations } from "@/lib/db/repositories/tasks";

// ── Types for calendar items ──

interface FederalReport {
  id: string;
  type: "federal_report";
  title: string;
  reportType: string;
  dueDate: string;
  status: string;
  awardId: string;
  awardTitle: string;
  awardProgram: string;
  periodStart: string;
  periodEnd: string;
}

interface GrantDeadline {
  id: string;
  type: "grant_deadline";
  title: string;
  date: string;
  agency: string;
  grantId: string;
  stage: string;
}

interface AwardMilestone {
  id: string;
  type: "award_milestone";
  title: string;
  date: string;
  awardId: string;
  program: string;
  milestoneType: "period_start" | "period_end";
}

interface SubrecipientReportItem {
  id: string;
  type: "subrecipient_report";
  title: string;
  date: string;
  status: string;
  subrecipientName: string;
  awardTitle: string;
}

interface CorrectiveActionItem {
  id: string;
  type: "corrective_action";
  title: string;
  date: string;
  status: string;
  responsible: string;
  findingTitle: string;
  awardTitle: string;
}

interface ProjectMilestone {
  id: string;
  type: "project_milestone";
  title: string;
  date: string;
  projectName: string;
  milestoneType: "start" | "end";
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
}

type CalendarItem =
  | { itemType: "task"; date: string; title: string; id: string; meta?: TaskWithRelations }
  | { itemType: "federal_report"; date: string; title: string; id: string }
  | { itemType: "grant_deadline"; date: string; title: string; id: string }
  | { itemType: "award_milestone"; date: string; title: string; id: string; milestoneType: string }
  | { itemType: "subrecipient_report"; date: string; title: string; id: string }
  | { itemType: "corrective_action"; date: string; title: string; id: string }
  | { itemType: "project_milestone"; date: string; title: string; id: string; milestoneType: string };

const ITEM_STYLES: Record<string, { bg: string; icon: typeof CheckSquare }> = {
  task: { bg: "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300", icon: CheckSquare },
  federal_report: { bg: "bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300", icon: FileText },
  grant_deadline: { bg: "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300", icon: Layers },
  award_milestone: { bg: "bg-teal-100 text-teal-700 hover:bg-teal-200 dark:bg-teal-900/30 dark:text-teal-300", icon: Award },
  subrecipient_report: { bg: "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300", icon: Users },
  corrective_action: { bg: "bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-300", icon: Shield },
  project_milestone: { bg: "bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300", icon: FolderKanban },
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function CalendarPage() {
  const tenantHeaders = useTenantHeaders();
  const tenant = useTenant();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<TaskWithRelations[]>([]);
  const [federalReports, setFederalReports] = useState<FederalReport[]>([]);
  const [grantDeadlines, setGrantDeadlines] = useState<GrantDeadline[]>([]);
  const [awardMilestones, setAwardMilestones] = useState<AwardMilestone[]>([]);
  const [subrecipientReports, setSubrecipientReports] = useState<SubrecipientReportItem[]>([]);
  const [correctiveActions, setCorrectiveActions] = useState<CorrectiveActionItem[]>([]);
  const [projectMilestones, setProjectMilestones] = useState<ProjectMilestone[]>([]);
  const [overdue, setOverdue] = useState<TaskWithRelations[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const h = { ...tenantHeaders, "Content-Type": "application/json" };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchCalendar = useCallback(async () => {
    if (tenant.isLoading) return;

    const startDate = new Date(year, month, 1).toISOString().split("T")[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split("T")[0];

    const [calRes, teamRes] = await Promise.all([
      fetch(`/api/tasks/calendar?startDate=${startDate}&endDate=${endDate}`, { headers: h }),
      fetch("/api/team", { headers: h }),
    ]);

    if (calRes.ok) {
      const data = await calRes.json();
      setTasks(data.tasks || []);
      setFederalReports(data.federalReports || []);
      setGrantDeadlines(data.grantDeadlines || []);
      setAwardMilestones(data.awardMilestones || []);
      setSubrecipientReports(data.subrecipientReports || []);
      setCorrectiveActions(data.correctiveActions || []);
      setProjectMilestones(data.projectMilestones || []);
      setOverdue(data.overdue || []);
    }
    if (teamRes.ok) {
      const data = await teamRes.json();
      setTeamMembers(data.members || []);
    }
  }, [tenant.isLoading, year, month]);

  useEffect(() => {
    setLoading(true);
    fetchCalendar().finally(() => setLoading(false));
  }, [fetchCalendar]);

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }
  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }
  function goToday() {
    setCurrentDate(new Date());
  }

  // Build all calendar items grouped by date
  const itemsByDate = useMemo(() => {
    const map: Record<string, CalendarItem[]> = {};

    function add(item: CalendarItem) {
      if (!map[item.date]) map[item.date] = [];
      map[item.date].push(item);
    }

    // Tasks - show on dueDate; also show spanning tasks on startDate
    for (const task of tasks) {
      if (task.dueDate) {
        add({ itemType: "task", date: task.dueDate, title: task.title, id: task.id, meta: task });
      }
      if (task.startDate && task.startDate !== task.dueDate) {
        add({ itemType: "task", date: task.startDate, title: `Start: ${task.title}`, id: `start-${task.id}`, meta: task });
      }
    }

    for (const r of federalReports) {
      add({ itemType: "federal_report", date: r.dueDate, title: r.title, id: r.id });
    }

    for (const g of grantDeadlines) {
      add({ itemType: "grant_deadline", date: g.date, title: g.title, id: g.id });
    }

    for (const a of awardMilestones) {
      add({ itemType: "award_milestone", date: a.date, title: a.title, id: a.id, milestoneType: a.milestoneType });
    }

    for (const s of subrecipientReports) {
      add({ itemType: "subrecipient_report", date: s.date, title: s.title, id: s.id });
    }

    for (const c of correctiveActions) {
      add({ itemType: "corrective_action", date: c.date, title: c.title, id: c.id });
    }

    for (const p of projectMilestones) {
      add({ itemType: "project_milestone", date: p.date, title: p.title, id: p.id, milestoneType: p.milestoneType });
    }

    return map;
  }, [tasks, federalReports, grantDeadlines, awardMilestones, subrecipientReports, correctiveActions, projectMilestones]);

  // Count totals for summary
  const totalItems = useMemo(() => {
    let count = 0;
    for (const items of Object.values(itemsByDate)) count += items.length;
    return count;
  }, [itemsByDate]);

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const weeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) currentWeek.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  async function handleUpdate(taskId: string, updates: Record<string, unknown>) {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PUT",
      headers: h,
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const updated = await res.json();
      setSelectedTask(updated);
      fetchCalendar();
    }
  }

  async function handleDelete(taskId: string) {
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE", headers: h });
    fetchCalendar();
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-[#3d8b8b]" />
            Master Schedule
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            All deadlines and milestones: tasks, reports, grant deadlines, award periods, and more
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {totalItems} item{totalItems !== 1 ? "s" : ""} this month
        </div>
      </div>

      {/* Overdue alert */}
      {overdue.length > 0 && (
        <Card className="border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium text-red-700 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {overdue.length} Overdue Task{overdue.length !== 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0">
            <div className="space-y-1">
              {overdue.slice(0, 5).map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between text-sm cursor-pointer hover:bg-red-100/50 dark:hover:bg-red-900/20 rounded px-2 py-1"
                  onClick={() => { setSelectedTask(t); setDetailOpen(true); }}
                >
                  <span className="text-red-800 dark:text-red-300">{t.title}</span>
                  <span className="text-red-600 dark:text-red-400 text-xs">
                    {t.dueDate && new Date(t.dueDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
              ))}
              {overdue.length > 5 && (
                <p className="text-xs text-red-600 dark:text-red-400 pl-2">+{overdue.length - 5} more</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <h2 className="text-lg font-semibold">
          {MONTHS[month]} {year}
        </h2>
      </div>

      {/* Calendar grid */}
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-7 border-b">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground border-r last:border-r-0">
                {d}
              </div>
            ))}
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 border-b last:border-b-0 min-h-[110px]">
              {week.map((day, di) => {
                if (day === null) {
                  return <div key={di} className="border-r last:border-r-0 bg-muted/20" />;
                }

                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const items = itemsByDate[dateStr] || [];
                const isToday =
                  day === today.getDate() &&
                  month === today.getMonth() &&
                  year === today.getFullYear();

                return (
                  <div
                    key={di}
                    className={`border-r last:border-r-0 p-1 ${isToday ? "bg-blue-50/50 dark:bg-blue-950/20" : ""}`}
                  >
                    <div className={`text-xs font-medium mb-0.5 ${isToday ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"}`}>
                      {day}
                    </div>
                    <div className="space-y-0.5">
                      {items.slice(0, 4).map((item) => {
                        const style = ITEM_STYLES[item.itemType] || ITEM_STYLES.task;
                        const Icon = style.icon;
                        const isClickableTask = item.itemType === "task" && item.meta;

                        return (
                          <div
                            key={item.id}
                            className={`flex items-center gap-0.5 text-[10px] px-1 py-0.5 rounded truncate ${style.bg} ${isClickableTask ? "cursor-pointer" : ""}`}
                            title={item.title}
                            onClick={isClickableTask ? () => {
                              setSelectedTask(item.meta!);
                              setDetailOpen(true);
                            } : undefined}
                          >
                            <Icon className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate">{item.title}</span>
                          </div>
                        );
                      })}
                      {items.length > 4 && (
                        <div className="text-[10px] text-muted-foreground pl-1">
                          +{items.length - 4} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-blue-200 dark:bg-blue-900" />
          Tasks
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-purple-200 dark:bg-purple-900" />
          Federal Reports
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-200 dark:bg-green-900" />
          Grant Deadlines
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-teal-200 dark:bg-teal-900" />
          Award Milestones
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-amber-200 dark:bg-amber-900" />
          Subrecipient Reports
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-orange-200 dark:bg-orange-900" />
          Corrective Actions
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-indigo-200 dark:bg-indigo-900" />
          Project Milestones
        </div>
      </div>

      <TaskDetailPanel
        task={selectedTask}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        teamMembers={teamMembers}
        tenantHeaders={h}
      />
    </div>
  );
}
