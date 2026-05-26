"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Plus,
  Upload,
  ArrowLeft,
  Loader2,
  Trash2,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";

// ─── Types ───

interface EntitySummary {
  id: string;
  name: string;
  entityType: string;
  classification: string;
  location: { city: string; state: string; stateCode: string; county: string; region: string };
  isBuiltIn: boolean;
}

interface EntityFormData {
  id: string;
  name: string;
  entityType: string;
  classification: string;
  location: {
    city: string;
    state: string;
    stateCode: string;
    county: string;
    region: string;
  };
  characteristics: {
    cargoTypes: string[];
    annualTonnage: number;
    employeeCount: number;
    operatingBudget: number;
  };
  priorities: string[];
  capabilities: string[];
  needs: string[];
  certifications: string[];
  environmentalGoals: string[];
  communityImpact: string[];
}

const EMPTY_FORM: EntityFormData = {
  id: "",
  name: "",
  entityType: "",
  classification: "",
  location: { city: "", state: "", stateCode: "", county: "", region: "" },
  characteristics: { cargoTypes: [], annualTonnage: 0, employeeCount: 0, operatingBudget: 0 },
  priorities: [],
  capabilities: [],
  needs: [],
  certifications: [],
  environmentalGoals: [],
  communityImpact: [],
};

// ─── Page ───

export default function AdminEntitiesPage() {
  const [entities, setEntities] = useState<EntitySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "create">("list");
  const [form, setForm] = useState<EntityFormData>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchEntities = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/entities");
      if (res.ok) {
        const data = await res.json();
        setEntities(data.entities);
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchEntities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async () => {
    setError(null);
    setSaving(true);

    // Basic validation
    if (!form.id || !form.name || !form.entityType || !form.classification) {
      setError("ID, Name, Entity Type, and Classification are required.");
      setSaving(false);
      return;
    }
    if (!form.location.city || !form.location.state || !form.location.stateCode) {
      setError("City, State, and State Code are required.");
      setSaving(false);
      return;
    }
    if (!/^[a-z0-9-]+$/.test(form.id)) {
      setError("ID must be lowercase alphanumeric with hyphens only.");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create entity");
        setSaving(false);
        return;
      }

      setSuccess(`Entity "${form.name}" created successfully!`);
      setForm({ ...EMPTY_FORM });
      setView("list");
      fetchEntities();
    } catch {
      setError("Network error. Please try again.");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this entity?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/entities?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchEntities();
        setSuccess("Entity deleted.");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to delete");
      }
    } catch {
      setError("Network error.");
    }
    setDeleting(null);
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsing(true);
    setParseProgress(`Uploading ${file.name}...`);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      setParseProgress("Analyzing document with AI...");
      const res = await fetch("/api/admin/entities/parse-document", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to parse document");
        setParsing(false);
        setParseProgress(null);
        return;
      }

      const { extracted } = await res.json();

      // Generate slug from name
      const slug = extracted.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      // Pre-fill the form with extracted data
      setForm({
        id: slug,
        name: extracted.name,
        entityType: extracted.entityType,
        classification: extracted.classification,
        location: extracted.location,
        characteristics: extracted.characteristics,
        priorities: extracted.priorities || [],
        capabilities: extracted.capabilities || [],
        needs: extracted.needs || [],
        certifications: extracted.certifications || [],
        environmentalGoals: extracted.environmentalGoals || [],
        communityImpact: extracted.communityImpact || [],
      });

      setParseProgress(null);
      setSuccess(`Pre-filled from "${file.name}". Review and adjust before saving.`);
    } catch {
      setError("Failed to parse document. Please try again.");
    }
    setParsing(false);
    // Reset the file input
    e.target.value = "";
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {view === "create" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setView("list");
                setForm({ ...EMPTY_FORM });
                setError(null);
              }}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <h2 className="text-xl font-semibold">
            {view === "list" ? "Entity Profiles" : "Create Entity Profile"}
          </h2>
        </div>
        {view === "list" && (
          <Button
            size="sm"
            onClick={() => {
              setView("create");
              setError(null);
              setSuccess(null);
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            New Entity
          </Button>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900 px-4 py-3 text-sm text-green-700 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span className="flex-1">{success}</span>
          <button onClick={() => setSuccess(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {view === "list" ? (
        <EntityList entities={entities} onDelete={handleDelete} deleting={deleting} />
      ) : (
        <EntityForm
          form={form}
          setForm={setForm}
          onSave={handleCreate}
          saving={saving}
          parsing={parsing}
          parseProgress={parseProgress}
          onDocumentUpload={handleDocumentUpload}
        />
      )}
    </div>
  );
}

// ─── Entity List ───

function EntityList({
  entities,
  onDelete,
  deleting,
}: {
  entities: EntitySummary[];
  onDelete: (id: string) => void;
  deleting: string | null;
}) {
  if (entities.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Building2 className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">No entity profiles yet.</p>
      </Card>
    );
  }

  return (
    <div className="border rounded-lg divide-y">
      {entities.map((entity) => (
        <div key={entity.id} className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{entity.name}</span>
                {entity.isBuiltIn && (
                  <Badge variant="secondary" className="text-[10px]">
                    Built-in
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {entity.classification} &middot; {entity.location.city},{" "}
                {entity.location.stateCode} &middot;{" "}
                <span className="font-mono">{entity.id}</span>
              </span>
            </div>
          </div>
          {!entity.isBuiltIn && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(entity.id)}
              disabled={deleting === entity.id}
            >
              {deleting === entity.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Entity Form ───

function EntityForm({
  form,
  setForm,
  onSave,
  saving,
  parsing,
  parseProgress,
  onDocumentUpload,
}: {
  form: EntityFormData;
  setForm: (fn: EntityFormData | ((prev: EntityFormData) => EntityFormData)) => void;
  onSave: () => void;
  saving: boolean;
  parsing: boolean;
  parseProgress: string | null;
  onDocumentUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  // Helper for updating nested fields
  const updateField = (path: string, value: unknown) => {
    setForm((prev: EntityFormData) => {
      const updated = { ...prev };
      const parts = path.split(".");
      /* eslint-disable @typescript-eslint/no-explicit-any */
      let obj: any = updated;
      for (let i = 0; i < parts.length - 1; i++) {
        obj[parts[i]] = { ...obj[parts[i]] };
        obj = obj[parts[i]];
      }
      obj[parts[parts.length - 1]] = value;
      /* eslint-enable @typescript-eslint/no-explicit-any */
      return updated;
    });
  };

  // Helper for comma-separated list fields
  const handleListChange = (field: string, value: string) => {
    const items = value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    updateField(field, items);
  };

  return (
    <div className="space-y-5">
      {/* Document Upload */}
      <Card className="p-5 border-dashed">
        <div className="flex items-center gap-2 mb-3">
          <Upload className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Quick Start: Upload a Document</h3>
          <Badge variant="secondary" className="text-[10px] ml-auto">
            Optional
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Upload an ACFR, financial report, strategic plan, or other organizational document.
          AI will extract relevant data to pre-fill the form below.
        </p>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer rounded-md border px-3 py-2 text-sm hover:bg-muted transition-colors">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span>{parsing ? "Processing..." : "Choose File"}</span>
            <input
              type="file"
              accept=".pdf,.txt,.doc,.docx"
              onChange={onDocumentUpload}
              disabled={parsing}
              className="sr-only"
            />
          </label>
          {parsing && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>{parseProgress}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Basic Info */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-4">Basic Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <label className="text-xs text-muted-foreground block mb-1">
              Entity ID <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.id}
              onChange={(e) => updateField("id", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="e.g., port-of-seattle"
              className="text-sm font-mono"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Lowercase, hyphens only. Used as the unique identifier.
            </p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="text-xs text-muted-foreground block mb-1">
              Entity Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="e.g., Port of Seattle"
              className="text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              Entity Type <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.entityType}
              onChange={(e) => updateField("entityType", e.target.value)}
              placeholder="e.g., Special district government"
              className="text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              Classification <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.classification}
              onChange={(e) => updateField("classification", e.target.value)}
              placeholder="e.g., Public Port Authority"
              className="text-sm"
            />
          </div>
        </div>
      </Card>

      {/* Location */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-4">Location</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              City <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.location.city}
              onChange={(e) => updateField("location.city", e.target.value)}
              placeholder="Seattle"
              className="text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              State <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.location.state}
              onChange={(e) => updateField("location.state", e.target.value)}
              placeholder="Washington"
              className="text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              State Code <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.location.stateCode}
              onChange={(e) =>
                updateField("location.stateCode", e.target.value.toUpperCase().slice(0, 2))
              }
              placeholder="WA"
              maxLength={2}
              className="text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">County</label>
            <Input
              value={form.location.county}
              onChange={(e) => updateField("location.county", e.target.value)}
              placeholder="King County"
              className="text-sm"
            />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground block mb-1">Region</label>
            <Input
              value={form.location.region}
              onChange={(e) => updateField("location.region", e.target.value)}
              placeholder="e.g., Pacific Northwest, Gulf Coast"
              className="text-sm"
            />
          </div>
        </div>
      </Card>

      {/* Characteristics */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-4">Operational Characteristics</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground block mb-1">
              Cargo/Service Types
            </label>
            <Input
              value={form.characteristics.cargoTypes.join(", ")}
              onChange={(e) => handleListChange("characteristics.cargoTypes", e.target.value)}
              placeholder="Container, Bulk, Breakbulk, Liquid Bulk"
              className="text-sm"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Comma-separated</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              Annual Tonnage
            </label>
            <Input
              type="number"
              value={form.characteristics.annualTonnage || ""}
              onChange={(e) =>
                updateField("characteristics.annualTonnage", Number(e.target.value) || 0)
              }
              placeholder="0"
              className="text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Employee Count</label>
            <Input
              type="number"
              value={form.characteristics.employeeCount || ""}
              onChange={(e) =>
                updateField("characteristics.employeeCount", Number(e.target.value) || 0)
              }
              placeholder="0"
              className="text-sm"
            />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground block mb-1">
              Operating Budget ($)
            </label>
            <Input
              type="number"
              value={form.characteristics.operatingBudget || ""}
              onChange={(e) =>
                updateField("characteristics.operatingBudget", Number(e.target.value) || 0)
              }
              placeholder="0"
              className="text-sm"
            />
          </div>
        </div>
      </Card>

      {/* Strategic Info */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-4">Strategic Information</h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              Strategic Priorities
            </label>
            <textarea
              value={form.priorities.join("\n")}
              onChange={(e) =>
                updateField(
                  "priorities",
                  e.target.value.split("\n").filter((s) => s.trim())
                )
              }
              placeholder={"Port infrastructure modernization\nZero-emission equipment\nIntermodal connectivity"}
              rows={4}
              className="w-full rounded-md border px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-[10px] text-muted-foreground mt-1">One per line</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Capabilities</label>
            <textarea
              value={form.capabilities.join("\n")}
              onChange={(e) =>
                updateField(
                  "capabilities",
                  e.target.value.split("\n").filter((s) => s.trim())
                )
              }
              placeholder={"Deep-water port operations\nContainer terminal operations\nBulk cargo handling"}
              rows={3}
              className="w-full rounded-md border px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-[10px] text-muted-foreground mt-1">One per line</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              Infrastructure / Operational Needs
            </label>
            <textarea
              value={form.needs.join("\n")}
              onChange={(e) =>
                updateField(
                  "needs",
                  e.target.value.split("\n").filter((s) => s.trim())
                )
              }
              placeholder={"Port electrification\nBerth deepening\nGate automation"}
              rows={3}
              className="w-full rounded-md border px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-[10px] text-muted-foreground mt-1">One per line</p>
          </div>
        </div>
      </Card>

      {/* Environmental & Community */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-4">Environmental & Community</h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              Certifications
            </label>
            <Input
              value={form.certifications.join(", ")}
              onChange={(e) => handleListChange("certifications", e.target.value)}
              placeholder="Green Marine certified, ISO 14001, OSHA"
              className="text-sm"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Comma-separated</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              Environmental Goals
            </label>
            <textarea
              value={form.environmentalGoals.join("\n")}
              onChange={(e) =>
                updateField(
                  "environmentalGoals",
                  e.target.value.split("\n").filter((s) => s.trim())
                )
              }
              placeholder={"Reduce diesel emissions\nTransition to zero-emission equipment\nCoastal resilience"}
              rows={3}
              className="w-full rounded-md border px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-[10px] text-muted-foreground mt-1">One per line</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              Community Impact
            </label>
            <textarea
              value={form.communityImpact.join("\n")}
              onChange={(e) =>
                updateField(
                  "communityImpact",
                  e.target.value.split("\n").filter((s) => s.trim())
                )
              }
              placeholder={"Job creation\nEconomic development\nEnvironmental justice"}
              rows={3}
              className="w-full rounded-md border px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-[10px] text-muted-foreground mt-1">One per line</p>
          </div>
        </div>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-3 pb-8">
        <Button
          variant="outline"
          onClick={() => {
            setForm({ ...EMPTY_FORM });
          }}
        >
          Reset
        </Button>
        <Button onClick={onSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
          Create Entity
        </Button>
      </div>
    </div>
  );
}
