"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Calendar, AlertTriangle, User } from "lucide-react";
import type { TaskWithRelations } from "@/lib/db/repositories/tasks";

type TaskStatus = "not_started" | "in_progress" | "blocked" | "in_review" | "submitted" | "done";

const STATUS_COLUMNS: { key: TaskStatus; label: string; color: string }[] = [
  { key: "not_started", label: "Not Started", color: "bg-slate-100" },
  { key: "in_progress", label: "In Progress", color: "bg-blue-50" },
  { key: "blocked", label: "Blocked", color: "bg-red-50" },
  { key: "in_review", label: "In Review", color: "bg-amber-50" },
  { key: "submitted", label: "Submitted", color: "bg-purple-50" },
  { key: "done", label: "Done", color: "bg-emerald-50" },
];

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-slate-100 text-slate-600",
};

interface TaskBoardProps {
  tasks: TaskWithRelations[];
  onTaskClick: (task: TaskWithRelations) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onCreateTask: () => void;
}

export function TaskBoard({ tasks, onTaskClick, onStatusChange, onCreateTask }: TaskBoardProps) {
  const [draggedTask, setDraggedTask] = useState<string | null>(null);

  const tasksByStatus = STATUS_COLUMNS.reduce(
    (acc, col) => {
      acc[col.key] = tasks.filter((t) => t.status === col.key);
      return acc;
    },
    {} as Record<TaskStatus, TaskWithRelations[]>
  );

  function handleDragStart(taskId: string) {
    setDraggedTask(taskId);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDrop(status: TaskStatus) {
    if (draggedTask) {
      onStatusChange(draggedTask, status);
      setDraggedTask(null);
    }
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {STATUS_COLUMNS.map((col) => (
        <div
          key={col.key}
          className={`flex-shrink-0 w-72 rounded-lg p-3 ${col.color}`}
          onDragOver={handleDragOver}
          onDrop={() => handleDrop(col.key)}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-foreground">{col.label}</h3>
              <Badge variant="secondary" className="text-xs h-5">
                {tasksByStatus[col.key].length}
              </Badge>
            </div>
            {col.key === "not_started" && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCreateTask}>
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="space-y-2 min-h-[100px]">
            {tasksByStatus[col.key].map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => onTaskClick(task)}
                onDragStart={() => handleDragStart(task.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface TaskCardProps {
  task: TaskWithRelations;
  onClick: () => void;
  onDragStart: () => void;
}

function TaskCard({ task, onClick, onDragStart }: TaskCardProps) {
  const isOverdue =
    task.dueDate &&
    task.status !== "done" &&
    task.status !== "submitted" &&
    new Date(task.dueDate) < new Date();

  return (
    <Card
      className="p-3 cursor-pointer hover:shadow-md transition-shadow border-l-2"
      style={{ borderLeftColor: isOverdue ? "#ef4444" : "transparent" }}
      onClick={onClick}
      draggable
      onDragStart={onDragStart}
    >
      <div className="space-y-2">
        <p className="text-sm font-medium leading-tight line-clamp-2">{task.title}</p>

        <div className="flex items-center gap-1.5 flex-wrap">
          {task.priority !== "medium" && (
            <Badge className={`text-[10px] px-1.5 py-0 ${PRIORITY_COLORS[task.priority]}`}>
              {task.priority}
            </Badge>
          )}
          {task.area && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {task.area.replace(/_/g, " ")}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {task.dueDate && (
              <span className={`flex items-center gap-0.5 text-[11px] ${isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                {isOverdue && <AlertTriangle className="h-3 w-3" />}
                <Calendar className="h-3 w-3" />
                {formatDueDate(task.dueDate)}
              </span>
            )}
          </div>
          {task.assigneeName && (
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[9px] bg-primary/10">
                {task.assigneeName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>

        {task.subtaskCount > 0 && (
          <div className="text-[11px] text-muted-foreground">
            {task.subtasksDone}/{task.subtaskCount} subtasks
          </div>
        )}
      </div>
    </Card>
  );
}

function formatDueDate(date: string): string {
  const d = new Date(date + "T00:00:00");
  const now = new Date();
  const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff < -1) return `${Math.abs(diff)}d overdue`;
  if (diff <= 7) return `${diff}d`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
