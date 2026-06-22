"use client";

import { useState, useCallback } from "react";
import {
  ArrowLeft,
  Banknote,
  AlertCircle,
  Printer,
  Info,
  Loader2,
  Save,
  RotateCcw,
  Lock,
  Unlock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSF270FormData, useDrawdowns, useDraftPersistence, useDraftLoader } from "../hooks/useAwardFormData";
import { useTenantHeaders } from "@/contexts/tenant-context";
import { getAgencyTemplate } from "@/data/agency-templates";
import type { SF270FormData, SF270LineItem } from "@/data/federal-report-templates";
import { fmtDate, fmtFull, fmt } from "./helpers";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/reports/state-transitions";

interface SF270FormViewProps {
  reportId: string;
  awardId: string;
  periodStart: string;
  periodEnd: string;
  program: string;
  awardTitle: string;
  awardingAgency?: string;
  onBack: () => void;
  reportStatus?: string;
  onStatusChange?: () => void;
}

export default function SF270FormView({
  reportId, awardId, periodStart, periodEnd,
  program, awardTitle, awardingAgency, onBack, reportStatus,
}: SF270FormViewProps) {
  const tenantHeaders = useTenantHeaders();
  const { data: apiData, loading, error, refresh } = useSF270FormData(awardId, periodStart, periodEnd);
  const { data: drawdowns } = useDrawdowns(awardId);
  const { saveDraft, saveDraftImmediate, lastSaved, saving, saveError } = useDraftPersistence(reportId);
  const { draft: savedDraft, loading: draftLoading } = useDraftLoader(reportId);
  const agencyTemplate = awardingAgency ? getAgencyTemplate(awardingAgency) : null;

  const [formData, setFormData] = useState<SF270FormData | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  if (apiData && !formData && !draftLoading) {
    if (savedDraft && !draftRestored) {
      setFormData({ ...apiData, ...(savedDraft as Partial<SF270FormData>) });
      setDraftRestored(true);
    } else {
      setFormData(apiData);
    }
  }

  const handleOverride = useCallback(
    (lineId: string, newValue: number) => {
      if (!formData) return;
      const updated = {
        ...formData,
        lineItems: formData.lineItems.map((item) =>
          item.lineId === lineId ? { ...item, value: newValue } : item
        ),
      };
      // Recompute computed lines
      const a = updated.lineItems.find((i) => i.lineId === "a")?.value ?? 0;
      const b = updated.lineItems.find((i) => i.lineId === "b")?.value ?? 0;
      const c = a - b;
      const d = updated.lineItems.find((i) => i.lineId === "d")?.value ?? 0;
      const e = Math.max(0, c - d);
      updated.lineItems = updated.lineItems.map((item) => {
        if (item.lineId === "c") return { ...item, value: c };
        if (item.lineId === "e") return { ...item, value: e };
        return item;
      });
      updated.federalShareOfOutlays = c;
      updated.federalShareNowRequested = e;
      setFormData(updated);
      saveDraft(updated);
    },
    [formData, saveDraft]
  );

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
      const res = await fetch(`/api/reports/${reportId}/pdf?form=sf270`, {
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
          <ArrowLeft className="h-4 w-4" /> Back to Report
        </button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Banknote className="h-5 w-5 text-[#3d8b8b]" />
              SF-270 Request for Advance or Reimbursement
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
              Period: {fmtDate(formData.computationPeriod.start)} - {fmtDate(formData.computationPeriod.end)}
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
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Request Type</p>
            <p className="text-lg font-bold capitalize mt-1">{formData.requestType}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Request #</p>
            <p className="text-lg font-bold tabular-nums mt-1">{formData.requestNumber}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Amount Requested</p>
            <p className={`text-lg font-bold tabular-nums mt-1 ${formData.federalShareNowRequested > 0 ? "text-[#3d8b8b]" : "text-muted-foreground"}`}>
              {fmt(formData.federalShareNowRequested)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Payments Received</p>
            <p className="text-lg font-bold tabular-nums mt-1 text-emerald-600">
              {fmt(formData.federalPaymentsReceived)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Validation */}
      {formData.validation.errors.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
              <div>
                {formData.validation.errors.map((e, i) => (
                  <p key={i} className="text-sm text-amber-600 dark:text-amber-400">{e.message}</p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Request Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Request Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <FormField label="Federal Sponsoring Agency" value={formData.federalSponsoringAgency} />
            <FormField label="Grant Number" value={formData.grantNumber} />
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-0.5">Recipient</label>
              <p className="text-sm">{formData.recipientName}</p>
              <p className="text-xs text-muted-foreground">{formData.recipientAddress}</p>
            </div>
            <FormField label="Computation Period" value={`${fmtDate(formData.computationPeriod.start)} - ${fmtDate(formData.computationPeriod.end)}`} />
          </div>
        </CardContent>
      </Card>

      {/* Computation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Computation of Amount Requested</CardTitle>
          {editMode && (
            <p className="text-xs text-muted-foreground mt-1">
              Click on editable amounts to override computed values. Computed lines will update automatically.
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase w-12">Line</th>
                  <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Description</th>
                  <th className="text-right py-2 pr-4 text-xs font-medium text-muted-foreground uppercase w-36">Amount</th>
                  <th className="text-left py-2 text-xs font-medium text-muted-foreground uppercase w-48">Source</th>
                </tr>
              </thead>
              <tbody>
                {formData.lineItems.map((item) => (
                  <LineItemRow
                    key={item.lineId}
                    item={item}
                    editMode={editMode}
                    onOverride={handleOverride}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Drawdown History */}
      {drawdowns && drawdowns.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Prior Drawdown Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Date</th>
                    <th className="text-right py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Amount</th>
                    <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Status</th>
                    <th className="text-left py-2 text-xs font-medium text-muted-foreground uppercase">Payment Date</th>
                  </tr>
                </thead>
                <tbody>
                  {drawdowns.map((d) => (
                    <tr key={d.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2 pr-4">{fmtDate(d.submittedDate || d.createdAt)}</td>
                      <td className="py-2 pr-4 text-right tabular-nums font-medium">{fmtFull(d.totalAmount)}</td>
                      <td className="py-2 pr-4">
                        <Badge variant="outline" className="text-[10px]">{d.status.replace("_", " ")}</Badge>
                      </td>
                      <td className="py-2 text-muted-foreground">{fmtDate(d.paymentDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
            I certify that to the best of my knowledge and belief the data above are correct and that all outlays were made
            in accordance with the grant conditions or other agreement and that payment is due and has not been previously requested.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <FormField label="Certifying Official" value={formData.certifyingOfficial} />
            <FormField label="Title" value={formData.certifyingTitle} />
            <FormField label="Date" value={fmtDate(formData.certifyingDate)} />
          </div>
        </CardContent>
      </Card>

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
      <p className="text-sm">{value}</p>
    </div>
  );
}

function LineItemRow({
  item, editMode, onOverride,
}: {
  item: SF270LineItem;
  editMode: boolean;
  onOverride: (lineId: string, value: number) => void;
}) {
  const isComputed = item.source.startsWith("Computed:");
  const isResult = item.lineId === "e";
  const canEdit = editMode && item.editable && !isComputed;

  return (
    <tr className={`border-b last:border-0 ${isResult ? "bg-[#3d8b8b]/5 font-medium" : "hover:bg-muted/50"}`}>
      <td className="py-2.5 pr-4 font-mono text-xs font-medium">{item.lineId}</td>
      <td className="py-2.5 pr-4">
        <span className={isComputed ? "text-muted-foreground" : ""}>{item.label}</span>
      </td>
      <td className="py-2.5 pr-4 text-right">
        {canEdit ? (
          <input
            type="number"
            defaultValue={item.value}
            onBlur={(e) => onOverride(item.lineId, parseFloat(e.target.value) || 0)}
            className="w-full text-right rounded border bg-background px-2 py-1 text-sm tabular-nums"
          />
        ) : (
          <span className={`tabular-nums font-medium ${isResult ? "text-[#3d8b8b] font-bold" : ""} ${isComputed ? "text-muted-foreground" : ""}`}>
            {fmtFull(item.value)}
          </span>
        )}
      </td>
      <td className="py-2.5">
        <span className="text-xs text-muted-foreground">{item.source}</span>
      </td>
    </tr>
  );
}
