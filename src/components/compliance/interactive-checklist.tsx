"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Check,
  BookOpen,
  Trash2,
  Loader2,
  Plus,
  Star,
  CheckCircle2,
  ClipboardList,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

// ─── Types ───

export interface ChecklistItem {
  id: string;
  section: string;
  requirement: string;
  cfrReference: string | null;
  isCompleted: boolean;
  completedAt: string | null;
  completedBy: string | null;
  notes: string;
  sortOrder: number;
}

export interface ChecklistFull {
  id: string;
  template: string;
  title: string;
  status: string;
  completedItems: number;
  totalItems: number;
  award: { title: string; program: string };
  items: ChecklistItem[];
}

export interface AwardOption {
  id: string;
  title: string;
  program: string;
  awardingAgency: string;
  budgetCategoryNames: string[];
  existingTemplates: string[];
}

export interface TemplateOption {
  key: string;
  title: string;
  itemCount: number;
}

// ─── Constants ───

const BABA_PROGRAMS = ["PIDP", "CRISI", "INFRA", "RAISE", "Mega"];
const DOT_AGENCIES = ["MARAD", "FRA", "FTA", "FHWA", "FAA"];

function isTemplateRecommended(template: string, award: AwardOption): boolean {
  if (template === "buy_america") return BABA_PROGRAMS.some(p => award.program.includes(p));
  if (template === "davis_bacon") return award.budgetCategoryNames.some(n => n.toLowerCase().includes("construction"));
  if (template === "nepa") return true;
  if (template === "title_vi_dbe") return DOT_AGENCIES.some(a => award.awardingAgency.includes(a));
  return false;
}

// ─── Component ───

interface InteractiveChecklistProps {
  checklists: ChecklistFull[];
  headers: Record<string, string>;
  onRefresh: () => void;
  /** If provided, limits the Attach dialog to this single award (skips award selector) */
  fixedAwardId?: string;
}

export function InteractiveChecklist({ checklists, headers, onRefresh, fixedAwardId }: InteractiveChecklistProps) {
  const [expandedChecklists, setExpandedChecklists] = useState<Set<string>>(new Set());
  const [showAttachDialog, setShowAttachDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; label: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Attach dialog state
  const [awardOptions, setAwardOptions] = useState<AwardOption[]>([]);
  const [templateOptions, setTemplateOptions] = useState<TemplateOption[]>([]);
  const [checklistForm, setChecklistForm] = useState({ awardId: fixedAwardId || "", template: "" });

  const h = () => ({ ...headers, "Content-Type": "application/json" });

  const toggleChecklist = (id: string) => {
    setExpandedChecklists(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleItem = async (itemId: string, completed: boolean) => {
    try {
      await fetch("/api/compliance", {
        method: "PUT",
        headers: h(),
        body: JSON.stringify({ action: "toggleItem", itemId, completed }),
      });
      onRefresh();
    } catch { /* */ }
  };

  const fetchAwardsAndTemplates = async () => {
    try {
      const res = await fetch("/api/compliance?section=awards", { headers: h() });
      if (res.ok) {
        const d = await res.json();
        setAwardOptions(d.awards || []);
        setTemplateOptions(d.templates || []);
        if (fixedAwardId) {
          setChecklistForm(p => ({ ...p, awardId: fixedAwardId }));
        }
      }
    } catch { /* */ }
  };

  const handleAttach = async () => {
    if (!checklistForm.awardId || !checklistForm.template) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/compliance", {
        method: "POST",
        headers: h(),
        body: JSON.stringify({ action: "createChecklist", awardId: checklistForm.awardId, template: checklistForm.template }),
      });
      if (res.ok) {
        setShowAttachDialog(false);
        setChecklistForm({ awardId: fixedAwardId || "", template: "" });
        onRefresh();
      }
    } catch { /* */ }
    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/compliance?entity=checklist&id=${deleteConfirm.id}`, { method: "DELETE", headers: h() });
      if (res.ok) { setDeleteConfirm(null); onRefresh(); }
    } catch { /* */ }
    setSubmitting(false);
  };

  const selectedAward = awardOptions.find(a => a.id === checklistForm.awardId);

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{checklists.length} active</Badge>
        </div>
        <Button size="sm" onClick={() => { setShowAttachDialog(true); fetchAwardsAndTemplates(); }}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Attach Checklist
        </Button>
      </div>

      {checklists.length === 0 ? (
        <div className="text-center py-8">
          <ClipboardList className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">No compliance checklists attached</p>
          <p className="text-xs text-muted-foreground mt-1">Click &quot;Attach Checklist&quot; to add a regulatory checklist</p>
        </div>
      ) : (
        <div className="space-y-3">
          {checklists.map((cl) => {
            const pct = cl.totalItems > 0 ? Math.round((cl.completedItems / cl.totalItems) * 100) : 0;
            const isExpanded = expandedChecklists.has(cl.id);
            const groupedItems = cl.items?.reduce<Record<string, ChecklistItem[]>>((acc, item) => {
              (acc[item.section] = acc[item.section] || []).push(item);
              return acc;
            }, {}) || {};

            return (
              <div key={cl.id} className="rounded-lg border">
                <button
                  onClick={() => toggleChecklist(cl.id)}
                  className="flex items-center gap-3 p-4 w-full text-left hover:bg-muted/50 transition-colors rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium">{cl.title}</p>
                        <p className="text-xs text-muted-foreground">{cl.award.program} — {cl.award.title}</p>
                      </div>
                      <Badge className={cl.status === "compliant" ? "bg-emerald-100 text-emerald-700" : cl.status === "non_compliant" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}>
                        {cl.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${pct === 100 ? "bg-emerald-500" : "bg-[#3d8b8b]"}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs tabular-nums text-muted-foreground">{cl.completedItems}/{cl.totalItems}</span>
                    </div>
                  </div>
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-4">
                    <div className="border-t pt-3 flex items-center justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground hover:text-red-600"
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ id: cl.id, label: cl.title }); }}
                      >
                        <Trash2 className="h-3 w-3 mr-1" /> Remove Checklist
                      </Button>
                    </div>
                    {Object.entries(groupedItems).map(([section, items]) => (
                      <div key={section}>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{section}</p>
                        <div className="space-y-1">
                          {items.map((item) => (
                            <div key={item.id} className={`flex items-start gap-3 p-2.5 rounded-md border transition-colors ${item.isCompleted ? "bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-800/30" : "hover:bg-muted/50"}`}>
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleItem(item.id, !item.isCompleted); }}
                                className={`mt-0.5 shrink-0 h-4 w-4 rounded border flex items-center justify-center transition-colors ${item.isCompleted ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-300 hover:border-[#3d8b8b]"}`}
                              >
                                {item.isCompleted && <Check className="h-3 w-3" />}
                              </button>
                              <div className="min-w-0 flex-1">
                                <p className={`text-xs ${item.isCompleted ? "line-through text-muted-foreground" : ""}`}>{item.requirement}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {item.cfrReference && (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                                      <BookOpen className="h-2.5 w-2.5" /> {item.cfrReference}
                                    </span>
                                  )}
                                  {item.isCompleted && item.completedBy && (
                                    <span className="text-[10px] text-emerald-600">by {item.completedBy} on {item.completedAt ? new Date(item.completedAt).toLocaleDateString() : ""}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Attach Checklist Dialog */}
      <Dialog open={showAttachDialog} onOpenChange={setShowAttachDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Attach Compliance Checklist</DialogTitle>
            <DialogDescription>Select a regulatory checklist template. Templates are recommended based on the award&apos;s program and characteristics.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!fixedAwardId && (
              <div className="space-y-1.5">
                <Label>Award</Label>
                <Select value={checklistForm.awardId || "placeholder"} onValueChange={val => setChecklistForm(p => ({ ...p, awardId: val === "placeholder" ? "" : val, template: "" }))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select an award" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="placeholder" disabled>Select an award</SelectItem>
                    {awardOptions.map(a => <SelectItem key={a.id} value={a.id}>{a.program}: {a.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {selectedAward && (
              <div className="space-y-1.5">
                <Label>Template</Label>
                <div className="space-y-2">
                  {templateOptions.map(t => {
                    const alreadyAttached = selectedAward.existingTemplates.includes(t.key);
                    const recommended = isTemplateRecommended(t.key, selectedAward);
                    const isSelected = checklistForm.template === t.key;
                    return (
                      <button
                        key={t.key}
                        disabled={alreadyAttached}
                        onClick={() => setChecklistForm(p => ({ ...p, template: t.key }))}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                          alreadyAttached ? "opacity-50 cursor-not-allowed border-muted" :
                          isSelected ? "border-[#3d8b8b] bg-[#3d8b8b]/5" :
                          "border-transparent hover:border-border hover:bg-muted/50"
                        } ${!alreadyAttached && !isSelected ? "border-muted" : ""}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{t.title}</p>
                            <p className="text-xs text-muted-foreground">{t.itemCount} requirements</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {recommended && !alreadyAttached && (
                              <Badge className="bg-amber-100 text-amber-700 text-[10px]">
                                <Star className="h-2.5 w-2.5 mr-0.5" /> Recommended
                              </Badge>
                            )}
                            {alreadyAttached && <Badge variant="outline" className="text-[10px]">Already attached</Badge>}
                            {isSelected && <CheckCircle2 className="h-4 w-4 text-[#3d8b8b]" />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAttachDialog(false)}>Cancel</Button>
            <Button onClick={handleAttach} disabled={submitting || !checklistForm.awardId || !checklistForm.template}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
              Attach Checklist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>Are you sure you want to delete this checklist and all its items?</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm font-medium truncate">{deleteConfirm?.label}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
