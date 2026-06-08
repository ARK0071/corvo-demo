"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Kanban, List, Plus, Search, Filter, Loader2, BookOpen } from "lucide-react";
import { TaskBoard } from "./task-board";
import { TaskList } from "./task-list";
import { TaskCreateDialog, type TaskFormData } from "./task-create-dialog";
import { TaskDetailPanel } from "./task-detail-panel";
import type { TaskWithRelations } from "@/lib/db/repositories/tasks";

interface TeamMember {
  id: string;
  name: string;
  email: string;
}

interface TaskStats {
  total: number;
  notStarted: number;
  inProgress: number;
  blocked: number;
  inReview: number;
  submitted: number;
  done: number;
  overdue: number;
}

interface AwardTasksTabProps {
  awardId: string;
  tenantHeaders: Record<string, string>;
}

type ViewMode = "board" | "list";

export function AwardTasksTab({ awardId, tenantHeaders }: AwardTasksTabProps) {
  const [tasks, setTasks] = useState<TaskWithRelations[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("board");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Filters
  const [filterArea, setFilterArea] = useState<string>("");
  const [filterAssignee, setFilterAssignee] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const h = { ...tenantHeaders, "Content-Type": "application/json" };

  const fetchTasks = useCallback(async () => {
    const params = new URLSearchParams({ awardId });
    if (filterArea) params.set("area", filterArea);
    if (filterAssignee) params.set("assigneeId", filterAssignee);
    if (filterStatus) params.set("status", filterStatus);
    if (searchQuery) params.set("search", searchQuery);

    const res = await fetch(`/api/tasks?${params}`, { headers: h });
    if (res.ok) {
      const data = await res.json();
      setTasks(data.tasks || []);
      setStats(data.stats || null);
    }
  }, [awardId, filterArea, filterAssignee, filterStatus, searchQuery]);

  const fetchTeam = useCallback(async () => {
    const res = await fetch("/api/team", { headers: h });
    if (res.ok) {
      const data = await res.json();
      setTeamMembers(data.members || []);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchTasks(), fetchTeam()]).finally(() => setLoading(false));
  }, [fetchTasks, fetchTeam]);

  async function handleCreateTask(form: TaskFormData) {
    await fetch("/api/tasks", {
      method: "POST",
      headers: h,
      body: JSON.stringify({
        ...form,
        awardId,
        assigneeId: form.assigneeId || undefined,
        area: form.area || undefined,
        dueDate: form.dueDate || undefined,
      }),
    });
    fetchTasks();
  }

  async function handleStatusChange(taskId: string, newStatus: string) {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PUT",
      headers: h,
      body: JSON.stringify({ status: newStatus }),
    });
    fetchTasks();
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
      fetchTasks();
    }
  }

  async function handleDelete(taskId: string) {
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE", headers: h });
    fetchTasks();
  }

  async function handleApplyPlaybook() {
    // Fetch available templates
    const res = await fetch("/api/task-templates", { headers: h });
    if (!res.ok) return;
    const { templates } = await res.json();
    if (templates.length === 0) {
      alert("No playbook templates available yet.");
      return;
    }

    const template = templates[0]; // Use first available
    if (!confirm(`Apply "${template.name}" playbook? This will create ${template.items.length}+ tasks with computed deadlines.`)) {
      return;
    }

    const applyRes = await fetch("/api/task-templates", {
      method: "POST",
      headers: h,
      body: JSON.stringify({ templateId: template.id, awardId }),
    });

    if (applyRes.ok) {
      const data = await applyRes.json();
      alert(`Created ${data.tasksCreated} tasks from "${data.templateName}" playbook.`);
      fetchTasks();
    }
  }

  function handleTaskClick(task: TaskWithRelations) {
    setSelectedTask(task);
    setDetailOpen(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      {stats && (
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="secondary">{stats.total} tasks</Badge>
          {stats.overdue > 0 && (
            <Badge className="bg-red-100 text-red-700">{stats.overdue} overdue</Badge>
          )}
          {stats.inProgress > 0 && (
            <Badge className="bg-blue-100 text-blue-700">{stats.inProgress} in progress</Badge>
          )}
          {stats.blocked > 0 && (
            <Badge className="bg-red-100 text-red-700">{stats.blocked} blocked</Badge>
          )}
          {stats.done > 0 && (
            <Badge className="bg-emerald-100 text-emerald-700">{stats.done} done</Badge>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            className="pl-8 h-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Select value={filterArea} onValueChange={setFilterArea}>
          <SelectTrigger className="w-40 h-9">
            <Filter className="h-3 w-3 mr-1" />
            <SelectValue placeholder="All areas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All areas</SelectItem>
            <SelectItem value="financial_reporting">Financial Reporting</SelectItem>
            <SelectItem value="buy_america">Buy America</SelectItem>
            <SelectItem value="dbe">DBE</SelectItem>
            <SelectItem value="environmental">Environmental</SelectItem>
            <SelectItem value="closeout">Closeout</SelectItem>
            <SelectItem value="general">General</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterAssignee} onValueChange={setFilterAssignee}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue placeholder="All assignees" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All assignees</SelectItem>
            {teamMembers.map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <div className="flex items-center border rounded-md">
          <Button
            variant={viewMode === "board" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 rounded-r-none"
            onClick={() => setViewMode("board")}
          >
            <Kanban className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 rounded-l-none"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>

        <Button size="sm" variant="outline" onClick={handleApplyPlaybook}>
          <BookOpen className="h-4 w-4 mr-1" />
          Apply Playbook
        </Button>

        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Task
        </Button>
      </div>

      {/* Board or List */}
      {viewMode === "board" ? (
        <TaskBoard
          tasks={tasks}
          onTaskClick={handleTaskClick}
          onStatusChange={handleStatusChange}
          onCreateTask={() => setCreateOpen(true)}
        />
      ) : (
        <TaskList tasks={tasks} onTaskClick={handleTaskClick} />
      )}

      {/* Create dialog */}
      <TaskCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreateTask}
        teamMembers={teamMembers}
        awardId={awardId}
      />

      {/* Detail panel */}
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
