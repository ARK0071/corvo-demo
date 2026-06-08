"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
import {
  PIPELINE_PHASES,
  PHASE_LABELS,
  PHASE_COLORS,
  getAssigneeColor,
  UNASSIGNED_COLOR,
} from "@/lib/pipeline-tasks";
import type { PipelinePhase } from "@/lib/pipeline-tasks";
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
  assignee: TaskAssignee | null;
  assigneeId: string | null;
  sortOrder: number;
  startDate: string | null;
  dueDate: string | null;
}

interface GanttTask {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  phase: string | null;
  assignee: TaskAssignee | null;
  assigneeId: string | null;
  pipelineGrantId: string | null;
  sortOrder: number;
  startDate: string | null;
  dueDate: string | null;
  subtasks: GanttSubtask[];
  pipelineGrant: {
    id: string;
    stage: string;
    grant: { title: string; agency: string } | null;
  } | null;
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
    id: string;       // DB UUID (pipeline_grants.id)
    grantId: string;  // Grants.gov opportunity ID
    title: string;
    agency: string;
    stage: string;
    awardCeiling?: number;
  }>;
  onRefreshPipeline: () => void;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Component ──

export function PipelineGanttChart({ pipelineGrants, onRefreshPipeline }: GanttChartProps) {
  const tenantHeaders = useTenantHeaders();
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGrants, setExpandedGrants] = useState<Set<string>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [editingTask, setEditingTask] = useState<GanttTask | GanttSubtask | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [addingSubtask, setAddingSubtask] = useState<string | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  // Build a color map for assignees
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

  // Generate tasks for a pipeline grant that doesn't have any
  const generateTasks = useCallback(async (pipelineGrantId: string) => {
    try {
      await fetch("/api/pipeline/tasks", {
        method: "POST",
        headers: { ...tenantHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ pipelineGrantId }),
      });
      await fetchTasks();
    } catch (error) {
      console.error("Failed to generate tasks:", error);
    }
  }, [tenantHeaders, fetchTasks]);

  // Update a task (status, assignee, etc.)
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

  // Add a subtask
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

  const saveTaskEdit = useCallback(async () => {
    if (!editingTask) return;
    await updateTask(editingTask.id, {
      title: editTitle,
      description: editDescription,
      startDate: editStartDate || null,
      dueDate: editDueDate || null,
    });
    setEditingTask(null);
  }, [editingTask, editTitle, editDescription, editStartDate, editDueDate, updateTask]);

  // Group tasks by pipeline grant ID
  const tasksByGrant = useMemo(() => {
    const map = new Map<string, GanttTask[]>();
    for (const task of tasks) {
      if (!task.pipelineGrantId || task.phase === null) continue;
      // Only top-level tasks (subtasks are nested)
      if (tasks.some(t => t.subtasks.some(s => s.id === task.id))) continue;

      const list = map.get(task.pipelineGrantId) || [];
      list.push(task);
      map.set(task.pipelineGrantId, list);
    }
    return map;
  }, [tasks]);

  // Use pipeline grants from props as the single source of truth
  // Tasks are linked via pipelineGrantId (DB UUID = pg.id)
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

  const toggleTask = (id: string) => {
    setExpandedTasks(prev => {
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

  return (
    <TooltipProvider delayDuration={200}>
      <div className="mt-2">
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 mb-4 text-xs">
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

        {/* Gantt Chart */}
        <div className="border rounded-lg overflow-hidden overflow-x-auto">
          {/* Header: phases */}
          <div className="grid" style={{ gridTemplateColumns: `280px repeat(${PIPELINE_PHASES.length}, 1fr)` }}>
            <div className="bg-muted/50 border-b border-r px-3 py-2 text-xs font-semibold text-muted-foreground">
              Grants / Tasks
            </div>
            {PIPELINE_PHASES.map((phase) => (
              <div
                key={phase}
                className="border-b border-l px-2 py-2 text-center text-xs font-semibold bg-muted/50 text-muted-foreground"
              >
                {PHASE_LABELS[phase]}
              </div>
            ))}
          </div>

          {/* Grant rows */}
          {grantRows.map((grant) => {
            const isExpanded = expandedGrants.has(grant.id);
            const grantTasks = tasksByGrant.get(grant.id) || [];
            const hasTasks = grantTasks.length > 0;
            const currentPhaseIndex = PIPELINE_PHASES.indexOf(grant.stage as PipelinePhase);

            return (
              <div key={grant.id}>
                {/* Grant header row */}
                <div
                  className="grid group hover:bg-muted/30 transition-colors"
                  style={{ gridTemplateColumns: `280px repeat(${PIPELINE_PHASES.length}, 1fr)` }}
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
                        onClick={() => generateTasks(grant.id)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Generate
                      </Button>
                    )}
                  </div>

                  {/* Phase cells - show progress bar for grant */}
                  {PIPELINE_PHASES.map((phase, phaseIdx) => {
                    const phaseTasks = grantTasks.filter(t => t.phase === phase);
                    const totalInPhase = phaseTasks.length;
                    const doneInPhase = phaseTasks.filter(t => t.status === "done").length;
                    const isCurrentPhase = phase === grant.stage;
                    const isPastPhase = phaseIdx < currentPhaseIndex;
                    const isFuturePhase = phaseIdx > currentPhaseIndex;

                    return (
                      <div
                        key={phase}
                        className={`border-b px-1 py-2 flex items-center justify-center ${
                          isCurrentPhase ? "bg-muted/40" : ""
                        }`}
                      >
                        {totalInPhase > 0 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1">
                                <div className={`h-2 rounded-full overflow-hidden ${
                                  isFuturePhase ? "bg-muted w-12" : "bg-muted w-12"
                                }`}>
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      isPastPhase || doneInPhase === totalInPhase
                                        ? "bg-green-500"
                                        : PHASE_COLORS[phase]
                                    }`}
                                    style={{
                                      width: `${totalInPhase > 0 ? (doneInPhase / totalInPhase) * 100 : 0}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-[9px] tabular-nums text-muted-foreground">
                                  {doneInPhase}/{totalInPhase}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              {PHASE_LABELS[phase]}: {doneInPhase} of {totalInPhase} tasks done
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {totalInPhase === 0 && isPastPhase && (
                          <Check className="h-3 w-3 text-green-500" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Expanded: show tasks under each phase */}
                {isExpanded && grantTasks.length > 0 && (
                  <>
                    {PIPELINE_PHASES.map((phase) => {
                      const phaseTasks = grantTasks.filter(t => t.phase === phase);
                      if (phaseTasks.length === 0) return null;

                      return phaseTasks.map((task) => {
                        const isTaskExpanded = expandedTasks.has(task.id);
                        const taskColor = task.assigneeId
                          ? assigneeColorMap.get(task.assigneeId) || UNASSIGNED_COLOR
                          : UNASSIGNED_COLOR;
                        const allSubsDone = task.subtasks.length > 0 &&
                          task.subtasks.every(s => s.status === "done");

                        return (
                          <div key={task.id}>
                            {/* Task row */}
                            <div
                              className="grid group/task hover:bg-muted/20 transition-colors"
                              style={{ gridTemplateColumns: `280px repeat(${PIPELINE_PHASES.length}, 1fr)` }}
                            >
                              <div className="border-b border-r px-3 py-1.5 flex items-center gap-2 pl-8">
                                {task.subtasks.length > 0 ? (
                                  <button onClick={() => toggleTask(task.id)} className="shrink-0">
                                    {isTaskExpanded ? (
                                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                    ) : (
                                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                    )}
                                  </button>
                                ) : (
                                  <div className="w-3" />
                                )}
                                <StatusIcon
                                  status={task.status}
                                  onClick={() => {
                                    const next = task.status === "done" ? "not_started" : "done";
                                    updateTask(task.id, { status: next });
                                  }}
                                />
                                <span className={`text-xs truncate flex-1 ${
                                  task.status === "done" ? "line-through text-muted-foreground" : ""
                                }`}>
                                  {task.title}
                                </span>
                                <TaskActions
                                  task={task}
                                  teamMembers={teamMembers}
                                  onAssign={(assigneeId) => updateTask(task.id, { assigneeId })}
                                  onEdit={() => {
                                    setEditingTask(task);
                                    setEditTitle(task.title);
                                    setEditDescription(task.description);
                                    setEditStartDate(task.startDate || "");
                                    setEditDueDate(task.dueDate || "");
                                  }}
                                  onAddSubtask={() => {
                                    setAddingSubtask(task.id);
                                    setNewSubtaskTitle("");
                                  }}
                                />
                              </div>

                              {/* Phase cells - show bar in the task's phase */}
                              {PIPELINE_PHASES.map((p) => (
                                <div key={p} className="border-b px-1 py-1.5 flex items-center">
                                  {p === task.phase && (
                                    <div className="w-full flex flex-col gap-0.5">
                                      <div
                                        className={`h-5 rounded-sm flex-1 flex items-center px-1.5 text-[10px] font-medium ${
                                          task.status === "done"
                                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                            : taskColor.light
                                        }`}
                                      >
                                        <span className="truncate">
                                          {task.assignee?.name?.split(" ")[0] || "Unassigned"}
                                        </span>
                                        {task.subtasks.length > 0 && (
                                          <span className="ml-auto text-[9px] opacity-70">
                                            {task.subtasks.filter(s => s.status === "done").length}/{task.subtasks.length}
                                          </span>
                                        )}
                                      </div>
                                      {(task.startDate || task.dueDate) && (
                                        <div className="text-[9px] text-muted-foreground px-1 truncate">
                                          {task.startDate && task.dueDate
                                            ? `${formatShortDate(task.startDate)} – ${formatShortDate(task.dueDate)}`
                                            : task.dueDate
                                              ? `Due ${formatShortDate(task.dueDate)}`
                                              : `Start ${formatShortDate(task.startDate!)}`}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>

                            {/* Subtask rows */}
                            {isTaskExpanded && task.subtasks.map((sub) => {
                              const subColor = sub.assigneeId
                                ? assigneeColorMap.get(sub.assigneeId) || UNASSIGNED_COLOR
                                : UNASSIGNED_COLOR;

                              return (
                                <div
                                  key={sub.id}
                                  className="grid group/sub hover:bg-muted/10 transition-colors"
                                  style={{ gridTemplateColumns: `280px repeat(${PIPELINE_PHASES.length}, 1fr)` }}
                                >
                                  <div className="border-b border-r px-3 py-1 flex items-center gap-2 pl-14">
                                    <StatusIcon
                                      status={sub.status}
                                      onClick={() => {
                                        const next = sub.status === "done" ? "not_started" : "done";
                                        updateTask(sub.id, { status: next });
                                      }}
                                    />
                                    <span className={`text-[11px] truncate flex-1 ${
                                      sub.status === "done" ? "line-through text-muted-foreground" : ""
                                    }`}>
                                      {sub.title}
                                    </span>
                                    <TaskActions
                                      task={sub}
                                      teamMembers={teamMembers}
                                      onAssign={(assigneeId) => updateTask(sub.id, { assigneeId })}
                                      onEdit={() => {
                                        setEditingTask(sub);
                                        setEditTitle(sub.title);
                                        setEditDescription(sub.description);
                                        setEditStartDate(sub.startDate || "");
                                        setEditDueDate(sub.dueDate || "");
                                      }}
                                    />
                                  </div>

                                  {PIPELINE_PHASES.map((p) => (
                                    <div key={p} className="border-b px-1 py-1 flex items-center">
                                      {p === sub.phase && (
                                        <div
                                          className={`h-4 rounded-sm w-full flex items-center px-1.5 text-[9px] ${
                                            sub.status === "done"
                                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                              : subColor.light
                                          }`}
                                        >
                                          <span className="truncate">
                                            {sub.assignee?.name?.split(" ")[0] || ""}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              );
                            })}

                            {/* Add subtask row */}
                            {isTaskExpanded && addingSubtask === task.id && (
                              <div
                                className="grid"
                                style={{ gridTemplateColumns: `280px repeat(${PIPELINE_PHASES.length}, 1fr)` }}
                              >
                                <div className="border-b border-r px-3 py-1 flex items-center gap-2 pl-14">
                                  <Input
                                    value={newSubtaskTitle}
                                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        addSubtask(task.id, task.pipelineGrantId!, task.phase!);
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
                                    className="h-6 text-[10px] px-2"
                                    onClick={() => addSubtask(task.id, task.pipelineGrantId!, task.phase!)}
                                  >
                                    Add
                                  </Button>
                                </div>
                                {PIPELINE_PHASES.map((p) => (
                                  <div key={p} className="border-b" />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      });
                    })}
                  </>
                )}

                {/* If expanded but no tasks, show generate button */}
                {isExpanded && grantTasks.length === 0 && (
                  <div
                    className="grid"
                    style={{ gridTemplateColumns: `280px repeat(${PIPELINE_PHASES.length}, 1fr)` }}
                  >
                    <div className="border-b border-r px-3 py-4 flex items-center justify-center col-span-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => generateTasks(grant.id)}
                      >
                        <Plus className="h-3 w-3 mr-1.5" />
                        Generate Tasks
                      </Button>
                    </div>
                    {PIPELINE_PHASES.map((p) => (
                      <div key={p} className="border-b" />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Edit Task Dialog */}
        <Dialog open={!!editingTask} onOpenChange={(open) => { if (!open) setEditingTask(null); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm">Edit Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
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
                  rows={3}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
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
                <Button variant="ghost" size="sm" onClick={() => setEditingTask(null)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={saveTaskEdit}>
                  Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

// ── Sub-components ──

function StatusIcon({ status, onClick }: { status: string; onClick: () => void }) {
  if (status === "done") {
    return (
      <button onClick={onClick} className="shrink-0">
        <Check className="h-3.5 w-3.5 text-green-600" />
      </button>
    );
  }
  if (status === "in_progress") {
    return (
      <button onClick={onClick} className="shrink-0">
        <Circle className="h-3.5 w-3.5 text-blue-500 fill-blue-500/20" />
      </button>
    );
  }
  return (
    <button onClick={onClick} className="shrink-0">
      <Circle className="h-3.5 w-3.5 text-muted-foreground" />
    </button>
  );
}

function TaskActions({
  task,
  teamMembers,
  onAssign,
  onEdit,
  onAddSubtask,
}: {
  task: GanttTask | GanttSubtask;
  teamMembers: TeamMember[];
  onAssign: (assigneeId: string | null) => void;
  onEdit: () => void;
  onAddSubtask?: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-5 w-5 p-0 opacity-40 hover:opacity-100 transition-opacity">
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onEdit} className="text-xs">
          <Pencil className="h-3 w-3 mr-2" />
          Edit
        </DropdownMenuItem>
        {onAddSubtask && (
          <DropdownMenuItem onClick={onAddSubtask} className="text-xs">
            <Plus className="h-3 w-3 mr-2" />
            Add Subtask
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <div className="px-2 py-1 text-[10px] text-muted-foreground font-medium">Assign to</div>
        {teamMembers.map((member) => (
          <DropdownMenuItem
            key={member.id}
            onClick={() => onAssign(member.id)}
            className="text-xs"
          >
            <User className="h-3 w-3 mr-2" />
            {member.name}
            {task.assigneeId === member.id && (
              <Check className="h-3 w-3 ml-auto" />
            )}
          </DropdownMenuItem>
        ))}
        {task.assigneeId && (
          <DropdownMenuItem onClick={() => onAssign(null)} className="text-xs text-muted-foreground">
            Unassign
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
