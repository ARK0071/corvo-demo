"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Upload,
  Loader2,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Anchor,
  Users,
  Shield,
  Mail,
} from "lucide-react";
import { type GrantProgram, addGrant, getNextGrantId } from "@/data/grants";
import { type PortVendor, addPortVendors } from "@/data/port-vendors";
import { scoreVendorsForGrant, type GrantVendorMatch } from "@/data/matches";
import { OutreachEmail } from "@/components/grant-match/outreach-email";

type Step = "paste" | "review" | "results";

interface ExtractedGrant {
  name: string;
  shortName: string;
  agency: string;
  description: string;
  totalFunding: number;
  minAward: number;
  maxAward: number;
  matchRequirement: number;
  eligibleActivities: string[];
  deadline: string;
  status: "open" | "upcoming" | "closed";
  applicationUrl: string;
  focusAreas: string[];
}

function formatCurrency(n: number) {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n}`;
}

const sectorColors: Record<string, string> = {
  "Marine Construction": "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  "Heavy Civil/Infrastructure": "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  "Environmental/Remediation": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  "Marine Equipment/Cranes": "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  "Electrical/Power": "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  "Engineering/Design": "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  "Security/IT": "bg-red-500/10 text-red-600 dark:text-red-400",
  "Sustainability/Clean Energy": "bg-green-500/10 text-green-600 dark:text-green-400",
};

const recColors: Record<string, string> = {
  strong_match: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  good_match: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  partial_match: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  weak_match: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
};

export default function GrantUploadPage() {
  const [step, setStep] = useState<Step>("paste");
  const [rawText, setRawText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedGrant | null>(null);
  const [matches, setMatches] = useState<GrantVendorMatch[]>([]);
  const [savedGrant, setSavedGrant] = useState<GrantProgram | null>(null);
  const [searchingVendors, setSearchingVendors] = useState(false);
  const [vendors, setVendors] = useState<PortVendor[]>([]);
  const [expandedVendors, setExpandedVendors] = useState<Set<string>>(new Set());
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set());

  async function handleExtract() {
    if (!rawText.trim()) return;
    setExtracting(true);
    setError(null);

    try {
      const res = await fetch("/api/extract-grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to extract grant information");
      }

      const data: ExtractedGrant = await res.json();
      setExtracted(data);
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setExtracting(false);
    }
  }

  async function handleFindVendors() {
    if (!extracted) return;
    setSearchingVendors(true);
    setError(null);

    try {
      // Search USASpending.gov for relevant vendors
      const res = await fetch("/api/sam-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          focusAreas: extracted.focusAreas,
          eligibleActivities: extracted.eligibleActivities,
          maxPages: 5,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to search for federal vendors");
      }

      const { vendors: samVendors } = await res.json() as { vendors: PortVendor[]; totalRecords: number };

      if (samVendors.length === 0) {
        throw new Error("No federal vendors found for this grant's focus areas. Try broadening the grant's eligible activities.");
      }

      // Persist vendors in the data layer
      addPortVendors(samVendors);
      setVendors(samVendors);

      // Create and persist the grant
      const grantId = getNextGrantId();
      const grant: GrantProgram = { id: grantId, ...extracted };
      addGrant(grant);

      // Score all found vendors against this grant
      const newMatches = scoreVendorsForGrant(samVendors, grant);
      newMatches.sort((a, b) => b.overallScore - a.overallScore);

      setSavedGrant(grant);
      setMatches(newMatches);
      setStep("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSearchingVendors(false);
    }
  }

  function handleStartOver() {
    setStep("paste");
    setRawText("");
    setExtracted(null);
    setMatches([]);
    setSavedGrant(null);
    setError(null);
    setVendors([]);
    setExpandedVendors(new Set());
    setExpandedEmails(new Set());
  }

  function toggleVendor(id: string) {
    setExpandedVendors((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleEmail(id: string) {
    setExpandedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function updateField(field: keyof ExtractedGrant, value: unknown) {
    if (!extracted) return;
    setExtracted({ ...extracted, [field]: value });
  }

  const topMatches = matches.slice(0, 20);
  const strongCount = matches.filter((m) => m.recommendation === "strong_match").length;
  const goodCount = matches.filter((m) => m.recommendation === "good_match").length;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Upload className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Grant Upload</h1>
            <p className="text-sm text-muted-foreground">
              Paste a grant notice to extract details, match vendors, and generate outreach
            </p>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-8">
          {(["paste", "review", "results"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              <div
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                  step === s
                    ? "bg-primary text-primary-foreground"
                    : (["paste", "review", "results"].indexOf(step) > i
                      ? "bg-green-500/10 text-green-600 dark:text-green-400"
                      : "bg-muted text-muted-foreground")
                }`}
              >
                {["paste", "review", "results"].indexOf(step) > i && (
                  <CheckCircle2 className="h-3 w-3" />
                )}
                {s === "paste" ? "1. Paste" : s === "review" ? "2. Review" : "3. Results"}
              </div>
            </div>
          ))}
        </div>

        {/* Step 1: Paste */}
        {step === "paste" && (
          <div>
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-2">Paste Grant Notice</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Paste the full text of a grant notice, email, or announcement below.
                Structured information will be extracted automatically.
              </p>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={"Paste your grant notice or email here...\n\nExample:\n\"The U.S. Department of Transportation is now accepting applications for the Port Infrastructure Development Program (PIDP). Total funding available: $662 million. Individual awards range from $1 million to $100 million...\""}
                rows={14}
                className="w-full resize-none rounded-md border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-muted-foreground">
                  {rawText.length.toLocaleString()} characters
                </span>
                <Button
                  onClick={handleExtract}
                  disabled={!rawText.trim() || extracting}
                  className="gap-2"
                >
                  {extracting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Anchor className="h-4 w-4" />
                      Analyze Grant
                    </>
                  )}
                </Button>
              </div>
              {error && (
                <div className="mt-4 flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Step 2: Review */}
        {step === "review" && extracted && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep("paste")}
              className="mb-4 gap-1 text-muted-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to paste
            </Button>

            <Card className="p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Review Extracted Information</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Verify the extracted fields below. Edit anything that looks incorrect before proceeding.
              </p>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">Grant Name</label>
                    <input
                      type="text"
                      value={extracted.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">Short Name</label>
                    <input
                      type="text"
                      value={extracted.shortName}
                      onChange={(e) => updateField("shortName", e.target.value)}
                      className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Agency</label>
                  <input
                    type="text"
                    value={extracted.agency}
                    onChange={(e) => updateField("agency", e.target.value)}
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Description</label>
                  <textarea
                    value={extracted.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    rows={2}
                    className="w-full mt-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">Total Funding ($)</label>
                    <input
                      type="number"
                      value={extracted.totalFunding}
                      onChange={(e) => updateField("totalFunding", Number(e.target.value))}
                      className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">Min Award ($)</label>
                    <input
                      type="number"
                      value={extracted.minAward}
                      onChange={(e) => updateField("minAward", Number(e.target.value))}
                      className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">Max Award ($)</label>
                    <input
                      type="number"
                      value={extracted.maxAward}
                      onChange={(e) => updateField("maxAward", Number(e.target.value))}
                      className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">Match Requirement (%)</label>
                    <input
                      type="number"
                      value={Math.round(extracted.matchRequirement * 100)}
                      onChange={(e) => updateField("matchRequirement", Number(e.target.value) / 100)}
                      min={0}
                      max={100}
                      className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">Deadline</label>
                    <input
                      type="text"
                      value={extracted.deadline}
                      onChange={(e) => updateField("deadline", e.target.value)}
                      className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">Status</label>
                    <select
                      value={extracted.status}
                      onChange={(e) => updateField("status", e.target.value)}
                      className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="open">Open</option>
                      <option value="upcoming">Upcoming</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Application URL</label>
                  <input
                    type="text"
                    value={extracted.applicationUrl}
                    onChange={(e) => updateField("applicationUrl", e.target.value)}
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">
                    Eligible Activities ({extracted.eligibleActivities.length})
                  </label>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {extracted.eligibleActivities.map((a, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {a}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">
                    Focus Areas ({extracted.focusAreas.length})
                  </label>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {extracted.focusAreas.map((f, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {f}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleFindVendors} disabled={searchingVendors} className="gap-2">
                {searchingVendors ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching federal vendors...
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4" />
                    Find Matching Vendors
                  </>
                )}
              </Button>
            </div>
            {error && (
              <div className="mt-4 flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Results */}
        {step === "results" && savedGrant && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleStartOver}
              className="mb-4 gap-1 text-muted-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Upload another grant
            </Button>

            {/* Summary */}
            <Card className="p-5 mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <h2 className="text-lg font-semibold">{savedGrant.shortName} – Saved & Matched</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">{savedGrant.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{savedGrant.agency}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-mono font-bold">{formatCurrency(savedGrant.totalFunding)}</p>
                  <p className="text-xs text-muted-foreground">Deadline: {savedGrant.deadline}</p>
                </div>
              </div>
            </Card>

            {/* Match Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Federal Vendors Found</p>
                <p className="text-2xl font-bold">{matches.length}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Strong Matches</p>
                <p className="text-2xl font-bold text-green-500">{strongCount}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Good Matches</p>
                <p className="text-2xl font-bold text-blue-500">{goodCount}</p>
              </Card>
            </div>

            {/* Top Vendor Matches */}
            <h3 className="text-sm font-semibold mb-3">
              Top {topMatches.length} Vendor Matches
            </h3>
            <div className="space-y-2">
              {topMatches.map((match) => {
                const vendor = vendors.find((v) => v.id === match.vendorId);
                if (!vendor) return null;

                const isOpen = expandedVendors.has(vendor.id);
                const emailOpen = expandedEmails.has(vendor.id);

                return (
                  <Card key={vendor.id} className="overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
                      onClick={() => toggleVendor(vendor.id)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">{vendor.name}</span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${recColors[match.recommendation]}`}
                            >
                              {match.recommendation.replace("_", " ")}
                            </Badge>
                            {vendor.disadvantagedBusiness && (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
                              >
                                <Shield className="h-2.5 w-2.5 mr-0.5" />
                                {vendor.disadvantagedBusiness}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${sectorColors[vendor.sector] || ""}`}
                            >
                              {vendor.sector}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {vendor.headquarters}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className="text-lg font-mono font-bold">{match.overallScore}</p>
                        <p className="text-[10px] text-muted-foreground">/ 100</p>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="border-t px-4 pb-4 pt-3">
                        {/* Score Dimensions */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                          {(Object.entries(match.dimensions) as [string, number][]).map(
                            ([key, value]) => (
                              <div key={key}>
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                  {key.replace(/([A-Z])/g, " $1").trim()}
                                </span>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        value >= 70
                                          ? "bg-green-500"
                                          : value >= 50
                                            ? "bg-blue-500"
                                            : value >= 30
                                              ? "bg-amber-500"
                                              : "bg-red-500"
                                      }`}
                                      style={{ width: `${value}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-mono w-6 text-right">{value}</span>
                                </div>
                              </div>
                            )
                          )}
                        </div>

                        {/* Strengths */}
                        {match.strengths.length > 0 && (
                          <div className="mb-3">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                              Strengths
                            </span>
                            <ul className="mt-1 space-y-0.5">
                              {match.strengths.map((s) => (
                                <li
                                  key={s}
                                  className="text-xs text-green-600 dark:text-green-400 flex items-start gap-1.5"
                                >
                                  <CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0" />
                                  {s}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Gaps */}
                        {match.gaps.length > 0 && (
                          <div className="mb-4">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                              Gaps
                            </span>
                            <ul className="mt-1 space-y-0.5">
                              {match.gaps.map((g) => (
                                <li
                                  key={g}
                                  className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1.5"
                                >
                                  <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                                  {g}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Outreach Email Toggle */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleEmail(vendor.id);
                          }}
                          className="gap-1.5 text-xs"
                        >
                          <Mail className="h-3.5 w-3.5" />
                          {emailOpen ? "Hide" : "Show"} Outreach Email
                        </Button>

                        {emailOpen && (
                          <div className="mt-3">
                            <OutreachEmail
                              match={match}
                              grant={savedGrant}
                              vendor={vendor}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
