"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TeamMember {
  id: string;
  name: string;
  email: string;
}

interface TaskCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: TaskFormData) => void;
  teamMembers: TeamMember[];
  awardId?: string;
}

export interface TaskFormData {
  title: string;
  description: string;
  priority: string;
  status: string;
  dueDate: string;
  assigneeId: string;
  area: string;
}

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

export function TaskCreateDialog({ open, onClose, onSubmit, teamMembers, awardId }: TaskCreateDialogProps) {
  const [form, setForm] = useState<TaskFormData>({
    title: "",
    description: "",
    priority: "medium",
    status: "not_started",
    dueDate: "",
    assigneeId: "",
    area: "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSubmit(form);
    setForm({ title: "", description: "", priority: "medium", status: "not_started", dueDate: "", assigneeId: "", area: "" });
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., Complete Q1 SF-425 financial report"
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional details..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Due Date</Label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Assignee</Label>
              <Select value={form.assigneeId} onValueChange={(v) => setForm({ ...form, assigneeId: v })}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  {teamMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Compliance Area</Label>
              <Select value={form.area} onValueChange={(v) => setForm({ ...form, area: v })}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  {AREAS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={!form.title.trim()}>Create Task</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
