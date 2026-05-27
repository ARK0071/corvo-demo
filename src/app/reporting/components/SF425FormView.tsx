"use client";

import { useState, useCallback } from "react";
import {
  ArrowLeft,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Printer,
  Info,
  Lock,
  Unlock,
  Loader2,
  Save,
  RotateCcw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSF425FormData, useDraftPersistence, useDraftLoader } from "../hooks/useAwardFormData";
import { getAgencyTemplate } from "@/data/agency-templates";
import type { SF425FormData, SF425LineItem } from "@/data/federal-report-templates";
import { fmtDate, fmtFull } from "./helpers";
import { useCurrentUser } from "@/contexts/user-context";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/reports/state-transitions";
import ActivityTimeline from "./ActivityTimeline";
import { Shield, Send, FileDown, MessageSquare, Clock } from "lucide-react";

interface SF425FormViewProps {
  reportId: string;
  awardId: string;
  periodStart: string;
  periodEnd: string;
  program: string;
  awardTitle: string;
  dueDate: string;
  awardingAgency?: string;
  onBack: () => void;
  reportStatus?: string;
  certificationId?: string | null;
  contentLockedAt?: string | null;
  reviewNotes?: string | null;
  onStatusChange?: () => void;
}

export default function SF425FormView({
  reportId, awardId, periodStart, periodEnd,
  program, awardTitle, dueDate, awardingAgency, onBack,
  reportStatus, certificationId, contentLockedAt, reviewNotes, onStatusChange,
}: SF425FormViewProps) {
  const { data: apiData, loading, error, refresh } = useSF425FormData(awardId, periodStart, periodEnd);
  const { saveDraft, saveDraftImmediate, lastSaved, saving, saveError } = useDraftPersistence(reportId);
  const { draft: savedDraft, loading: draftLoading } = useDraftLoader(reportId);
  const agencyTemplate = awardingAgency ? getAgencyTemplate(awardingAgency) : null;

  const [formData, setFormData] = useState<SF425FormData | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [draftRestored, setDraftRestored] = useState(false);

  const { user: currentUser } = useCurrentUser();
  const [showCertifyModal, setShowCertifyModal] = useState(false);
  const [certifying, setCertifying] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [certBadge, setCertBadge] = useState<{ name: string; title: string; date: string; hash: string } | null>(null);
  const [showActivity, setShowActivity] = useState(false);
  const [changeNotes, setChangeNotes] = useState("");
  const [showChangesModal, setShowChangesModal] = useState(false);

  const isLocked = !!contentLockedAt;
  const effectiveEditMode = editMode && !isLocked;

  // Sync API data into local state, merging saved draft if available
  if (apiData && !formData && !draftLoading) {
    if (savedDraft && !draftRestored) {
      const merged = { ...apiData, ...(savedDraft as Partial<SF425FormData>) };
      setFormData(merged);
      setRemarks(merged.remarks || "");
      setDraftRestored(true);
    } else {
      setFormData(apiData);
      setRemarks(apiData.remarks || "");
    }
  }

  const handleOverride = useCallback(
    (lineNumber: string, newValue: number) => {
      if (!formData) return;
      const updated = {
        ...formData,
        lineItems: formData.lineItems.map((item) =>
          item.lineNumber === lineNumber ? { ...item, value: newValue } : item
        ),
      };
      setFormData(updated);
      saveDraft(updated);
    },
    [formData, saveDraft]
  );

  const handleSaveRemarks = useCallback(() => {
    if (!formData) return;
    const updated = { ...formData, remarks };
    setFormData(updated);
    saveDraft(updated);
  }, [formData, remarks, saveDraft]);

  const handleRefresh = useCallback(() => {
    setFormData(null);
    refresh();
  }, [refresh]);

  const handleDiscardDraft = useCallback(async () => {
    await saveDraftImmediate({});
    setFormData(null);
    setDraftRestored(false);
    refresh();
  }, [saveDraftImmediate, refresh]);

  const handleSubmitForReview = useCallback(async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/reports/${reportId}/submit-for-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed");
      }
      onStatusChange?.();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed");
    }
    setActionLoading(false);
  }, [reportId, onStatusChange]);

  const handleApproveReview = useCallback(async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/reports/${reportId}/approve-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed");
      }
      onStatusChange?.();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed");
    }
    setActionLoading(false);
  }, [reportId, onStatusChange]);

  const handleRequestChanges = useCallback(async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/reports/${reportId}/request-changes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: changeNotes }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed");
      }
      setShowChangesModal(false);
      setChangeNotes("");
      onStatusChange?.();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed");
    }
    setActionLoading(false);
  }, [reportId, changeNotes, onStatusChange]);

  const handleCertify = useCallback(async () => {
    setCertifying(true);
    setActionError(null);
    try {
      const attestation = "By signing this report, I certify to the best of my knowledge and belief that the report is true, complete, and accurate, and the expenditures, disbursements and cash receipts are for the purposes and intent set forth in the award documents. I am aware that any false, fictitious, or fraudulent information may subject me to criminal, civil, or administrative penalties. (U.S. Code, Title 18, Section 1001 and Title 31, Sections 3729-3730 and 3801-3812.)";
      const res = await fetch(`/api/reports/${reportId}/certify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attestationText: attestation, phone: currentUser?.phone }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to certify");
      }
      const data = await res.json();
      setCertBadge({
        name: data.certification.certifierName,
        title: data.certification.certifierTitle,
        date: data.certification.certifiedAt,
        hash: data.certification.contentHash,
      });
      setShowCertifyModal(false);
      onStatusChange?.();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed");
    }
    setCertifying(false);
  }, [reportId, currentUser, onStatusChange]);

  const handleDownloadPDF = useCallback(() => {
    window.open(`/api/reports/${reportId}/pdf?form=sf425`, "_blank");
  }, [reportId]);

  if ((loading || draftLoading) && !formData) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !formData) {
    return (
      <div className="flex-1 p-6">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <Card className="border-red-200">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-8 w-8 mx-auto text-red-500 mb-3" />
            <p className="text-sm text-red-600">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={handleRefresh}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!formData) return null;

  const { validation } = formData;

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3 no-print">
          <ArrowLeft className="h-4 w-4" /> Back to Report
        </button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-[#3d8b8b]" />
              SF-425 Federal Financial Report
              {reportStatus && (
                <Badge className={`ml-2 text-[10px] ${STATUS_COLORS[reportStatus] || ""}`}>
                  {STATUS_LABELS[reportStatus] || reportStatus}
                </Badge>
              )}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {program} &mdash; {awardTitle}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Period: {fmtDate(periodStart)} - {fmtDate(periodEnd)} &middot; Due: {fmtDate(dueDate)}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 no-print">
            <div className="text-right mr-2">
              {saving && <span className="text-xs text-muted-foreground">Saving...</span>}
              {saveError && <span className="text-xs text-red-500">{saveError}</span>}
              {!saving && !saveError && lastSaved && (
                <span className="text-xs text-muted-foreground">
                  Saved {lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => formData && saveDraftImmediate(formData)}>
              <Save className="h-3.5 w-3.5 mr-1" /> Save Draft
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDiscardDraft}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Discard
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditMode(!editMode)}>
              {editMode ? <Lock className="h-3.5 w-3.5 mr-1" /> : <Unlock className="h-3.5 w-3.5 mr-1" />}
              {editMode ? "Lock" : "Edit"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
              <Printer className="h-3.5 w-3.5 mr-1" /> Print
            </Button>
          </div>
        </div>

        {/* Workflow Actions */}
        {actionError && (
          <div className="mt-2 text-xs text-red-500 text-right no-print">{actionError}</div>
        )}
        <div className="flex items-center gap-2 mt-2 justify-end flex-wrap no-print">
          {reportStatus && (reportStatus === "upcoming" || reportStatus === "drafting") && currentUser?.role === "drafter" && (
            <Button size="sm" onClick={handleSubmitForReview} disabled={actionLoading}>
              <Send className="h-3.5 w-3.5 mr-1" />
              {actionLoading ? "Submitting…" : "Submit for Review"}
            </Button>
          )}
          {reportStatus === "pending_review" && currentUser?.role === "reviewer" && (
            <>
              <Button size="sm" onClick={handleApproveReview} disabled={actionLoading}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowChangesModal(true)} disabled={actionLoading}>
                <MessageSquare className="h-3.5 w-3.5 mr-1" />
                Request Changes
              </Button>
            </>
          )}
          {reportStatus === "ready_to_certify" && currentUser?.role === "certifying_official" && (
            <Button size="sm" onClick={() => setShowCertifyModal(true)} disabled={actionLoading}>
              <Shield className="h-3.5 w-3.5 mr-1" />
              Certify & Sign
            </Button>
          )}
          {(reportStatus === "ready_to_certify" || reportStatus === "certified" || reportStatus === "filed") && (
            <Button size="sm" variant="outline" onClick={handleDownloadPDF}>
              <FileDown className="h-3.5 w-3.5 mr-1" />
              Download PDF
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setShowActivity(!showActivity)}>
            <Clock className="h-3.5 w-3.5 mr-1" />
            {showActivity ? "Hide" : "Activity"}
          </Button>
        </div>
      </div>

      {/* Certification Badge */}
      {(certBadge || certificationId) && (
        <Card className="border-emerald-200 dark:border-emerald-800">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  Certified {certBadge ? `by ${certBadge.name}, ${certBadge.title}` : ""}
                </p>
                {certBadge && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(certBadge.date).toLocaleString()} · Hash {certBadge.hash.slice(0, 8)}…
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Locked Badge */}
      {isLocked && (
        <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 rounded-md px-3 py-2 border border-amber-200 dark:border-amber-800">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          Locked snapshot — taken {new Date(contentLockedAt!).toLocaleString()}. Form fields are read-only.
        </div>
      )}

      {/* Review Notes */}
      {reviewNotes && (
        <div className="flex items-start gap-2 text-xs bg-blue-50 dark:bg-blue-950/20 rounded-md px-3 py-2 border border-blue-200 dark:border-blue-800">
          <MessageSquare className="h-3.5 w-3.5 shrink-0 mt-0.5 text-blue-600" />
          <div>
            <p className="font-medium text-blue-700 dark:text-blue-400">Reviewer Notes</p>
            <p className="text-blue-600 dark:text-blue-300 mt-0.5">{reviewNotes}</p>
          </div>
        </div>
      )}

      {/* Activity Timeline */}
      {showActivity && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" /> Activity Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityTimeline reportId={reportId} />
          </CardContent>
        </Card>
      )}

      {/* Validation Status */}
      <Card className={!validation.valid ? "border-red-200 dark:border-red-800" : validation.warnings.length > 0 ? "border-amber-200 dark:border-amber-800" : "border-emerald-200 dark:border-emerald-800"}>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            {!validation.valid ? (
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            ) : validation.warnings.length > 0 ? (
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            )}
            <div>
              <p className="text-sm font-medium">
                {!validation.valid
                  ? `${validation.errors.length} validation error${validation.errors.length > 1 ? "s" : ""}`
                  : validation.warnings.length > 0
                  ? `${validation.warnings.length} warning${validation.warnings.length > 1 ? "s" : ""}`
                  : "All line items validated"}
              </p>
              {validation.errors.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {validation.errors.map((e, i) => (
                    <li key={i} className="text-xs text-red-600 dark:text-red-400">Line {e.lineNumber}: {e.message}</li>
                  ))}
                </ul>
              )}
              {validation.warnings.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {validation.warnings.map((w, i) => (
                    <li key={i} className="text-xs text-amber-600 dark:text-amber-400">Line {w.lineNumber}: {w.message}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form Header */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Report Header (Lines 1-9)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <FormField label="1. Federal Agency" value={formData.federalAgency} />
            <FormField label="2. Federal Grant Number" value={formData.federalGrantNumber} />
            <FormField label="3. Recipient Organization" value={`${formData.recipientName}\n${formData.recipientAddress}`} />
            <div className="space-y-3">
              <FormField label="4a. UEI" value={formData.uei} />
              <FormField label="4b. EIN" value={formData.ein} />
            </div>
            <FormField label="8. Reporting Period End Date" value={fmtDate(formData.reportingPeriodEnd)} />
            <FormField label="9. Report Type" value={formData.reportType.replace("_", "-")} />
          </div>
        </CardContent>
      </Card>

      {/* Transactions (Lines 10a-10k) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Transactions (Lines 10a-10k)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase w-16">Line</th>
                  <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Description</th>
                  <th className="text-right py-2 pr-4 text-xs font-medium text-muted-foreground uppercase w-36">Amount</th>
                  <th className="text-left py-2 text-xs font-medium text-muted-foreground uppercase w-48">Source</th>
                </tr>
              </thead>
              <tbody>
                {formData.lineItems.filter((l) => l.lineNumber.startsWith("10") && l.lineNumber <= "10k").map((item) => (
                  <LineItemRow
                    key={item.lineNumber}
                    item={item}
                    editMode={effectiveEditMode}
                    onOverride={handleOverride}
                    hasError={validation.errors.some((e) => e.lineNumber === item.lineNumber)}
                    hasWarning={validation.warnings.some((w) => w.lineNumber === item.lineNumber)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Program Income (Lines 10l-10o) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Program Income (Lines 10l-10o)</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Report any income generated by the federally-funded program (e.g., fees, royalties, interest). Most infrastructure grants report $0.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase w-16">Line</th>
                  <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Description</th>
                  <th className="text-right py-2 pr-4 text-xs font-medium text-muted-foreground uppercase w-36">Amount</th>
                  <th className="text-left py-2 text-xs font-medium text-muted-foreground uppercase w-48">Source</th>
                </tr>
              </thead>
              <tbody>
                {formData.lineItems.filter((l) => l.lineNumber >= "10l" && l.lineNumber <= "10o").map((item) => (
                  <LineItemRow
                    key={item.lineNumber}
                    item={item}
                    editMode={effectiveEditMode}
                    onOverride={handleOverride}
                    hasError={validation.errors.some((e) => e.lineNumber === item.lineNumber)}
                    hasWarning={validation.warnings.some((w) => w.lineNumber === item.lineNumber)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Indirect Expense (Line 11) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Indirect Expense (Line 11)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase w-16">Line</th>
                  <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Description</th>
                  <th className="text-right py-2 pr-4 text-xs font-medium text-muted-foreground uppercase w-36">Value</th>
                  <th className="text-left py-2 text-xs font-medium text-muted-foreground uppercase w-48">Source</th>
                </tr>
              </thead>
              <tbody>
                {formData.lineItems.filter((l) => l.lineNumber.startsWith("11")).map((item) => (
                  <LineItemRow key={item.lineNumber} item={item} editMode={effectiveEditMode} onOverride={handleOverride} hasError={false} hasWarning={false} />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Remarks (Line 12) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Remarks (Line 12)</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            onBlur={handleSaveRemarks}
            placeholder="Enter any explanations or additional information required by the federal awarding agency..."
            className="w-full h-24 rounded-md border bg-background px-3 py-2 text-sm resize-y"
          />
        </CardContent>
      </Card>

      {/* Certification */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Certification</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-4">
            By signing this report, I certify to the best of my knowledge and belief that the report is true, complete, and accurate,
            and the expenditures, disbursements and cash receipts are for the purposes and objectives set forth in the terms and conditions
            of the Federal award. I am aware that any false, fictitious, or fraudulent information, or the omission of any material fact,
            may subject me to criminal, civil, or administrative penalties for fraud, false statements, false claims or otherwise.
            (U.S. Code Title 18, Section 1001 and Title 31, Sections 3729-3730 and 3801-3812).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <FormField label="Certifying Official" value={formData.certifyingOfficial} />
            <FormField label="Title" value={formData.certifyingTitle} />
            <FormField label="Phone" value={formData.certifyingPhone} />
          </div>
        </CardContent>
      </Card>

      {/* Agency-Specific Info */}
      {agencyTemplate && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="h-4 w-4" /> {agencyTemplate.agencyName} Requirements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">{agencyTemplate.instructions}</p>
            <div className="space-y-1">
              {agencyTemplate.specialRequirements.map((req, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="text-[#3d8b8b] mt-0.5">&#8226;</span>
                  <span>{req}</span>
                </div>
              ))}
            </div>
            {agencyTemplate.additionalFields.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-sm font-medium mb-3">Agency-Specific Fields</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {agencyTemplate.additionalFields.map((field) => (
                    <div key={field.id}>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type={field.fieldType === "number" ? "number" : "text"}
                        placeholder={field.helpText}
                        className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {agencyTemplate && (
        <div className="text-xs text-muted-foreground text-center pb-4">
          Submit via {agencyTemplate.submissionPortal} &middot; {agencyTemplate.submissionMethod}
        </div>
      )}

      {/* Certify Modal */}
      {showCertifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg border shadow-lg max-w-lg w-full mx-4 p-6">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-emerald-600" />
              Certify & Sign Report
            </h3>
            <div className="bg-muted/50 rounded-md p-4 text-xs leading-relaxed mb-4 border">
              By signing this report, I certify to the best of my knowledge and belief
              that the report is true, complete, and accurate, and the expenditures,
              disbursements and cash receipts are for the purposes and intent set forth
              in the award documents. I am aware that any false, fictitious, or
              fraudulent information may subject me to criminal, civil, or
              administrative penalties. (U.S. Code, Title 18, Section 1001 and Title 31,
              Sections 3729-3730 and 3801-3812.)
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div>
                <label className="text-xs text-muted-foreground">Name</label>
                <p className="font-medium">{currentUser?.name}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Title</label>
                <p className="font-medium">{currentUser?.title}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Email</label>
                <p className="font-medium">{currentUser?.email}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Role</label>
                <p className="font-medium">Certifying Official</p>
              </div>
            </div>
            {actionError && <p className="text-xs text-red-500 mb-3">{actionError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCertifyModal(false)} disabled={certifying}>
                Cancel
              </Button>
              <Button onClick={handleCertify} disabled={certifying} className="bg-emerald-600 hover:bg-emerald-700">
                {certifying ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Shield className="h-4 w-4 mr-1" />}
                {certifying ? "Certifying…" : "I Certify & Sign"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Request Changes Modal */}
      {showChangesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg border shadow-lg max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">Request Changes</h3>
            <textarea
              value={changeNotes}
              onChange={(e) => setChangeNotes(e.target.value)}
              placeholder="Describe what needs to be changed…"
              className="w-full h-24 rounded-md border bg-background px-3 py-2 text-sm resize-y mb-4"
            />
            {actionError && <p className="text-xs text-red-500 mb-3">{actionError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowChangesModal(false); setChangeNotes(""); }}>
                Cancel
              </Button>
              <Button onClick={handleRequestChanges} disabled={actionLoading}>
                {actionLoading ? "Sending…" : "Send Back to Drafter"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───

function FormField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground block mb-0.5">{label}</label>
      <p className="text-sm whitespace-pre-line">{value}</p>
    </div>
  );
}

function LineItemRow({
  item, editMode, onOverride, hasError, hasWarning,
}: {
  item: SF425LineItem;
  editMode: boolean;
  onOverride: (lineNumber: string, value: number) => void;
  hasError: boolean;
  hasWarning: boolean;
}) {
  const isComputed = item.source.startsWith("Computed:");
  const isNumber = typeof item.value === "number";
  const canEdit = editMode && item.editable && !isComputed;

  return (
    <tr className={`border-b last:border-0 ${hasError ? "bg-red-50/50 dark:bg-red-950/10" : hasWarning ? "bg-amber-50/50 dark:bg-amber-950/10" : "hover:bg-muted/50"}`}>
      <td className="py-2.5 pr-4 font-mono text-xs font-medium">
        <div className="flex items-center gap-1.5">
          {hasError && <AlertCircle className="h-3 w-3 text-red-500" />}
          {hasWarning && !hasError && <AlertTriangle className="h-3 w-3 text-amber-500" />}
          {item.lineNumber}
        </div>
      </td>
      <td className="py-2.5 pr-4">
        <span className={isComputed ? "text-muted-foreground" : ""}>{item.label}</span>
      </td>
      <td className="py-2.5 pr-4 text-right">
        {canEdit && isNumber ? (
          <input
            type="number"
            defaultValue={item.value as number}
            onBlur={(e) => onOverride(item.lineNumber, parseFloat(e.target.value) || 0)}
            className="w-full text-right rounded border bg-background px-2 py-1 text-sm tabular-nums"
          />
        ) : (
          <span className={`tabular-nums font-medium ${isComputed ? "text-muted-foreground" : ""}`}>
            {isNumber ? fmtFull(item.value as number) : item.value}
          </span>
        )}
      </td>
      <td className="py-2.5">
        <span className="text-xs text-muted-foreground">{item.source}</span>
      </td>
    </tr>
  );
}
