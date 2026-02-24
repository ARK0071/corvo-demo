"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X } from "lucide-react";
import type { Project, ProjectStatus, ProjectPriority, ProjectType } from "@/data/projects";

interface ProjectFormProps {
  project?: Project;
  onSave: (project: Omit<Project, "id" | "createdAt" | "updatedAt">) => void;
  onCancel: () => void;
}

const PROJECT_TYPES: ProjectType[] = [
  "infrastructure",
  "equipment",
  "environmental",
  "security",
  "technology",
  "maintenance",
  "expansion",
  "resilience",
  "other",
];

const PROJECT_STATUSES: ProjectStatus[] = [
  "planning",
  "design",
  "procurement",
  "construction",
  "completed",
  "on_hold",
];

const PROJECT_PRIORITIES: ProjectPriority[] = ["critical", "high", "medium", "low"];

const COMMON_FOCUS_AREAS = [
  "zero-emission equipment",
  "infrastructure modernization",
  "terminal expansion",
  "rail infrastructure",
  "channel deepening",
  "crane upgrades",
  "security systems",
  "resilience",
  "environmental compliance",
  "intermodal connectivity",
  "warehouse expansion",
  "paving",
  "dredging",
  "wharf improvements",
];

export function ProjectForm({ project, onSave, onCancel }: ProjectFormProps) {
  const [name, setName] = useState(project?.name || "");
  const [description, setDescription] = useState(project?.description || "");
  const [focusAreas, setFocusAreas] = useState<string[]>(project?.focusAreas || []);
  const [budget, setBudget] = useState(project?.budget?.toString() || "");
  const [startDate, setStartDate] = useState(
    project?.startDate ? project.startDate.split("T")[0] : ""
  );
  const [endDate, setEndDate] = useState(
    project?.endDate ? project.endDate.split("T")[0] : ""
  );
  const [location, setLocation] = useState(project?.location || "");
  const [projectType, setProjectType] = useState<ProjectType>(
    project?.projectType || "infrastructure"
  );
  const [status, setStatus] = useState<ProjectStatus>(project?.status || "planning");
  const [priority, setPriority] = useState<ProjectPriority>(
    project?.priority || "medium"
  );
  const [notes, setNotes] = useState(project?.notes || "");
  const [customFocusArea, setCustomFocusArea] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !description.trim()) {
      alert("Please fill in required fields (name and description)");
      return;
    }

    const budgetNum = parseFloat(budget.replace(/,/g, "")) || 0;

    onSave({
      name: name.trim(),
      description: description.trim(),
      focusAreas,
      budget: budgetNum,
      startDate: startDate || null,
      endDate: endDate || null,
      location: location.trim(),
      projectType,
      status,
      priority,
      notes: notes.trim() || undefined,
    });
  };

  const toggleFocusArea = (area: string) => {
    setFocusAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  const addCustomFocusArea = () => {
    if (customFocusArea.trim() && !focusAreas.includes(customFocusArea.trim())) {
      setFocusAreas((prev) => [...prev, customFocusArea.trim()]);
      setCustomFocusArea("");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">
              {project ? "Edit Project" : "Add New Project"}
            </h2>
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Project Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Description *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                required
              />
            </div>

            {/* Focus Areas */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Focus Areas</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {COMMON_FOCUS_AREAS.map((area) => (
                  <button
                    key={area}
                    type="button"
                    onClick={() => toggleFocusArea(area)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      focusAreas.includes(area)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {area}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customFocusArea}
                  onChange={(e) => setCustomFocusArea(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomFocusArea())}
                  placeholder="Add custom focus area"
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <Button type="button" variant="outline" size="sm" onClick={addCustomFocusArea}>
                  Add
                </Button>
              </div>
              {focusAreas.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {focusAreas.map((area) => (
                    <span
                      key={area}
                      className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary px-2 py-1 text-xs"
                    >
                      {area}
                      <button
                        type="button"
                        onClick={() => toggleFocusArea(area)}
                        className="hover:text-primary/80"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Budget */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Budget ($)</label>
              <input
                type="text"
                value={budget}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.]/g, "");
                  setBudget(val);
                }}
                placeholder="0"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {/* Timeline */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Terminal 1, Berth 3"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {/* Project Type, Status, Priority */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Type</label>
                <select
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value as ProjectType)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {PROJECT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {PROJECT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as ProjectPriority)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {PROJECT_PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Additional notes..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                {project ? "Update Project" : "Create Project"}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
