"use client";

import { useState, useMemo, useCallback } from "react";
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  AlertCircle,
  Printer,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  generateSF270,
  saveSF270Draft,
  getSF270Draft,
  type SF270FormData,
} from "@/data/federal-report-templates";
import { getAgencyTemplate } from "@/data/agency-templates";
import { getAllReports } from "@/data/reporting";
import { getAwardById, getDrawdownsForAward } from "@/data/awards";
import { fmtDate, fmtFull, fmt } from "./helpers";

interface SF270FormViewProps {
  reportId: string;
  onBack: () => void;
}

export default function SF270FormView({ reportId, onBack }: SF270FormViewProps) {
  const report = useMemo(() => getAllReports().find((r) => r.id === reportId), [reportId]);
  const award = useMemo(() => (report ? getAwardById(report.awardId) : undefined), [report]);
  const drawdowns = useMemo(() => (award ? getDrawdownsForAward(award.id) : []), [award]);
  const agencyTemplate = useMemo(() => (award ? getAgencyTemplate(award.awardingAgency) : null), [award]);

  const [formData, setFormData] = useState<SF270FormData | null>(() => {
    if (!report) return null;
    const draft = getSF270Draft(reportId);
    if (draft) return draft;
    return generateSF270(report.awardId, report.periodStart, report.periodEnd);
  });

  const handleRegenerate = useCallback(() => {
    if (!report) return;
    const fresh = generateSF270(report.awardId, report.periodStart, report.periodEnd);
    if (fresh) {
      setFormData(fresh);
      saveSF270Draft(reportId, fresh);
    }
  }, [report, reportId]);

  if (!report || !formData) {
    return <p className="p-6 text-muted-foreground">Report not found.</p>;
  }

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
              <Banknote className="h-5 w-5 text-[#3d8b8b]" />
              SF-270 Request for Advance or Reimbursement
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {report.program} &mdash; {report.awardTitle}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Period: {fmtDate(formData.computationPeriod.start)} - {fmtDate(formData.computationPeriod.end)}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={handleRegenerate}>
              Regenerate
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5 mr-1" /> Print
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Card */}
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

      {/* Form Header */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Request Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-0.5">Federal Sponsoring Agency</label>
              <p>{formData.federalSponsoringAgency}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-0.5">Grant Number</label>
              <p>{formData.grantNumber}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-0.5">Recipient</label>
              <p>{formData.recipientName}</p>
              <p className="text-xs text-muted-foreground">{formData.recipientAddress}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-0.5">Computation Period</label>
              <p>{fmtDate(formData.computationPeriod.start)} - {fmtDate(formData.computationPeriod.end)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Computation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Computation of Amount Requested</CardTitle>
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
                {formData.lineItems.map((item) => {
                  const isResult = item.lineId === "e";
                  return (
                    <tr key={item.lineId} className={`border-b last:border-0 ${isResult ? "bg-[#3d8b8b]/5 font-medium" : "hover:bg-muted/50"}`}>
                      <td className="py-2.5 pr-4 font-mono text-xs font-medium">{item.lineId}</td>
                      <td className="py-2.5 pr-4">{item.label}</td>
                      <td className={`py-2.5 pr-4 text-right tabular-nums ${isResult ? "text-[#3d8b8b] font-bold" : ""}`}>
                        {fmtFull(item.value)}
                      </td>
                      <td className="py-2.5 text-xs text-muted-foreground">{item.source}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Drawdown History */}
      {drawdowns.length > 0 && (
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
                        <Badge variant="outline" className="text-[10px]">
                          {d.status.replace("_", " ")}
                        </Badge>
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

      {/* Submission Info */}
      {agencyTemplate && (
        <div className="text-xs text-muted-foreground text-center pb-4">
          Submit via {agencyTemplate.submissionPortal} &middot; {agencyTemplate.submissionMethod}
        </div>
      )}
    </div>
  );
}
