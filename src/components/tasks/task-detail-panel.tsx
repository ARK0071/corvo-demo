"use client";

import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Trash2, Send, ExternalLink, Loader2 } from "lucide-react";
import type { TaskWithRelations } from "@/lib/db/repositories/tasks";

interface TeamMember {
  id: string;
  name: string;
  email: string;
}

interface Comment {
  id: string;
  userId: string;
  userName: string;
  body: string;
  createdAt: string;
}

interface TaskDetailPanelProps {
  task: TaskWithRelations | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (taskId: string, updates: Record<string, unknown>) => void;
  onDelete: (taskId: string) => void;
  teamMembers: TeamMember[];
  tenantHeaders: Record<string, string>;
}

const STATUS_OPTIONS = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "blocked", label: "Blocked" },
  { value: "in_review", label: "In Review" },
  { value: "submitted", label: "Submitted" },
  { value: "done", label: "Done" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const AREAS = [
  { value: "financial_reporting", label: "Financial Reporting" },
  { value: "performance_reporting", label: "Performance Reporting" },
  { value: "buy_america", label: "Buy America / BABA" },
  { value: "dbe", label: "DBE / Title VI" },
  { value: "davis_bacon", label: "Davis-Bacon" },
  { value: "environmental", label: "Environmental / NEPA" },
  { value: "ffata", label: "FFATA / FSRS" },
  { value: "single_audit", label: "Single Audit" },
  { value: "subrecipient_monitoring", label: "Subrecipient Monitoring" },
  { value: "closeout", label: "Closeout" },
  { value: "general", label: "General" },
];

export function TaskDetailPanel({
  task,
  open,
  onClose,
  onUpdate,
  onDelete,
  teamMembers,
  tenantHeaders,
}: TaskDetailPanelProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);

  useEffect(() => {
    if (task && open) {
      fetchComments(task.id);
    }
  }, [task?.id, open]);

  async function fetchComments(taskId: string) {
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, { headers: tenantHeaders });
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch { /* ignore */ }
    setLoadingComments(false);
  }

  async function handleAddComment() {
    if (!task || !newComment.trim()) return;
    try {
      const res = await fetch(`/api/tasks/${task.id}/comments`, {
        method: "POST",
        headers: { ...tenantHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ body: newComment }),
      });
      if (res.ok) {
        const comment = await res.json();
        setComments((prev) => [...prev, comment]);
        setNewComment("");
      }
    } catch { /* ignore */ }
  }

  if (!task) return null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left pr-8">{task.title}</SheetTitle>
          {task.awardProgram && (
            <Badge variant="outline" className="w-fit">{task.awardProgram}</Badge>
          )}
        </SheetHeader>

        <div className="space-y-4 mt-6">
          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select
                value={task.status}
                onValueChange={(v) => onUpdate(task.id, { status: v })}
              >
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Priority</Label>
              <Select
                value={task.priority}
                onValueChange={(v) => onUpdate(task.id, { priority: v })}
              >
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assignee + Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Assignee</Label>
              <Select
                value={task.assigneeId || "unassigned"}
                onValueChange={(v) => onUpdate(task.id, { assigneeId: v === "unassigned" ? null : v })}
              >
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {teamMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Due Date</Label>
              <Input
                type="date"
                className="mt-1"
                value={task.dueDate || ""}
                onChange={(e) => onUpdate(task.id, { dueDate: e.target.value || null })}
              />
            </div>
          </div>

          {/* Area */}
          <div>
            <Label className="text-xs text-muted-foreground">Compliance Area</Label>
            <Select
              value={task.area || "none"}
              onValueChange={(v) => onUpdate(task.id, { area: v === "none" ? null : v })}
            >
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {AREAS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          {task.description && (
            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <p className="text-sm mt-1 text-foreground whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {/* Deliverable link */}
          {task.deliverableRef && (
            <div>
              <Label className="text-xs text-muted-foreground">Linked Deliverable</Label>
              <a
                href={task.deliverableRef}
                className="flex items-center gap-1 text-sm text-primary hover:underline mt-1"
              >
                <ExternalLink className="h-3 w-3" />
                Open {task.deliverableType?.replace(/_/g, " ") || "deliverable"}
              </a>
            </div>
          )}

          {/* Metadata */}
          <div className="text-xs text-muted-foreground space-y-0.5">
            {task.creatorName && <p>Created by {task.creatorName}</p>}
            <p>Created {new Date(task.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
            {task.source !== "manual" && <p>Source: {task.source}</p>}
          </div>

          <Separator />

          {/* Comments */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">
              Activity ({comments.length})
            </Label>

            {loadingComments ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-2">
                    <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                      <AvatarFallback className="text-[9px]">
                        {c.userName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-medium">{c.userName}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground mt-0.5">{c.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 mt-3">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="text-sm"
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAddComment()}
              />
              <Button size="icon" variant="ghost" onClick={handleAddComment} disabled={!newComment.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Delete */}
          <Button
            variant="ghost"
            className="text-red-600 hover:text-red-700 hover:bg-red-50 w-full justify-start"
            onClick={() => {
              if (confirm("Delete this task? This cannot be undone.")) {
                onDelete(task.id);
                onClose();
              }
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Task
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
