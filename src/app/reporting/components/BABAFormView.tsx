"use client";

import { useState, useCallback } from "react";
import {
  ArrowLeft,
  Shield,
  AlertCircle,
  Printer,
  Loader2,
  Save,
  RotateCcw,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBABAFormData, useDraftPersistence, useDraftLoader } from "../hooks/useAwardFormData";
import { useTenantHeaders } from "@/contexts/tenant-context";
import type { BABAFormData } from "@/data/federal-report-templates";
import { fmtDate, fmtFull } from "./helpers";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/reports/state-transitions";

interface BABAFormViewProps {
  reportId: string;
  awardId: string;
  periodStart: string;
  periodEnd: string;
  program: string;
  awardTitle: string;
  onBack: () => void;
  reportStatus?: string;
  onStatusChange?: () => void;
}

function complianceBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    compliant: { label: "Compliant", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
    non_compliant: { label: "Non-Compliant", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
    waiver_pending: { label: "Waiver Pending", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
    not_applicable: { label: "N/A", className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  };
  const s = map[status] || map.not_applicable;
  return <Badge className={`text-[10px] ${s.className}`}>{s.label}</Badge>;
}

export default function BABAFormView({
  reportId, awardId, periodStart, periodEnd,
  program, awardTitle, onBack, reportStatus,
}: BABAFormViewProps) {
  const tenantHeaders = useTenantHeaders();
  const { data: apiData, loading, error, refresh } = useBABAFormData(awardId, periodStart, periodEnd);
  const { saveDraft, saveDraftImmediate, lastSaved, saving, saveError } = useDraftPersistence(reportId);
  const { draft: savedDraft, loading: draftLoading } = useDraftLoader(reportId);

  const [formData, setFormData] = useState<BABAFormData | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  if (apiData && !formData && !draftLoading) {
    if (savedDraft && !draftRestored) {
      setFormData({ ...apiData, ...(savedDraft as Partial<BABAFormData>) });
      setDraftRestored(true);
    } else {
      setFormData(apiData);
    }
  }

  const handleRegenerate = useCallback(() => {
    setFormData(null);
    refresh();
  }, [refresh]);

  const handleDiscardDraft = useCallback(async () => {
    await saveDraftImmediate({});
    setFormData(null);
    setDraftRestored(false);
    refresh();
  }, [saveDraftImmediate, refresh]);

  const handleDownloadPDF = useCallback(async () => {
    setPdfError(null);
    try {
      const res = await fetch(`/api/reports/${reportId}/pdf?form=baba`, {
        headers: tenantHeaders,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || "Failed to generate PDF");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      setPdfError(e instanceof Error ? e.message : "Failed to generate PDF");
    }
  }, [reportId, tenantHeaders]);

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
            <Button variant="outline" size="sm" className="mt-3" onClick={handleRegenerate}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!formData) return null;

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3 no-print">
          <ArrowLeft className="h-4 w-4" /> Back to Reports
        </button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#3d8b8b]" />
              Build America, Buy America (BABA) Compliance
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
              Period: {fmtDate(formData.reportingPeriod.start)} - {fmtDate(formData.reportingPeriod.end)}
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
            <Button variant="outline" size="sm" onClick={handleRegenerate}>Regenerate</Button>
            <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
              <Printer className="h-3.5 w-3.5 mr-1" /> Print
            </Button>
          </div>
        </div>
        {pdfError && <p className="text-xs text-red-500 text-right mt-1 no-print">{pdfError}</p>}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Overall Status</p>
            <div className="mt-2">{complianceBadge(formData.overallCompliance)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Domestic Content</p>
            <p className={`text-lg font-bold tabular-nums mt-1 ${formData.domesticContentPercentage === 100 ? "text-emerald-600" : formData.domesticContentPercentage >= 80 ? "text-amber-600" : "text-red-600"}`}>
              {formData.domesticContentPercentage}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Procurement</p>
            <p className="text-lg font-bold tabular-nums mt-1">
              {fmtFull(formData.totalProcurementCost)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Active Waivers</p>
            <p className="text-lg font-bold tabular-nums mt-1">
              {formData.waiversSummary.total}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Validation */}
      {(formData.validation.errors.length > 0 || formData.validation.warnings.length > 0) && (
        <Card className={formData.validation.errors.length > 0 ? "border-red-200 dark:border-red-800" : "border-amber-200 dark:border-amber-800"}>
          <CardContent className="pt-4 pb-4">
            <div className="space-y-1">
              {formData.validation.errors.map((e, i) => (
                <div key={`err-${i}`} className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                  <p className="text-sm text-red-600 dark:text-red-400">{e.message}</p>
                </div>
              ))}
              {formData.validation.warnings.map((w, i) => (
                <div key={`warn-${i}`} className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                  <p className="text-sm text-amber-600 dark:text-amber-400">{w.message}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* BABA Section 70914 Compliance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">BABA Section 70914 — Domestic Preference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ComplianceRow
              label="Iron & Steel"
              compliant={formData.ironSteelCompliance}
              description="All iron and steel used in the project are produced in the United States"
            />
            <ComplianceRow
              label="Construction Materials"
              compliant={formData.constructionMaterialsCompliance}
              description="All construction materials are manufactured in the United States"
            />
            <ComplianceRow
              label="Manufactured Products"
              compliant={formData.manufacturedProductsCompliance}
              description="All manufactured products are produced in the United States"
            />
          </div>
        </CardContent>
      </Card>

      {/* Award Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Award Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-0.5">Federal Agency</label>
              <p>{formData.federalAgency}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-0.5">Grant Number (FAIN)</label>
              <p>{formData.grantNumber}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-0.5">Recipient</label>
              <p>{formData.recipientName}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-0.5">Reporting Period</label>
              <p>{fmtDate(formData.reportingPeriod.start)} - {fmtDate(formData.reportingPeriod.end)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Procurement Cost Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Procurement Cost Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Domestic Procurement</span>
              <span className="font-medium tabular-nums text-emerald-600">{fmtFull(formData.domesticProcurementCost)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Foreign Procurement</span>
              <span className={`font-medium tabular-nums ${formData.foreignProcurementCost > 0 ? "text-red-600" : "text-muted-foreground"}`}>
                {fmtFull(formData.foreignProcurementCost)}
              </span>
            </div>
            <div className="border-t pt-2 flex items-center justify-between text-sm font-medium">
              <span>Total Procurement</span>
              <span className="tabular-nums">{fmtFull(formData.totalProcurementCost)}</span>
            </div>
            {/* Progress bar */}
            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${formData.domesticContentPercentage}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {formData.domesticContentPercentage}% domestic content
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Material Line Items */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Materials & Products Tracking</CardTitle>
        </CardHeader>
        <CardContent>
          {formData.lineItems.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-4">
              No procurement activity recorded for this period
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Description</th>
                    <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Manufacturer</th>
                    <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Origin</th>
                    <th className="text-right py-2 pr-4 text-xs font-medium text-muted-foreground uppercase w-28">Cost</th>
                    <th className="text-center py-2 pr-4 text-xs font-medium text-muted-foreground uppercase w-20">Domestic</th>
                    <th className="text-center py-2 text-xs font-medium text-muted-foreground uppercase w-20">Waiver</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.lineItems.map((item) => (
                    <tr key={item.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2.5 pr-4">{item.materialDescription}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{item.manufacturer}</td>
                      <td className="py-2.5 pr-4">{item.countryOfOrigin}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums font-medium">{fmtFull(item.costAmount)}</td>
                      <td className="py-2.5 pr-4 text-center">
                        {item.domesticContent ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                        )}
                      </td>
                      <td className="py-2.5 text-center">
                        {item.waiverRequested ? (
                          <Badge className="text-[9px] bg-amber-100 text-amber-700">
                            {item.waiverStatus === "approved" ? "Approved" : item.waiverStatus === "denied" ? "Denied" : "Pending"}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Waiver Summary */}
      {formData.waiversSummary.total > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Waiver Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Total</p>
                <p className="text-lg font-bold tabular-nums">{formData.waiversSummary.total}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Pending</p>
                <p className="text-lg font-bold tabular-nums text-amber-600">{formData.waiversSummary.pending}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Approved</p>
                <p className="text-lg font-bold tabular-nums text-emerald-600">{formData.waiversSummary.approved}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Denied</p>
                <p className="text-lg font-bold tabular-nums text-red-600">{formData.waiversSummary.denied}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Certification */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Certification</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-4">
            I certify that to the best of my knowledge and belief, all iron, steel, manufactured products, and construction
            materials used in this federally funded project comply with the Build America, Buy America Act (Pub. L. 117-58,
            Division G, Title IX, Subtitle A, Section 70914), unless a waiver has been granted by the federal awarding agency.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-0.5">Certifying Official</label>
              <p>{formData.certifyingOfficial}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-0.5">Title</label>
              <p>{formData.certifyingTitle}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-0.5">Date</label>
              <p>{fmtDate(formData.certifyingDate)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ComplianceRow({ label, compliant, description }: { label: string; compliant: boolean; description: string }) {
  return (
    <div className={`p-3 rounded-lg border ${compliant ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20" : "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20"}`}>
      <div className="flex items-center gap-2 mb-1">
        {compliant ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        ) : (
          <XCircle className="h-4 w-4 text-red-500" />
        )}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
