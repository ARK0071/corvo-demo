/**
 * Shared hook for fetching award form data from the database.
 * Replaces direct imports from src/data/awards.ts and src/data/federal-report-templates.ts.
 *
 * Used by SF-425, SF-270, PPR, and ReportDetailView components.
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTenantHeaders, useTenant } from "@/contexts/tenant-context";
import type { SF425FormData, SF270FormData, PPRFormData, BABAFormData } from "@/data/federal-report-templates";

// ─── Types ───

interface FinancialSummary {
  totalAwarded: number;
  totalExpendedThisPeriod: number;
  totalExpendedCumulative: number;
  totalDrawnDown: number;
  remainingBalance: number;
  byCategory: { name: string; budgeted: number; spent: number; remaining: number }[];
}

interface MatchSummary {
  required: number;
  committed: number;
  percentage: number;
  status: "on_track" | "at_risk" | "shortfall";
}

export interface ReportSummaryData {
  financialSummary: FinancialSummary;
  matchSummary: MatchSummary;
  completionPercentage: number;
}

interface DrawdownRequest {
  id: string;
  awardId: string;
  expenseIds: string[];
  totalAmount: number;
  status: string;
  submittedDate?: string;
  approvedDate?: string;
  paymentDate?: string;
  notes: string;
  createdAt: string;
}

export interface FormDataHookResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

// ─── SF-425 Hook ───

export function useSF425FormData(awardId: string | null, periodStart: string, periodEnd: string): FormDataHookResult<SF425FormData> {
  const headers = useTenantHeaders();
  const tenant = useTenant();
  const [data, setData] = useState<SF425FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch425 = useCallback(async () => {
    if (!awardId || tenant.isLoading) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ awardId, periodStart, periodEnd, formType: "sf425" });
      const res = await fetch(`/api/awards/form-data?${params}`, {
        headers: { ...headers, "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`Failed to fetch SF-425 data: ${res.status}`);
      const formData = await res.json();
      setData(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load form data");
    } finally {
      setLoading(false);
    }
  }, [awardId, periodStart, periodEnd, headers, tenant.isLoading]);

  useEffect(() => { fetch425(); }, [awardId, tenant.isLoading, tenant.portId]);

  return { data, loading, error, refresh: fetch425 };
}

// ─── SF-270 Hook ───

export function useSF270FormData(awardId: string | null, periodStart: string, periodEnd: string): FormDataHookResult<SF270FormData> {
  const headers = useTenantHeaders();
  const tenant = useTenant();
  const [data, setData] = useState<SF270FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch270 = useCallback(async () => {
    if (!awardId || tenant.isLoading) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ awardId, periodStart, periodEnd, formType: "sf270" });
      const res = await fetch(`/api/awards/form-data?${params}`, {
        headers: { ...headers, "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`Failed to fetch SF-270 data: ${res.status}`);
      const formData = await res.json();
      setData(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load form data");
    } finally {
      setLoading(false);
    }
  }, [awardId, periodStart, periodEnd, headers, tenant.isLoading]);

  useEffect(() => { fetch270(); }, [awardId, tenant.isLoading, tenant.portId]);

  return { data, loading, error, refresh: fetch270 };
}

// ─── PPR Hook ───

export function usePPRFormData(awardId: string | null, periodStart: string, periodEnd: string): FormDataHookResult<PPRFormData> {
  const headers = useTenantHeaders();
  const tenant = useTenant();
  const [data, setData] = useState<PPRFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPPR = useCallback(async () => {
    if (!awardId || tenant.isLoading) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ awardId, periodStart, periodEnd, formType: "ppr" });
      const res = await fetch(`/api/awards/form-data?${params}`, {
        headers: { ...headers, "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`Failed to fetch PPR data: ${res.status}`);
      const formData = await res.json();
      setData(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load form data");
    } finally {
      setLoading(false);
    }
  }, [awardId, periodStart, periodEnd, headers, tenant.isLoading]);

  useEffect(() => { fetchPPR(); }, [awardId, tenant.isLoading, tenant.portId]);

  return { data, loading, error, refresh: fetchPPR };
}

// ─── BABA Hook ───

export function useBABAFormData(awardId: string | null, periodStart: string, periodEnd: string): FormDataHookResult<BABAFormData> {
  const headers = useTenantHeaders();
  const tenant = useTenant();
  const [data, setData] = useState<BABAFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBABA = useCallback(async () => {
    if (!awardId || tenant.isLoading) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ awardId, periodStart, periodEnd, formType: "baba" });
      const res = await fetch(`/api/awards/form-data?${params}`, {
        headers: { ...headers, "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`Failed to fetch BABA data: ${res.status}`);
      const formData = await res.json();
      setData(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load form data");
    } finally {
      setLoading(false);
    }
  }, [awardId, periodStart, periodEnd, headers, tenant.isLoading]);

  useEffect(() => { fetchBABA(); }, [awardId, tenant.isLoading, tenant.portId]);

  return { data, loading, error, refresh: fetchBABA };
}

// ─── Financial Summary Hook ───

export function useReportSummary(awardId: string | null, periodStart: string, periodEnd: string): FormDataHookResult<ReportSummaryData> {
  const headers = useTenantHeaders();
  const tenant = useTenant();
  const [data, setData] = useState<ReportSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    if (!awardId || tenant.isLoading) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ awardId, formType: "summary" });
      if (periodStart) params.set("periodStart", periodStart);
      if (periodEnd) params.set("periodEnd", periodEnd);
      const res = await fetch(`/api/awards/form-data?${params}`, {
        headers: { ...headers, "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`Failed to fetch summary: ${res.status}`);
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load summary");
    } finally {
      setLoading(false);
    }
  }, [awardId, periodStart, periodEnd, headers, tenant.isLoading]);

  useEffect(() => { fetchSummary(); }, [awardId, tenant.isLoading, tenant.portId]);

  return { data, loading, error, refresh: fetchSummary };
}

// ─── Drawdowns Hook ───

export function useDrawdowns(awardId: string | null): FormDataHookResult<DrawdownRequest[]> {
  const headers = useTenantHeaders();
  const tenant = useTenant();
  const [data, setData] = useState<DrawdownRequest[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDrawdowns = useCallback(async () => {
    if (!awardId || tenant.isLoading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/awards/drawdowns?awardId=${awardId}`, {
        headers: { ...headers, "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`Failed to fetch drawdowns: ${res.status}`);
      const json = await res.json();
      setData(json.drawdowns || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load drawdowns");
    } finally {
      setLoading(false);
    }
  }, [awardId, headers, tenant.isLoading]);

  useEffect(() => { fetchDrawdowns(); }, [awardId, tenant.isLoading, tenant.portId]);

  return { data, loading, error, refresh: fetchDrawdowns };
}

// ─── Debounce helper ───

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function useDebouncedCallback<T extends (...args: any[]) => void>(fn: T, delayMs: number): T {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return useCallback((...args: unknown[]) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fnRef.current(...args), delayMs);
  }, [delayMs]) as unknown as T;
}

// ─── Draft Loader (reads saved generatedContent from report) ───

export interface DraftLoaderResult {
  draft: unknown | null;
  narrativeDraft: string | null;
  loading: boolean;
}

export function useDraftLoader(reportId: string | null): DraftLoaderResult {
  const headers = useTenantHeaders();
  const tenant = useTenant();
  const [draft, setDraft] = useState<unknown | null>(null);
  const [narrativeDraft, setNarrativeDraft] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!reportId || tenant.isLoading) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/reports?reportId=${reportId}`, {
          headers: { ...headers, "Content-Type": "application/json" },
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          const reports = data.reports || [];
          const report = Array.isArray(reports)
            ? reports.find((r: { id: string }) => r.id === reportId)
            : null;
          if (report?.generatedContent && Object.keys(report.generatedContent).length > 0) {
            setDraft(report.generatedContent);
          }
          if (report?.narrativeDraft) {
            setNarrativeDraft(report.narrativeDraft);
          }
        }
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [reportId, tenant.isLoading, tenant.portId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { draft, narrativeDraft, loading };
}

// ─── Draft Persistence (saves to ScheduledReport.generatedContent) ───

export interface DraftPersistenceResult {
  saveDraft: (content: unknown, narrativeDraft?: string) => void;
  saveDraftImmediate: (content: unknown, narrativeDraft?: string) => Promise<boolean>;
  lastSaved: Date | null;
  saving: boolean;
  saveError: string | null;
}

export function useDraftPersistence(reportId: string | null, debounceMs = 800): DraftPersistenceResult {
  const headers = useTenantHeaders();
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const doSave = useCallback(async (content: unknown, narrativeDraft?: string): Promise<boolean> => {
    if (!reportId) return false;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId,
          action: "updateContent",
          generatedContent: content,
          narrativeDraft,
        }),
      });
      if (!res.ok) {
        setSaveError("Failed to save draft");
        return false;
      }
      setLastSaved(new Date());
      return true;
    } catch {
      setSaveError("Failed to save draft");
      return false;
    } finally {
      setSaving(false);
    }
  }, [reportId, headers]);

  const saveDraft = useDebouncedCallback(
    (content: unknown, narrativeDraft?: string) => { doSave(content, narrativeDraft); },
    debounceMs
  );

  return { saveDraft, saveDraftImmediate: doSave, lastSaved, saving, saveError };
}
