"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import type { Project } from "@/data/projects";

interface ProjectFormProps {
  project?: Project;
  onSave: (data: Omit<Project, "id">) => void;
  onCancel: () => void;
}

const PROJECT_TYPES = [
  "infrastructure",
  "expansion",
  "equipment",
  "security",
  "resilience",
  "environmental",
  "technology",
  "other",
];

const STATUSES: Project["status"][] = [
  "planning",
  "design",
  "procurement",
  "construction",
  "completed",
  "on_hold",
];

const PRIORITIES: Project["priority"][] = ["critical", "high", "medium", "low"];

const COMMON_FOCUS_AREAS = [
  "Port infrastructure",
  "Channel deepening",
  "Container terminal",
  "Zero-emission equipment",
  "Electrification",
  "Shore power",
  "Rail infrastructure",
  "Intermodal connectivity",
  "Climate resilience",
  "Port security",
  "Cybersecurity",
  "Environmental sustainability",
  "Freight movement",
  "Supply chain",
  "Stormwater management",
  "Air quality",
  "Workforce development",
];

export function ProjectForm({ project, onSave, onCancel }: ProjectFormProps) {
  const [name, setName] = useState(project?.name || "");
  const [description, setDescription] = useState(project?.description || "");
  const [projectType, setProjectType] = useState(project?.projectType || "infrastructure");
  const [status, setStatus] = useState<Project["status"]>(project?.status || "planning");
  const [priority, setPriority] = useState<Project["priority"]>(project?.priority || "medium");
  const [budget, setBudget] = useState(project?.budget?.toString() || "");
  const [location, setLocation] = useState(project?.location || "");
  const [startDate, setStartDate] = useState(project?.startDate || "");
  const [endDate, setEndDate] = useState(project?.endDate || "");
  const [focusAreas, setFocusAreas] = useState<string[]>(project?.focusAreas || []);
  const [notes, setNotes] = useState(project?.notes || "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      name: name.trim(),
      description: description.trim(),
      projectType,
      status,
      priority,
      budget: parseFloat(budget) || 0,
      location: location.trim() || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      focusAreas,
      notes: notes.trim() || undefined,
    });
  }

  function toggleFocusArea(area: string) {
    setFocusAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  }

  const inputCls = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {project ? "Edit Project" : "New Project"}
          </h2>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Project Name *</label>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Description</label>
            <textarea className={`${inputCls} min-h-[80px]`} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Type</label>
              <select className={inputCls} value={projectType} onChange={(e) => setProjectType(e.target.value)}>
                {PROJECT_TYPES.map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Status</label>
              <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as Project["status"])}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Priority</label>
              <select className={inputCls} value={priority} onChange={(e) => setPriority(e.target.value as Project["priority"])}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Budget ($)</label>
              <input className={inputCls} type="number" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Start Date</label>
              <input className={inputCls} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">End Date</label>
              <input className={inputCls} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Location</label>
            <input className={inputCls} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., Velasco Terminal" />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Focus Areas</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {COMMON_FOCUS_AREAS.map((area) => (
                <Badge
                  key={area}
                  variant={focusAreas.includes(area) ? "default" : "outline"}
                  className="cursor-pointer text-[10px]"
                  onClick={() => toggleFocusArea(area)}
                >
                  {area}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Notes</label>
            <textarea className={`${inputCls} min-h-[60px]`} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            <Button type="submit" disabled={!name.trim()}>
              {project ? "Update Project" : "Create Project"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
