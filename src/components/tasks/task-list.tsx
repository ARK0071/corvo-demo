"use client";

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, AlertTriangle, MessageSquare, CheckSquare } from "lucide-react";
import type { TaskWithRelations } from "@/lib/db/repositories/tasks";

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  not_started: { label: "Not Started", className: "bg-slate-100 text-slate-700" },
  in_progress: { label: "In Progress", className: "bg-blue-100 text-blue-700" },
  blocked: { label: "Blocked", className: "bg-red-100 text-red-700" },
  in_review: { label: "In Review", className: "bg-amber-100 text-amber-700" },
  submitted: { label: "Submitted", className: "bg-purple-100 text-purple-700" },
  done: { label: "Done", className: "bg-emerald-100 text-emerald-700" },
};

const PRIORITY_DOT: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-slate-400",
};

interface TaskListProps {
  tasks: TaskWithRelations[];
  onTaskClick: (task: TaskWithRelations) => void;
  showAward?: boolean;
}

export function TaskList({ tasks, onTaskClick, showAward = false }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No tasks found</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {tasks.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          onClick={() => onTaskClick(task)}
          showAward={showAward}
        />
      ))}
    </div>
  );
}

interface TaskRowProps {
  task: TaskWithRelations;
  onClick: () => void;
  showAward: boolean;
}

function TaskRow({ task, onClick, showAward }: TaskRowProps) {
  const isOverdue =
    task.dueDate &&
    task.status !== "done" &&
    task.status !== "submitted" &&
    new Date(task.dueDate) < new Date();

  const statusBadge = STATUS_BADGES[task.status] || STATUS_BADGES.not_started;

  return (
    <div
      className="flex items-center gap-3 py-3 px-4 hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={onClick}
    >
      {/* Priority dot */}
      <div className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[task.priority]}`} />

      {/* Title + metadata */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-medium truncate ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
            {task.title}
          </p>
          {task.commentCount > 0 && (
            <span className="flex items-center gap-0.5 text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              <span className="text-[11px]">{task.commentCount}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {showAward && task.awardProgram && (
            <span className="text-[11px] text-muted-foreground">{task.awardProgram}</span>
          )}
          {task.area && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
              {task.area.replace(/_/g, " ")}
            </Badge>
          )}
        </div>
      </div>

      {/* Status */}
      <Badge className={`text-[10px] px-2 py-0.5 shrink-0 ${statusBadge.className}`}>
        {statusBadge.label}
      </Badge>

      {/* Due date */}
      <div className="w-24 shrink-0 text-right">
        {task.dueDate && (
          <span className={`flex items-center justify-end gap-1 text-xs ${isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
            {isOverdue && <AlertTriangle className="h-3 w-3" />}
            <Calendar className="h-3 w-3" />
            {new Date(task.dueDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        )}
      </div>

      {/* Assignee */}
      <div className="w-8 shrink-0">
        {task.assigneeName && (
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-[10px] bg-primary/10">
              {task.assigneeName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  );
}
