"use client";

import { useState, useMemo, useCallback } from "react";
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  generateSF425,
  saveSF425Draft,
  getSF425Draft,
  type SF425FormData,
  type SF425LineItem,
} from "@/data/federal-report-templates";
import { getAgencyTemplate } from "@/data/agency-templates";
import { getAllReports } from "@/data/reporting";
import { getAwardById } from "@/data/awards";
import { fmtDate, fmtFull } from "./helpers";

interface SF425FormViewProps {
  reportId: string;
  onBack: () => void;
}

export default function SF425FormView({ reportId, onBack }: SF425FormViewProps) {
  const report = useMemo(() => getAllReports().find((r) => r.id === reportId), [reportId]);
  const award = useMemo(() => (report ? getAwardById(report.awardId) : undefined), [report]);
  const agencyTemplate = useMemo(() => (award ? getAgencyTemplate(award.awardingAgency) : null), [award]);

  const [formData, setFormData] = useState<SF425FormData | null>(() => {
    if (!report) return null;
    const draft = getSF425Draft(reportId);
    if (draft) return draft;
    return generateSF425(report.awardId, report.periodStart, report.periodEnd);
  });

  const [editMode, setEditMode] = useState(false);
  const [remarks, setRemarks] = useState(formData?.remarks || "");

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
      saveSF425Draft(reportId, updated);
    },
    [formData, reportId]
  );

  const handleSaveRemarks = useCallback(() => {
    if (!formData) return;
    const updated = { ...formData, remarks };
    setFormData(updated);
    saveSF425Draft(reportId, updated);
  }, [formData, remarks, reportId]);

  if (!report || !formData) {
    return <p className="p-6 text-muted-foreground">Report not found.</p>;
  }

  const { validation } = formData;

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ArrowLeft className="h-4 w-4" /> Back to Report
        </button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-[#3d8b8b]" />
              SF-425 Federal Financial Report
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {report.program} &mdash; {report.awardTitle}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Period: {fmtDate(report.periodStart)} - {fmtDate(report.periodEnd)} &middot; Due: {fmtDate(report.dueDate)}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditMode(!editMode)}
            >
              {editMode ? <Lock className="h-3.5 w-3.5 mr-1" /> : <Unlock className="h-3.5 w-3.5 mr-1" />}
              {editMode ? "Lock" : "Edit"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
            >
              <Printer className="h-3.5 w-3.5 mr-1" /> Print
            </Button>
          </div>
        </div>
      </div>

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

      {/* Form Header Section */}
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

      {/* Financial Section (Lines 10-10l) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Transactions (Lines 10a-10l)</CardTitle>
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
                {formData.lineItems.filter((l) => l.lineNumber.startsWith("10")).map((item) => (
                  <LineItemRow
                    key={item.lineNumber}
                    item={item}
                    editMode={editMode}
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
                  <LineItemRow
                    key={item.lineNumber}
                    item={item}
                    editMode={editMode}
                    onOverride={handleOverride}
                    hasError={false}
                    hasWarning={false}
                  />
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

      {/* Submission Info */}
      {agencyTemplate && (
        <div className="text-xs text-muted-foreground text-center pb-4">
          Submit via {agencyTemplate.submissionPortal} &middot; {agencyTemplate.submissionMethod}
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
  item,
  editMode,
  onOverride,
  hasError,
  hasWarning,
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
