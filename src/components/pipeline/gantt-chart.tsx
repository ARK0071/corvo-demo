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

// ── Component ──

export function PipelineGanttChart({ pipelineGrants, onRefreshPipeline }: GanttChartProps) {
  const tenantHeaders = useTenantHeaders();
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGrants, setExpandedGrants] = useState<Set<string>>(new Set());
  const [editingTask, setEditingTask] = useState<GanttTask | GanttSubtask | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [addingSubtask, setAddingSubtask] = useState<{ parentId: string; phase: string; grantId: string } | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [generatingGrantId, setGeneratingGrantId] = useState<string | null>(null);

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

  const gridCols = `240px repeat(${PIPELINE_PHASES.length}, 1fr)`;

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
          {/* Header */}
          <div className="grid" style={{ gridTemplateColumns: gridCols }}>
            <div className="bg-muted/50 border-b border-r px-3 py-2 text-xs font-semibold text-muted-foreground">
              Grants
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

                  {/* Phase summary cells */}
                  {PIPELINE_PHASES.map((phase, phaseIdx) => {
                    const phaseTasks = grantTasks.filter(t => t.phase === phase);
                    const allSubs = phaseTasks.flatMap(t => t.subtasks);
                    const totalItems = allSubs.length || phaseTasks.length;
                    const doneItems = allSubs.length > 0
                      ? allSubs.filter(s => s.status === "done").length
                      : phaseTasks.filter(t => t.status === "done").length;
                    const isCurrentPhase = phase === grant.stage;
                    const isPastPhase = phaseIdx < currentPhaseIndex;

                    return (
                      <div
                        key={phase}
                        className={`border-b border-l px-2 py-2 flex items-center justify-center ${
                          isCurrentPhase ? "bg-muted/40" : ""
                        }`}
                      >
                        {totalItems > 0 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1.5">
                                <div className="h-2 rounded-full overflow-hidden bg-muted w-12">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      isPastPhase || doneItems === totalItems
                                        ? "bg-green-500"
                                        : PHASE_COLORS[phase]
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
                              {PHASE_LABELS[phase]}: {doneItems} of {totalItems} done
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {totalItems === 0 && isPastPhase && (
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Expanded subtask row */}
                {isExpanded && hasTasks && (
                  <div
                    className="grid"
                    style={{ gridTemplateColumns: gridCols }}
                  >
                    {/* Left cell - empty */}
                    <div className="border-b border-r" />

                    {/* Phase cells with subtasks listed directly */}
                    {PIPELINE_PHASES.map((phase) => {
                      const phaseTasks = grantTasks.filter(t => t.phase === phase);
                      const isCurrentPhase = phase === grant.stage;
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
                          key={phase}
                          className={`border-b border-l ${
                            isCurrentPhase ? "bg-muted/20" : ""
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

                                return (
                                  <div
                                    key={item.id}
                                    className="flex items-start gap-1.5 px-2 py-1 group/item hover:bg-muted/30 transition-colors"
                                  >
                                    <button
                                      onClick={() => {
                                        const next = item.status === "done" ? "not_started" : "done";
                                        updateTask(item.id, { status: next });
                                      }}
                                      className="shrink-0 mt-0.5"
                                    >
                                      {item.status === "done" ? (
                                        <Check className="h-3.5 w-3.5 text-green-600" />
                                      ) : item.status === "in_progress" ? (
                                        <Circle className="h-3.5 w-3.5 text-blue-500 fill-blue-500/20" />
                                      ) : (
                                        <Circle className="h-3.5 w-3.5 text-muted-foreground/40" />
                                      )}
                                    </button>

                                    <span
                                      className={`text-xs leading-snug flex-1 ${
                                        item.status === "done"
                                          ? "line-through text-muted-foreground"
                                          : ""
                                      }`}
                                    >
                                      {item.title}
                                    </span>

                                    {/* Assignee avatar */}
                                    <AssigneeBadge
                                      assignee={item.assignee}
                                      assigneeId={item.assigneeId}
                                      colorMap={assigneeColorMap}
                                      teamMembers={teamMembers}
                                      onAssign={(assigneeId) => updateTask(item.id, { assigneeId })}
                                    />

                                    {/* Edit button on hover */}
                                    <button
                                      onClick={() => {
                                        setEditingTask(item);
                                        setEditTitle(item.title);
                                        setEditDescription(item.description);
                                        setEditStartDate(item.startDate || "");
                                        setEditDueDate(item.dueDate || "");
                                      }}
                                      className="shrink-0 mt-0.5 opacity-0 group-hover/item:opacity-50 hover:!opacity-100 transition-opacity"
                                    >
                                      <Pencil className="h-3 w-3 text-muted-foreground" />
                                    </button>
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
                                      onEdit={(t) => {
                                        setEditingTask(t);
                                        setEditTitle(t.title);
                                        setEditDescription(t.description);
                                        setEditStartDate(t.startDate || "");
                                        setEditDueDate(t.dueDate || "");
                                      }}
                                      onAssign={(id, assigneeId) => updateTask(id, { assigneeId })}
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
}: {
  phaseTasks: GanttTask[];
  teamMembers: TeamMember[];
  onAddSubtask: (parentId: string, phase: string, grantId: string) => void;
  onEdit: (task: GanttTask) => void;
  onAssign: (taskId: string, assigneeId: string | null) => void;
}) {
  // Use the first (usually only) parent task for the phase
  const primaryTask = phaseTasks[0];

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
