"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  ChevronRight,
  ChevronDown,
  Check,
  Circle,
  Loader2,
  Plus,
  User,
  MoreHorizontal,
  Pencil,
  Flag,
  MessageSquare,
  AlertTriangle,
  Send,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  PIPELINE_PHASES,
  DISPLAY_COLUMNS,
  DISPLAY_COLUMN_LABELS,
  DISPLAY_COLUMN_PHASES,
  phaseToDisplayColumn,
  getAssigneeColor,
  UNASSIGNED_COLOR,
} from "@/lib/pipeline-tasks";
import type { PipelinePhase, DisplayColumn } from "@/lib/pipeline-tasks";
import { useTenantHeaders } from "@/contexts/tenant-context";

// ── Types ──

interface TaskAssignee {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

interface GanttSubtask {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  phase: string | null;
  flagged: boolean;
  assignee: TaskAssignee | null;
  assigneeId: string | null;
  sortOrder: number;
  startDate: string | null;
  dueDate: string | null;
  _count?: { comments: number };
}

interface GanttTask {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  phase: string | null;
  flagged: boolean;
  assignee: TaskAssignee | null;
  assigneeId: string | null;
  pipelineGrantId: string | null;
  sortOrder: number;
  startDate: string | null;
  dueDate: string | null;
  subtasks: GanttSubtask[];
  _count?: { comments: number };
  pipelineGrant: {
    id: string;
    stage: string;
    grant: { title: string; agency: string } | null;
  } | null;
}

interface TaskComment {
  id: string;
  body: string;
  createdAt: string;
  userName: string;
  userImage: string | null;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  image: string | null;
  title: string | null;
  role: string | null;
}

interface GanttChartProps {
  pipelineGrants: Array<{
    id: string;
    grantId: string;
    title: string;
    agency: string;
    stage: string;
    awardCeiling?: number;
  }>;
  onRefreshPipeline: () => void;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Status config
const STATUS_OPTIONS = [
  { value: "not_started", label: "Not Started", icon: Circle, color: "text-muted-foreground/40" },
  { value: "in_progress", label: "In Progress", icon: Circle, color: "text-blue-500" },
  { value: "blocked", label: "Blocked", icon: AlertTriangle, color: "text-red-500" },
  { value: "in_review", label: "In Review", icon: Clock, color: "text-amber-500" },
  { value: "done", label: "Done", icon: Check, color: "text-green-600" },
] as const;

const PRIORITY_CONFIG: Record<string, { label: string; class: string }> = {
  urgent: { label: "Urgent", class: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
  high: { label: "High", class: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
  medium: { label: "Med", class: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  low: { label: "Low", class: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
};

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

function getTaskRowClass(item: { status: string; flagged: boolean; dueDate: string | null }): string {
  if (item.status === "done") return "bg-green-50/50 dark:bg-green-950/20";
  if (item.flagged || item.status === "blocked") return "bg-red-50/50 dark:bg-red-950/20";
  if (isOverdue(item.dueDate) && item.status !== "done") return "bg-amber-50/50 dark:bg-amber-950/20";
  return "";
}

function getProgressBarColor(doneItems: number, totalItems: number, hasFlags: boolean, hasOverdue: boolean): string {
  if (doneItems === totalItems && totalItems > 0) return "bg-green-500";
  if (hasFlags) return "bg-red-500";
  if (hasOverdue) return "bg-amber-500";
  return "bg-blue-500";
}

// ── Component ──

export function PipelineGanttChart({ pipelineGrants, onRefreshPipeline }: GanttChartProps) {
  const tenantHeaders = useTenantHeaders();
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGrants, setExpandedGrants] = useState<Set<string>>(new Set());
  const [detailTask, setDetailTask] = useState<GanttTask | GanttSubtask | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editPriority, setEditPriority] = useState("medium");
  const [addingSubtask, setAddingSubtask] = useState<{ parentId: string; phase: string; grantId: string } | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [generatingGrantId, setGeneratingGrantId] = useState<string | null>(null);

  // Comments state
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  // Drag state
  const [dragItem, setDragItem] = useState<{ id: string; phase: string; grantId: string } | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const assigneeColorMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getAssigneeColor>>();
    const allAssignees = new Set<string>();
    for (const t of tasks) {
      if (t.assigneeId) allAssignees.add(t.assigneeId);
      for (const s of t.subtasks) {
        if (s.assigneeId) allAssignees.add(s.assigneeId);
      }
    }
    let i = 0;
    for (const id of allAssignees) {
      map.set(id, getAssigneeColor(i++));
    }
    return map;
  }, [tasks]);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/pipeline/tasks", {
        headers: { ...tenantHeaders, "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error("Failed to fetch pipeline tasks:", error);
    }
  }, [tenantHeaders]);

  const fetchTeam = useCallback(async () => {
    try {
      const res = await fetch("/api/team", {
        headers: { ...tenantHeaders, "Content-Type": "application/json" },
      });
      if (!res.ok) return;
      const data = await res.json();
      setTeamMembers(data.members || []);
    } catch {
      // Team loading is optional
    }
  }, [tenantHeaders]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchTasks(), fetchTeam()]);
      setLoading(false);
    };
    load();
  }, [fetchTasks, fetchTeam]);

  const generateTasks = useCallback(async (pipelineGrantId: string) => {
    setGeneratingGrantId(pipelineGrantId);
    try {
      const res = await fetch("/api/pipeline/tasks", {
        method: "POST",
        headers: { ...tenantHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ pipelineGrantId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("Failed to generate tasks:", res.status, data.error || res.statusText);
      }
      await fetchTasks();
    } catch (error) {
      console.error("Failed to generate tasks:", error);
    } finally {
      setGeneratingGrantId(null);
    }
  }, [tenantHeaders, fetchTasks]);

  const updateTask = useCallback(async (taskId: string, updates: Record<string, unknown>) => {
    try {
      await fetch("/api/pipeline/tasks", {
        method: "PUT",
        headers: { ...tenantHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, ...updates }),
      });
      await fetchTasks();
      onRefreshPipeline();
    } catch (error) {
      console.error("Failed to update task:", error);
    }
  }, [tenantHeaders, fetchTasks, onRefreshPipeline]);

  const addSubtask = useCallback(async (parentTaskId: string, pipelineGrantId: string, phase: string) => {
    if (!newSubtaskTitle.trim()) return;
    try {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { ...tenantHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newSubtaskTitle.trim(),
          pipelineGrantId,
          parentTaskId,
          phase,
          source: "manual",
        }),
      });
      setNewSubtaskTitle("");
      setAddingSubtask(null);
      await fetchTasks();
    } catch (error) {
      console.error("Failed to add subtask:", error);
    }
  }, [tenantHeaders, newSubtaskTitle, fetchTasks]);

  // Comments
  const fetchComments = useCallback(async (taskId: string) => {
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        headers: { ...tenantHeaders, "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch {
      // non-critical
    } finally {
      setLoadingComments(false);
    }
  }, [tenantHeaders]);

  const submitComment = useCallback(async () => {
    if (!detailTask || !newComment.trim()) return;
    setSubmittingComment(true);
    try {
      await fetch(`/api/tasks/${detailTask.id}/comments`, {
        method: "POST",
        headers: { ...tenantHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ body: newComment.trim() }),
      });
      setNewComment("");
      await fetchComments(detailTask.id);
    } catch (error) {
      console.error("Failed to submit comment:", error);
    } finally {
      setSubmittingComment(false);
    }
  }, [detailTask, newComment, tenantHeaders, fetchComments]);

  const openTaskDetail = useCallback((item: GanttTask | GanttSubtask) => {
    setDetailTask(item);
    setEditTitle(item.title);
    setEditDescription(item.description);
    setEditStartDate(item.startDate || "");
    setEditDueDate(item.dueDate || "");
    setEditPriority(item.priority);
    setComments([]);
    fetchComments(item.id);
  }, [fetchComments]);

  const saveTaskEdit = useCallback(async () => {
    if (!detailTask) return;
    await updateTask(detailTask.id, {
      title: editTitle,
      description: editDescription,
      priority: editPriority,
      startDate: editStartDate || null,
      dueDate: editDueDate || null,
    });
    setDetailTask(null);
  }, [detailTask, editTitle, editDescription, editPriority, editStartDate, editDueDate, updateTask]);

  // Drag & drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, id: string, phase: string, grantId: string) => {
    setDragItem({ id, phase, grantId });
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverId(targetId);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, targetId: string, items: Array<{ item: GanttSubtask | GanttTask }>) => {
    e.preventDefault();
    setDragOverId(null);
    if (!dragItem || dragItem.id === targetId) {
      setDragItem(null);
      return;
    }
    // Find indices and swap sort orders
    const dragIdx = items.findIndex(i => i.item.id === dragItem.id);
    const dropIdx = items.findIndex(i => i.item.id === targetId);
    if (dragIdx === -1 || dropIdx === -1) {
      setDragItem(null);
      return;
    }
    // Assign new sort orders based on position
    const reordered = [...items];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(dropIdx, 0, moved);
    // Update sort orders for all items in this group
    const updates = reordered.map((r, i) =>
      updateTask(r.item.id, { sortOrder: i })
    );
    await Promise.all(updates);
    setDragItem(null);
  }, [dragItem, updateTask]);

  const handleDragEnd = useCallback(() => {
    setDragItem(null);
    setDragOverId(null);
  }, []);

  // Group tasks by pipeline grant ID
  const tasksByGrant = useMemo(() => {
    const map = new Map<string, GanttTask[]>();
    for (const task of tasks) {
      if (!task.pipelineGrantId || task.phase === null) continue;
      if (tasks.some(t => t.subtasks.some(s => s.id === task.id))) continue;
      const list = map.get(task.pipelineGrantId) || [];
      list.push(task);
      map.set(task.pipelineGrantId, list);
    }
    return map;
  }, [tasks]);

  const grantRows = useMemo(() => {
    return pipelineGrants.map((pg) => ({
      id: pg.id,
      title: pg.title,
      agency: pg.agency,
      stage: pg.stage,
    }));
  }, [pipelineGrants]);

  const toggleGrant = (id: string) => {
    setExpandedGrants(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading pipeline...</p>
      </div>
    );
  }

  if (pipelineGrants.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-sm">No grants in the pipeline yet</p>
        <p className="text-xs mt-1">
          Search for grants in the Discover tab and add them to your pipeline
        </p>
      </div>
    );
  }

  const gridCols = `220px repeat(${DISPLAY_COLUMNS.length}, 1fr)`;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="mt-2">
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-4 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground font-medium">Team:</span>
            {teamMembers.map((member, i) => {
              const color = assigneeColorMap.get(member.id) || getAssigneeColor(i);
              return (
                <div key={member.id} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded-sm ${color.bg}`} />
                  <span>{member.name}</span>
                </div>
              );
            })}
            <div className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-sm ${UNASSIGNED_COLOR.bg}`} />
              <span className="text-muted-foreground">Unassigned</span>
            </div>
          </div>
          <div className="border-l pl-4 flex items-center gap-3">
            <span className="text-muted-foreground font-medium">Status:</span>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-green-500/20 border border-green-500/30" /><span>Done</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-amber-500/20 border border-amber-500/30" /><span>Overdue</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-red-500/20 border border-red-500/30" /><span>Flagged</span></div>
          </div>
        </div>

        {/* Gantt Chart */}
        <div className="border rounded-lg overflow-hidden overflow-x-auto">
          {/* Header */}
          <div className="grid" style={{ gridTemplateColumns: gridCols }}>
            <div className="bg-muted/50 border-b border-r px-3 py-2 text-xs font-semibold text-muted-foreground">
              Grants
            </div>
            {DISPLAY_COLUMNS.map((col) => (
              <div
                key={col}
                className="border-b border-l px-2 py-2 text-center text-xs font-semibold bg-muted/50 text-muted-foreground"
              >
                {DISPLAY_COLUMN_LABELS[col]}
              </div>
            ))}
          </div>

          {/* Grant rows */}
          {grantRows.map((grant) => {
            const isExpanded = expandedGrants.has(grant.id);
            const grantTasks = tasksByGrant.get(grant.id) || [];
            const hasTasks = grantTasks.length > 0;
            const currentDisplayCol = phaseToDisplayColumn(grant.stage as PipelinePhase);
            const currentDisplayIdx = DISPLAY_COLUMNS.indexOf(currentDisplayCol);

            return (
              <div key={grant.id}>
                {/* Grant summary row */}
                <div
                  className="grid group hover:bg-muted/30 transition-colors"
                  style={{ gridTemplateColumns: gridCols }}
                >
                  <div className="border-b border-r px-3 py-2 flex items-center gap-2">
                    <button
                      onClick={() => toggleGrant(grant.id)}
                      className="flex items-center gap-1.5 min-w-0 flex-1 text-left"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">{grant.title}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{grant.agency}</p>
                      </div>
                    </button>
                    {!hasTasks && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[10px] px-2 shrink-0"
                        disabled={generatingGrantId === grant.id}
                        onClick={() => generateTasks(grant.id)}
                      >
                        {generatingGrantId === grant.id ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Plus className="h-3 w-3 mr-1" />
                        )}
                        {generatingGrantId === grant.id ? "Generating..." : "Generate"}
                      </Button>
                    )}
                  </div>

                  {/* Phase summary cells (using display columns) */}
                  {DISPLAY_COLUMNS.map((col, colIdx) => {
                    const phases = DISPLAY_COLUMN_PHASES[col];
                    const phaseTasks = grantTasks.filter(t => phases.includes(t.phase as PipelinePhase));
                    const allSubs = phaseTasks.flatMap(t => t.subtasks);
                    const totalItems = allSubs.length || phaseTasks.length;
                    const doneItems = allSubs.length > 0
                      ? allSubs.filter(s => s.status === "done").length
                      : phaseTasks.filter(t => t.status === "done").length;
                    const isCurrentCol = col === currentDisplayCol;
                    const isPastCol = colIdx < currentDisplayIdx;

                    const allItems = allSubs.length > 0 ? allSubs : phaseTasks;
                    const hasFlags = allItems.some(i => i.flagged || i.status === "blocked");
                    const hasOverdue = allItems.some(i => isOverdue(i.dueDate) && i.status !== "done");
                    const barColor = getProgressBarColor(doneItems, totalItems, hasFlags, hasOverdue);

                    return (
                      <div
                        key={col}
                        className={`border-b border-l px-2 py-2 flex items-center justify-center ${
                          isCurrentCol ? "bg-muted/40" : ""
                        }`}
                      >
                        {totalItems > 0 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1.5">
                                {hasFlags && <Flag className="h-3 w-3 text-red-500 shrink-0" />}
                                <div className="h-2 rounded-full overflow-hidden bg-muted w-12">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      isPastCol || doneItems === totalItems
                                        ? "bg-green-500"
                                        : barColor
                                    }`}
                                    style={{
                                      width: `${totalItems > 0 ? (doneItems / totalItems) * 100 : 0}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-[10px] tabular-nums text-muted-foreground">
                                  {doneItems}/{totalItems}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              {DISPLAY_COLUMN_LABELS[col]}: {doneItems} of {totalItems} done
                              {hasFlags && " (has flagged items)"}
                              {hasOverdue && " (has overdue items)"}
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {totalItems === 0 && isPastCol && (
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Expanded task rows */}
                {isExpanded && hasTasks && (
                  <div
                    className="grid"
                    style={{ gridTemplateColumns: gridCols }}
                  >
                    {/* Left cell - empty */}
                    <div className="border-b border-r" />

                    {/* Display column cells with tasks */}
                    {DISPLAY_COLUMNS.map((col) => {
                      const phases = DISPLAY_COLUMN_PHASES[col];
                      const phaseTasks = grantTasks.filter(t => phases.includes(t.phase as PipelinePhase));
                      const isCurrentCol = col === currentDisplayCol;
                      // Flatten: show subtasks if they exist, otherwise the parent task itself
                      const items: Array<{ item: GanttSubtask | GanttTask; parentTask: GanttTask }> = [];
                      for (const task of phaseTasks) {
                        if (task.subtasks.length > 0) {
                          for (const sub of task.subtasks) {
                            items.push({ item: sub, parentTask: task });
                          }
                        } else {
                          items.push({ item: task, parentTask: task });
                        }
                      }

                      return (
                        <div
                          key={col}
                          className={`border-b border-l ${
                            isCurrentCol ? "bg-muted/20" : ""
                          }`}
                        >
                          {items.length === 0 ? (
                            <div className="px-2 py-3 text-xs text-muted-foreground/30 text-center">
                              &mdash;
                            </div>
                          ) : (
                            <div className="py-1.5">
                              {items.map(({ item, parentTask }) => {
                                const color = item.assigneeId
                                  ? assigneeColorMap.get(item.assigneeId) || UNASSIGNED_COLOR
                                  : UNASSIGNED_COLOR;
                                const rowClass = getTaskRowClass(item);
                                const isDragOver = dragOverId === item.id;
                                const commentCount = item._count?.comments || 0;

                                return (
                                  <div
                                    key={item.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, item.id, item.phase || "", grant.id)}
                                    onDragOver={(e) => handleDragOver(e, item.id)}
                                    onDrop={(e) => handleDrop(e, item.id, items)}
                                    onDragEnd={handleDragEnd}
                                    className={`px-1.5 py-1 group/item transition-colors cursor-grab active:cursor-grabbing ${rowClass} ${
                                      isDragOver ? "border-t-2 border-blue-500" : ""
                                    } ${dragItem?.id === item.id ? "opacity-40" : ""}`}
                                  >
                                    {/* Row 1: status + title (full width) */}
                                    <div className="flex items-start gap-1">
                                      <StatusButton
                                        status={item.status}
                                        onChangeStatus={(status) => updateTask(item.id, { status })}
                                      />
                                      <button
                                        onClick={() => openTaskDetail(item)}
                                        className={`text-xs leading-snug flex-1 text-left min-w-0 ${
                                          item.status === "done"
                                            ? "line-through text-muted-foreground"
                                            : ""
                                        }`}
                                      >
                                        {item.title}
                                      </button>
                                    </div>

                                    {/* Row 2: indicators + actions */}
                                    <div className="flex items-center gap-1 mt-0.5 ml-5">
                                      {item.priority !== "medium" && (
                                        <Badge variant="outline" className={`text-[8px] px-1 py-0 h-3.5 leading-none border-0 ${PRIORITY_CONFIG[item.priority]?.class || ""}`}>
                                          {PRIORITY_CONFIG[item.priority]?.label || item.priority}
                                        </Badge>
                                      )}
                                      {isOverdue(item.dueDate) && item.status !== "done" && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Clock className="h-3 w-3 text-amber-500 shrink-0" />
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="text-xs">
                                            Overdue: due {item.dueDate}
                                          </TooltipContent>
                                        </Tooltip>
                                      )}
                                      {commentCount > 0 && (
                                        <button
                                          onClick={() => openTaskDetail(item)}
                                          className="flex items-center gap-0.5 text-muted-foreground/60 hover:text-muted-foreground"
                                        >
                                          <MessageSquare className="h-2.5 w-2.5" />
                                          <span className="text-[9px]">{commentCount}</span>
                                        </button>
                                      )}

                                      <div className="flex-1" />

                                      <button
                                        onClick={() => updateTask(item.id, { flagged: !item.flagged })}
                                        className={item.flagged ? "text-red-500" : "text-muted-foreground/30 hover:text-red-500"}
                                      >
                                        <Flag className="h-3 w-3" fill={item.flagged ? "currentColor" : "none"} />
                                      </button>
                                      <button
                                        onClick={() => openTaskDetail(item)}
                                        className="text-muted-foreground/30 hover:text-muted-foreground"
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </button>
                                      <AssigneeBadge
                                        assignee={item.assignee}
                                        assigneeId={item.assigneeId}
                                        colorMap={assigneeColorMap}
                                        teamMembers={teamMembers}
                                        onAssign={(assigneeId) => updateTask(item.id, { assigneeId })}
                                      />
                                    </div>
                                  </div>
                                );
                              })}

                              {/* Add subtask + menu at bottom of cell */}
                              {phaseTasks.length > 0 && (
                                <div className="px-2 pt-1">
                                  {addingSubtask && phaseTasks.some(t => t.id === addingSubtask.parentId) ? (
                                    <div className="flex items-center gap-1">
                                      <Input
                                        value={newSubtaskTitle}
                                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            addSubtask(addingSubtask.parentId, addingSubtask.grantId, addingSubtask.phase);
                                          }
                                          if (e.key === "Escape") {
                                            setAddingSubtask(null);
                                            setNewSubtaskTitle("");
                                          }
                                        }}
                                        placeholder="New subtask..."
                                        className="h-6 text-xs"
                                        autoFocus
                                      />
                                      <Button
                                        size="sm"
                                        className="h-6 text-xs px-2 shrink-0"
                                        onClick={() => addSubtask(addingSubtask.parentId, addingSubtask.grantId, addingSubtask.phase)}
                                      >
                                        Add
                                      </Button>
                                    </div>
                                  ) : (
                                    <PhaseActions
                                      phaseTasks={phaseTasks}
                                      teamMembers={teamMembers}
                                      onAddSubtask={(taskId, phase, grantId) => {
                                        setAddingSubtask({ parentId: taskId, phase, grantId });
                                        setNewSubtaskTitle("");
                                      }}
                                      onEdit={(t) => openTaskDetail(t)}
                                      onAssign={(id, assigneeId) => updateTask(id, { assigneeId })}
                                      onFlagAll={(flag) => {
                                        for (const t of phaseTasks) {
                                          updateTask(t.id, { flagged: flag });
                                          for (const s of t.subtasks) {
                                            updateTask(s.id, { flagged: flag });
                                          }
                                        }
                                      }}
                                    />
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Expanded but no tasks */}
                {isExpanded && !hasTasks && (
                  <div className="grid" style={{ gridTemplateColumns: gridCols }}>
                    <div className="border-b border-r px-3 py-4 flex items-center justify-center">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        disabled={generatingGrantId === grant.id}
                        onClick={() => generateTasks(grant.id)}
                      >
                        {generatingGrantId === grant.id ? (
                          <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                        ) : (
                          <Plus className="h-3 w-3 mr-1.5" />
                        )}
                        {generatingGrantId === grant.id ? "Generating..." : "Generate Tasks"}
                      </Button>
                    </div>
                    {DISPLAY_COLUMNS.map((col) => (
                      <div key={col} className="border-b" />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Task Detail Dialog */}
        <Dialog open={!!detailTask} onOpenChange={(open) => { if (!open) setDetailTask(null); }}>
          <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-sm flex-1">Task Details</DialogTitle>
                {detailTask && (
                  <div className="flex items-center gap-1.5">
                    {detailTask.priority && (
                      <Badge variant="outline" className={`text-[10px] border-0 ${PRIORITY_CONFIG[detailTask.priority]?.class || ""}`}>
                        {PRIORITY_CONFIG[detailTask.priority]?.label || detailTask.priority}
                      </Badge>
                    )}
                    <button
                      onClick={() => {
                        if (detailTask) updateTask(detailTask.id, { flagged: !detailTask.flagged });
                      }}
                      className={detailTask.flagged ? "text-red-500" : "text-muted-foreground/40 hover:text-red-500"}
                    >
                      <Flag className="h-4 w-4" fill={detailTask.flagged ? "currentColor" : "none"} />
                    </button>
                  </div>
                )}
              </div>
            </DialogHeader>
            <div className="space-y-3 overflow-y-auto flex-1 pr-1">
              <div>
                <label className="text-xs text-muted-foreground">Title</label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Description / Notes</label>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Priority</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value)}
                    className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Start Date</label>
                  <Input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Due Date</label>
                  <Input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setDetailTask(null)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={saveTaskEdit}>
                  Save
                </Button>
              </div>

              {/* Comments section */}
              <div className="border-t pt-3">
                <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Comments {comments.length > 0 && `(${comments.length})`}
                </h4>

                {loadingComments ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : comments.length === 0 ? (
                  <p className="text-xs text-muted-foreground/50 py-2">No comments yet</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto mb-2">
                    {comments.map((comment) => (
                      <div key={comment.id} className="bg-muted/30 rounded-md px-3 py-2">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px] font-semibold">{comment.userName}</span>
                          <span className="text-[9px] text-muted-foreground">
                            {new Date(comment.createdAt).toLocaleDateString(undefined, {
                              month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-xs whitespace-pre-wrap">{comment.body}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-1.5">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    rows={2}
                    className="text-xs flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        submitComment();
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    className="h-auto px-2 self-end"
                    disabled={!newComment.trim() || submittingComment}
                    onClick={submitComment}
                  >
                    {submittingComment ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

// ── Status Button ──

function StatusButton({
  status,
  onChangeStatus,
}: {
  status: string;
  onChangeStatus: (status: string) => void;
}) {
  const current = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
  const Icon = current.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="shrink-0 mt-0.5">
          {status === "done" ? (
            <Check className="h-3.5 w-3.5 text-green-600" />
          ) : status === "blocked" ? (
            <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
          ) : status === "in_progress" ? (
            <Circle className="h-3.5 w-3.5 text-blue-500 fill-blue-500/20" />
          ) : status === "in_review" ? (
            <Clock className="h-3.5 w-3.5 text-amber-500" />
          ) : (
            <Circle className="h-3.5 w-3.5 text-muted-foreground/40" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-36">
        {STATUS_OPTIONS.map((opt) => {
          const OptIcon = opt.icon;
          return (
            <DropdownMenuItem
              key={opt.value}
              onClick={() => onChangeStatus(opt.value)}
              className="text-xs gap-2"
            >
              <OptIcon className={`h-3.5 w-3.5 ${opt.color}`} />
              {opt.label}
              {status === opt.value && <Check className="h-3 w-3 ml-auto" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Assignee Badge ──

function AssigneeBadge({
  assignee,
  assigneeId,
  colorMap,
  teamMembers,
  onAssign,
}: {
  assignee: TaskAssignee | null;
  assigneeId: string | null;
  colorMap: Map<string, ReturnType<typeof getAssigneeColor>>;
  teamMembers: TeamMember[];
  onAssign: (assigneeId: string | null) => void;
}) {
  const color = assigneeId ? colorMap.get(assigneeId) || UNASSIGNED_COLOR : UNASSIGNED_COLOR;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="shrink-0 mt-0.5">
          {assignee ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white ${color.bg}`}
                >
                  {getInitials(assignee.name)}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {assignee.name}
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="w-5 h-5 rounded-full border border-dashed border-muted-foreground/30 flex items-center justify-center">
              <User className="h-2.5 w-2.5 text-muted-foreground/30" />
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <div className="px-2 py-1 text-[10px] text-muted-foreground font-medium">Assign to</div>
        {teamMembers.map((member) => (
          <DropdownMenuItem
            key={member.id}
            onClick={() => onAssign(member.id)}
            className="text-xs"
          >
            <User className="h-3 w-3 mr-2" />
            {member.name}
            {assigneeId === member.id && <Check className="h-3 w-3 ml-auto" />}
          </DropdownMenuItem>
        ))}
        {assigneeId && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onAssign(null)} className="text-xs text-muted-foreground">
              Unassign
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Phase Actions: three-dot at the bottom of a phase cell ──

function PhaseActions({
  phaseTasks,
  teamMembers,
  onAddSubtask,
  onEdit,
  onAssign,
  onFlagAll,
}: {
  phaseTasks: GanttTask[];
  teamMembers: TeamMember[];
  onAddSubtask: (parentId: string, phase: string, grantId: string) => void;
  onEdit: (task: GanttTask) => void;
  onAssign: (taskId: string, assigneeId: string | null) => void;
  onFlagAll: (flag: boolean) => void;
}) {
  // Use the first (usually only) parent task for the phase
  const primaryTask = phaseTasks[0];
  const anyFlagged = phaseTasks.some(t => t.flagged || t.subtasks.some(s => s.flagged));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-full p-0 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem
          onClick={() => onAddSubtask(primaryTask.id, primaryTask.phase!, primaryTask.pipelineGrantId!)}
          className="text-xs"
        >
          <Plus className="h-3 w-3 mr-2" />
          Add Subtask
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEdit(primaryTask)} className="text-xs">
          <Pencil className="h-3 w-3 mr-2" />
          Edit Phase Task
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onFlagAll(!anyFlagged)}
          className="text-xs"
        >
          <Flag className="h-3 w-3 mr-2" />
          {anyFlagged ? "Unflag All" : "Flag / Escalate All"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="px-2 py-1 text-[10px] text-muted-foreground font-medium">
          Assign all to
        </div>
        {teamMembers.map((member) => (
          <DropdownMenuItem
            key={member.id}
            onClick={() => {
              for (const t of phaseTasks) {
                onAssign(t.id, member.id);
                for (const s of t.subtasks) {
                  onAssign(s.id, member.id);
                }
              }
            }}
            className="text-xs"
          >
            <User className="h-3 w-3 mr-2" />
            {member.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
