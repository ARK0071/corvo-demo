"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Plus,
  Shield,
  FileText,
  DollarSign,
  CheckCircle2,
  XCircle,
  ChevronRight,
  X,
  Receipt,
  MapPin,
  MessageSquare,
  Calendar,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useTenantHeaders, useTenant } from "@/contexts/tenant-context";

// ─── Types ───

interface SubrecipientReport {
  id: string;
  reportType: string;
  title: string;
  dueDate: string;
  status: string;
  receivedDate?: string;
}

interface Subrecipient {
  id: string;
  awardId: string;
  entityName: string;
  uei?: string;
  classification: string;
  riskLevel: string;
  monitoringIntensity: string;
  subawardAmount: number;
  cumulativeSpend: number;
  singleAuditRequired: boolean;
  status: string;
  reports: SubrecipientReport[];
  award: { title: string; program: string; fain?: string };
}

interface Award {
  id: string;
  title: string;
  program: string;
}

// ─── Helpers ───

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function fmtFull(n: number): string { return `$${n.toLocaleString()}`; }

function riskColor(level: string): string {
  const map: Record<string, string> = {
    low: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    standard: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    elevated: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return map[level] || "bg-gray-100 text-gray-600";
}

// ─── Classification Wizard ───

const CLASSIFICATION_QUESTIONS = [
  { id: "q1", text: "Does the entity determine who is eligible to receive federal assistance?" },
  { id: "q2", text: "Does the entity have its performance measured against program objectives?" },
  { id: "q3", text: "Does the entity have responsibility for programmatic decision-making?" },
  { id: "q4", text: "Does the entity have responsibility for adherence to applicable federal program requirements?" },
  { id: "q5", text: "Does the entity use federal funds to carry out a program vs. providing goods/services?" },
];

// ─── Page ───

type TabId = "entities" | "documents" | "expenses" | "visits";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "entities", label: "Entities", icon: <Users className="h-3.5 w-3.5" /> },
  { id: "documents", label: "Document Review", icon: <FileText className="h-3.5 w-3.5" /> },
  { id: "expenses", label: "Expense Review", icon: <Receipt className="h-3.5 w-3.5" /> },
  { id: "visits", label: "Monitoring Visits", icon: <MapPin className="h-3.5 w-3.5" /> },
];

export default function SubrecipientsPage() {
  const headers = useTenantHeaders();
  const tenant = useTenant();
  const [subs, setSubs] = useState<Subrecipient[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("entities");

  const fetchData = useCallback(async () => {
    if (tenant.isLoading) return;
    setLoading(true);
    try {
      const [subsRes, awardsRes] = await Promise.all([
        fetch("/api/subrecipients", { headers: { ...headers, "Content-Type": "application/json" } }),
        fetch("/api/awards", { headers: { ...headers, "Content-Type": "application/json" } }),
      ]);
      if (subsRes.ok) {
        const data = await subsRes.json();
        setSubs(data.subrecipients || []);
      }
      if (awardsRes.ok) {
        const data = await awardsRes.json();
        setAwards(data.awards || data || []);
      }
    } catch { /* */ }
    setLoading(false);
  }, [headers, tenant.isLoading]);

  useEffect(() => { fetchData(); }, [tenant.isLoading, tenant.portId]);

  // ─── Wizard ───

  if (showWizard) {
    return (
      <ClassificationWizard
        awards={awards}
        headers={headers}
        onBack={() => setShowWizard(false)}
        onCreated={() => { setShowWizard(false); fetchData(); }}
      />
    );
  }

  if (loading) {
    return <div className="flex-1 flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  // Stats
  const totalSubs = subs.filter((s) => s.classification === "subrecipient").length;
  const totalContractors = subs.filter((s) => s.classification === "contractor").length;
  const highRisk = subs.filter((s) => s.riskLevel === "high" || s.riskLevel === "elevated").length;
  const overdueReports = subs.flatMap((s) => s.reports).filter((r) => r.status === "pending" && new Date(r.dueDate) < new Date()).length;
  const nearThreshold = subs.filter((s) => {
    const spend = Number(s.cumulativeSpend);
    return spend >= 600000 && spend < 750000;
  }).length;

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-5 w-5 text-[#3d8b8b]" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">2 CFR 200.331-332</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Subrecipient Monitoring</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Classification, risk assessment, and report collection</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh</Button>
          <Button size="sm" onClick={() => setShowWizard(true)}><Plus className="h-3.5 w-3.5 mr-1" /> Add Entity</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-[#3d8b8b] text-[#3d8b8b]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "documents" && (
        <DocumentReviewTab headers={headers} />
      )}
      {activeTab === "expenses" && (
        <ExpenseReviewTab headers={headers} />
      )}
      {activeTab === "visits" && (
        <VisitManagementTab headers={headers} subs={subs} />
      )}

      {activeTab !== "entities" ? null : (
      <>
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-muted-foreground uppercase">Subrecipients</p>
            <p className="text-2xl font-bold text-[#3d8b8b] mt-1">{totalSubs}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-muted-foreground uppercase">Contractors</p>
            <p className="text-2xl font-bold mt-1">{totalContractors}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-muted-foreground uppercase">High/Elevated Risk</p>
            <p className={`text-2xl font-bold mt-1 ${highRisk > 0 ? "text-red-600" : "text-emerald-600"}`}>{highRisk}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-muted-foreground uppercase">Overdue Reports</p>
            <p className={`text-2xl font-bold mt-1 ${overdueReports > 0 ? "text-red-600" : "text-emerald-600"}`}>{overdueReports}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-xs text-muted-foreground uppercase">Near $750K</p>
            <p className={`text-2xl font-bold mt-1 ${nearThreshold > 0 ? "text-amber-600" : "text-emerald-600"}`}>{nearThreshold}</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> All Entities
          </CardTitle>
        </CardHeader>
        <CardContent>
          {subs.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No subrecipients or contractors added yet</p>
              <Button size="sm" className="mt-3" onClick={() => setShowWizard(true)}><Plus className="h-3.5 w-3.5 mr-1" /> Add First Entity</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Entity</th>
                    <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Award</th>
                    <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Type</th>
                    <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Risk</th>
                    <th className="text-right py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Subaward</th>
                    <th className="text-right py-2 pr-4 text-xs font-medium text-muted-foreground uppercase">Spend</th>
                    <th className="text-left py-2 text-xs font-medium text-muted-foreground uppercase">Reports</th>
                    <th className="py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {subs.map((sub) => {
                    const spend = Number(sub.cumulativeSpend);
                    const nearLimit = spend >= 600000 && spend < 750000;
                    const overLimit = spend >= 750000;
                    const overdueCount = sub.reports.filter((r) => r.status === "pending" && new Date(r.dueDate) < new Date()).length;

                    return (
                      <tr key={sub.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-2.5 pr-4">
                          <div>
                            <p className="font-medium">{sub.entityName}</p>
                            {sub.uei && <p className="text-xs text-muted-foreground">UEI: {sub.uei}</p>}
                          </div>
                        </td>
                        <td className="py-2.5 pr-4">
                          <Badge variant="outline" className="text-[10px]">{sub.award.program}</Badge>
                        </td>
                        <td className="py-2.5 pr-4">
                          <Badge className={sub.classification === "subrecipient" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" : "bg-gray-100 text-gray-700"} >
                            {sub.classification}
                          </Badge>
                        </td>
                        <td className="py-2.5 pr-4">
                          <Badge className={`text-[10px] ${riskColor(sub.riskLevel)}`}>{sub.riskLevel}</Badge>
                        </td>
                        <td className="py-2.5 pr-4 text-right tabular-nums">{fmt(Number(sub.subawardAmount))}</td>
                        <td className="py-2.5 pr-4 text-right">
                          <span className={`tabular-nums font-medium ${overLimit ? "text-red-600" : nearLimit ? "text-amber-600" : ""}`}>
                            {fmt(spend)}
                          </span>
                          {(nearLimit || overLimit) && (
                            <p className="text-[10px] text-amber-600">{overLimit ? "Single Audit req'd" : "Approaching $750K"}</p>
                          )}
                        </td>
                        <td className="py-2.5">
                          {sub.reports.length === 0 ? (
                            <span className="text-xs text-muted-foreground">-</span>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className="text-xs tabular-nums">{sub.reports.filter((r) => r.status === "received").length}/{sub.reports.length}</span>
                              {overdueCount > 0 && (
                                <Badge className="bg-red-100 text-red-700 text-[9px]">{overdueCount} overdue</Badge>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 text-center">
                          <span
                            onClick={async () => {
                              if (!confirm(`Delete ${sub.entityName}?`)) return;
                              await fetch("/api/subrecipients", {
                                method: "DELETE",
                                headers: { ...headers, "Content-Type": "application/json" },
                                body: JSON.stringify({ id: sub.id }),
                              });
                              fetchData();
                            }}
                            className="inline-flex p-1 rounded cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 text-muted-foreground hover:text-red-600 transition-colors"
                            title="Delete subrecipient"
                          >
                            <X className="h-3.5 w-3.5" />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      </>
      )}
    </div>
  );
}

// ─── Document Review Tab ───

interface ReviewDoc {
  id: string;
  title: string;
  category: string;
  description: string;
  status: string;
  createdAt: string;
  subrecipient: { entityName: string };
  award: { title: string; fain: string };
  uploadedBy: { name: string };
  report: { title: string; reportType: string; dueDate: string } | null;
  comments: Array<{ id: string; body: string; createdAt: string; user: { id: string; name: string; role: string } }>;
}

function DocumentReviewTab({ headers }: { headers: Record<string, string> }) {
  const [docs, setDocs] = useState<ReviewDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ReviewDoc | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [commentText, setCommentText] = useState("");
  const [filterStatus, setFilterStatus] = useState("uploaded");

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/subrecipients/documents/review?status=${filterStatus}`, {
        headers: { ...headers, "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        setDocs(data.documents || []);
      }
    } catch { /* */ }
    setLoading(false);
  }, [headers, filterStatus]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleReview = async (id: string, action: "accept" | "reject") => {
    if (action === "reject" && !reviewNotes.trim()) {
      alert("Notes are required when rejecting a document");
      return;
    }
    await fetch("/api/subrecipients/documents/review", {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, reviewNotes: reviewNotes || undefined }),
    });
    setSelected(null);
    setReviewNotes("");
    fetchDocs();
  };

  const handleComment = async (docId: string) => {
    if (!commentText.trim()) return;
    await fetch("/api/sub/comments", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: docId, body: commentText }),
    });
    setCommentText("");
    fetchDocs();
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <>
      {/* Filter */}
      <div className="flex gap-2">
        {["uploaded", "accepted", "rejected"].map((s) => (
          <Button
            key={s}
            size="sm"
            variant={filterStatus === s ? "default" : "outline"}
            onClick={() => setFilterStatus(s)}
            className="capitalize text-xs"
          >
            {s} ({docs.length})
          </Button>
        ))}
      </div>

      {docs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No {filterStatus} documents to review
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => (
            <Card key={doc.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setSelected(doc); setReviewNotes(""); }}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.subrecipient.entityName} &middot; {doc.award.fain} &middot; {doc.category.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Uploaded by {doc.uploadedBy.name} on {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {doc.comments.length > 0 && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MessageSquare className="h-3 w-3" />{doc.comments.length}
                      </span>
                    )}
                    <Badge className={doc.status === "uploaded" ? "bg-blue-100 text-blue-700" : doc.status === "accepted" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>
                      {doc.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Review Sheet */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>Review Document</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <p className="font-medium">{selected.title}</p>
                  <p className="text-sm text-muted-foreground capitalize">{selected.category.replace(/_/g, " ")}</p>
                  <p className="text-sm text-muted-foreground">{selected.subrecipient.entityName}</p>
                </div>
                {selected.description && <p className="text-sm">{selected.description}</p>}
                {selected.report && (
                  <div className="text-sm p-2 bg-muted rounded">
                    Linked report: {selected.report.title} (due {new Date(selected.report.dueDate).toLocaleDateString()})
                  </div>
                )}

                {selected.status === "uploaded" && (
                  <div className="space-y-3 p-3 border rounded-lg">
                    <p className="text-sm font-medium">Review Action</p>
                    <Textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Review notes (required for rejection)"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleReview(selected.id, "accept")} className="bg-emerald-600 hover:bg-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Accept
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleReview(selected.id, "reject")}>
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                      </Button>
                    </div>
                  </div>
                )}

                {/* Comments */}
                <div>
                  <p className="text-sm font-medium mb-2">Comments</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selected.comments.map((c) => (
                      <div key={c.id} className="p-2 bg-muted rounded text-sm">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <span className="font-medium">{c.user.name}</span> &middot; {new Date(c.createdAt).toLocaleDateString()}
                          {c.user.role === "subrecipient" && <Badge variant="outline" className="text-[9px] px-1 py-0 ml-1">Sub</Badge>}
                        </div>
                        <p>{c.body}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Add a comment..."
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleComment(selected.id); } }}
                    />
                    <Button size="sm" onClick={() => handleComment(selected.id)} disabled={!commentText.trim()}>Send</Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

// ─── Expense Review Tab ───

interface ReviewExpense {
  id: string;
  category: string;
  description: string;
  amount: number;
  expenseDate: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  reportingMode: string;
  status: string;
  submittedAt: string | null;
  reviewNotes: string | null;
  subrecipient: { entityName: string; subawardAmount: number; cumulativeSpend: number };
  award: { title: string; fain: string };
  createdBy: { name: string };
  comments: Array<{ id: string; body: string; createdAt: string; user: { id: string; name: string; role: string } }>;
}

function ExpenseReviewTab({ headers }: { headers: Record<string, string> }) {
  const [expenses, setExpenses] = useState<ReviewExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ReviewExpense | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [commentText, setCommentText] = useState("");
  const [filterStatus, setFilterStatus] = useState("submitted");

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/subrecipients/expenses/review?status=${filterStatus}`, {
        headers: { ...headers, "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses || []);
      }
    } catch { /* */ }
    setLoading(false);
  }, [headers, filterStatus]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const handleReview = async (id: string, action: "approve" | "reject") => {
    if (action === "reject" && !reviewNotes.trim()) {
      alert("Notes are required when rejecting an expense");
      return;
    }
    await fetch("/api/subrecipients/expenses/review", {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, reviewNotes: reviewNotes || undefined }),
    });
    setSelected(null);
    setReviewNotes("");
    fetchExpenses();
  };

  const handleComment = async (expenseId: string) => {
    if (!commentText.trim()) return;
    await fetch("/api/sub/comments", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ expenseId, body: commentText }),
    });
    setCommentText("");
    fetchExpenses();
  };

  const totalPending = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {["submitted", "approved", "rejected"].map((s) => (
            <Button key={s} size="sm" variant={filterStatus === s ? "default" : "outline"} onClick={() => setFilterStatus(s)} className="capitalize text-xs">
              {s}
            </Button>
          ))}
        </div>
        {filterStatus === "submitted" && expenses.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {expenses.length} pending &middot; {fmt(totalPending)} total
          </p>
        )}
      </div>

      {expenses.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No {filterStatus} expenses to review
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {expenses.map((exp) => (
            <Card key={exp.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setSelected(exp); setReviewNotes(""); }}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <Receipt className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">{exp.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {exp.subrecipient.entityName} &middot; {exp.category.replace(/_/g, " ")}
                        {exp.expenseDate && ` &middot; ${new Date(exp.expenseDate).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm">{fmt(Number(exp.amount))}</span>
                    <Badge className={exp.status === "submitted" ? "bg-blue-100 text-blue-700" : exp.status === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>
                      {exp.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>Review Expense</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <p className="font-medium">{selected.description}</p>
                  <p className="text-lg font-semibold">{fmtFull(Number(selected.amount))}</p>
                </div>
                <div className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Entity:</span> {selected.subrecipient.entityName}</p>
                  <p><span className="text-muted-foreground">Award:</span> {selected.award.fain}</p>
                  <p><span className="text-muted-foreground">Category:</span> <span className="capitalize">{selected.category.replace(/_/g, " ")}</span></p>
                  <p><span className="text-muted-foreground">Submitted by:</span> {selected.createdBy.name}</p>
                  <p><span className="text-muted-foreground">Cumulative spend:</span> {fmtFull(Number(selected.subrecipient.cumulativeSpend))} / {fmtFull(Number(selected.subrecipient.subawardAmount))}</p>
                  {Number(selected.subrecipient.cumulativeSpend) + Number(selected.amount) >= 750000 && (
                    <Badge variant="destructive" className="text-[10px]">Approval will trigger Single Audit requirement</Badge>
                  )}
                </div>

                {selected.status === "submitted" && (
                  <div className="space-y-3 p-3 border rounded-lg">
                    <p className="text-sm font-medium">Review Action</p>
                    <Textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="Review notes (required for rejection)" rows={3} />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleReview(selected.id, "approve")} className="bg-emerald-600 hover:bg-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleReview(selected.id, "reject")}>
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                      </Button>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium mb-2">Comments</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selected.comments.map((c) => (
                      <div key={c.id} className="p-2 bg-muted rounded text-sm">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <span className="font-medium">{c.user.name}</span> &middot; {new Date(c.createdAt).toLocaleDateString()}
                          {c.user.role === "subrecipient" && <Badge variant="outline" className="text-[9px] px-1 py-0 ml-1">Sub</Badge>}
                        </div>
                        <p>{c.body}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Add a comment..."
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleComment(selected.id); } }}
                    />
                    <Button size="sm" onClick={() => handleComment(selected.id)} disabled={!commentText.trim()}>Send</Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

// ─── Visit Management Tab ───

interface VisitData {
  id: string;
  type: string;
  scheduledDate: string;
  status: string;
  location: string | null;
  agenda: string;
  findings: string | null;
  findingsSeverity: string | null;
  followUpDueDate: string | null;
  subrecipient: { entityName: string };
  award: { title: string; fain: string };
  scheduledBy: { name: string };
  confirmedBy: { name: string } | null;
  completedBy: { name: string } | null;
  comments: Array<{ id: string; body: string; createdAt: string; user: { id: string; name: string; role: string } }>;
}

function VisitManagementTab({ headers, subs }: { headers: Record<string, string>; subs: Subrecipient[] }) {
  const [visits, setVisits] = useState<VisitData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<VisitData | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    subrecipientId: "",
    type: "desk_review",
    scheduledDate: "",
    location: "",
    agenda: "",
  });
  const [completeForm, setCompleteForm] = useState({
    findings: "",
    findingsSeverity: "none",
    followUpDueDate: "",
  });
  const [scheduling, setScheduling] = useState(false);

  const fetchVisits = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/subrecipients/visits", {
        headers: { ...headers, "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        setVisits(data.visits || []);
      }
    } catch { /* */ }
    setLoading(false);
  }, [headers]);

  useEffect(() => { fetchVisits(); }, [fetchVisits]);

  const handleSchedule = async () => {
    if (!scheduleForm.subrecipientId || !scheduleForm.scheduledDate) return;
    setScheduling(true);
    const sub = subs.find((s) => s.id === scheduleForm.subrecipientId);
    try {
      await fetch("/api/subrecipients/visits", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          subrecipientId: scheduleForm.subrecipientId,
          awardId: sub?.awardId,
          type: scheduleForm.type,
          scheduledDate: scheduleForm.scheduledDate,
          location: scheduleForm.location || undefined,
          agenda: scheduleForm.agenda,
        }),
      });
      setShowSchedule(false);
      setScheduleForm({ subrecipientId: "", type: "desk_review", scheduledDate: "", location: "", agenda: "" });
      fetchVisits();
    } catch { /* */ }
    setScheduling(false);
  };

  const handleComplete = async (id: string) => {
    await fetch("/api/subrecipients/visits", {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        action: "complete",
        findings: completeForm.findings || undefined,
        findingsSeverity: completeForm.findingsSeverity,
        followUpDueDate: completeForm.followUpDueDate || undefined,
      }),
    });
    setSelected(null);
    setCompleteForm({ findings: "", findingsSeverity: "none", followUpDueDate: "" });
    fetchVisits();
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this visit?")) return;
    await fetch("/api/subrecipients/visits", {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "cancel" }),
    });
    setSelected(null);
    fetchVisits();
  };

  const visitStatusColor = (status: string) => {
    const map: Record<string, string> = {
      proposed: "bg-blue-100 text-blue-700",
      confirmed: "bg-emerald-100 text-emerald-700",
      completed: "bg-gray-100 text-gray-700",
      cancelled: "bg-red-100 text-red-700",
      rescheduled: "bg-amber-100 text-amber-700",
    };
    return map[status] || "bg-gray-100 text-gray-700";
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <>
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowSchedule(true)}>
          <Calendar className="h-3.5 w-3.5 mr-1" /> Schedule Visit
        </Button>
      </div>

      {visits.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No monitoring visits scheduled yet
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {visits.map((visit) => (
            <Card key={visit.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelected(visit)}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium capitalize">{visit.type.replace(/_/g, " ")}</p>
                      <p className="text-xs text-muted-foreground">
                        {visit.subrecipient.entityName} &middot; {new Date(visit.scheduledDate).toLocaleDateString()}
                        {visit.location && ` &middot; ${visit.location}`}
                      </p>
                    </div>
                  </div>
                  <Badge className={visitStatusColor(visit.status)}>{visit.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Schedule Sheet */}
      <Sheet open={showSchedule} onOpenChange={setShowSchedule}>
        <SheetContent>
          <SheetHeader><SheetTitle>Schedule Monitoring Visit</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Subrecipient</label>
              <select
                value={scheduleForm.subrecipientId}
                onChange={(e) => setScheduleForm((f) => ({ ...f, subrecipientId: e.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm mt-1"
              >
                <option value="">Select...</option>
                {subs.map((s) => <option key={s.id} value={s.id}>{s.entityName}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Type</label>
              <select
                value={scheduleForm.type}
                onChange={(e) => setScheduleForm((f) => ({ ...f, type: e.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm mt-1"
              >
                <option value="desk_review">Desk Review</option>
                <option value="site_visit">Site Visit</option>
                <option value="financial_review">Financial Review</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Date</label>
              <Input type="date" value={scheduleForm.scheduledDate} onChange={(e) => setScheduleForm((f) => ({ ...f, scheduledDate: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Location</label>
              <Input value={scheduleForm.location} onChange={(e) => setScheduleForm((f) => ({ ...f, location: e.target.value }))} placeholder="Optional" />
            </div>
            <div>
              <label className="text-sm font-medium">Agenda</label>
              <Textarea value={scheduleForm.agenda} onChange={(e) => setScheduleForm((f) => ({ ...f, agenda: e.target.value }))} placeholder="Topics to cover..." rows={4} />
            </div>
            <Button onClick={handleSchedule} disabled={!scheduleForm.subrecipientId || !scheduleForm.scheduledDate || scheduling} className="w-full">
              {scheduling ? "Scheduling..." : "Schedule Visit"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Visit Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="overflow-y-auto">
          {selected && (
            <>
              <SheetHeader><SheetTitle className="capitalize">{selected.type.replace(/_/g, " ")}</SheetTitle></SheetHeader>
              <div className="space-y-4 mt-4">
                <Badge className={visitStatusColor(selected.status)}>{selected.status}</Badge>
                <div className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Entity:</span> {selected.subrecipient.entityName}</p>
                  <p><span className="text-muted-foreground">Date:</span> {new Date(selected.scheduledDate).toLocaleDateString()}</p>
                  {selected.location && <p><span className="text-muted-foreground">Location:</span> {selected.location}</p>}
                  <p><span className="text-muted-foreground">Scheduled by:</span> {selected.scheduledBy.name}</p>
                  {selected.confirmedBy && <p><span className="text-muted-foreground">Confirmed by:</span> {selected.confirmedBy.name}</p>}
                </div>
                {selected.agenda && (
                  <div>
                    <p className="text-sm font-medium mb-1">Agenda</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selected.agenda}</p>
                  </div>
                )}

                {selected.findings && (
                  <div className="p-3 border rounded-lg">
                    <p className="text-sm font-medium mb-1">Findings</p>
                    <p className="text-sm">{selected.findings}</p>
                    {selected.findingsSeverity && selected.findingsSeverity !== "none" && (
                      <Badge className="mt-1" variant={selected.findingsSeverity === "material" ? "destructive" : "outline"}>
                        {selected.findingsSeverity}
                      </Badge>
                    )}
                  </div>
                )}

                {selected.status === "confirmed" && (
                  <div className="space-y-3 p-3 border rounded-lg">
                    <p className="text-sm font-medium">Complete Visit</p>
                    <Textarea value={completeForm.findings} onChange={(e) => setCompleteForm((f) => ({ ...f, findings: e.target.value }))} placeholder="Findings..." rows={3} />
                    <div>
                      <label className="text-sm font-medium">Severity</label>
                      <select
                        value={completeForm.findingsSeverity}
                        onChange={(e) => setCompleteForm((f) => ({ ...f, findingsSeverity: e.target.value }))}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm mt-1"
                      >
                        <option value="none">None</option>
                        <option value="minor">Minor</option>
                        <option value="major">Major</option>
                        <option value="material">Material</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Follow-up Due Date</label>
                      <Input type="date" value={completeForm.followUpDueDate} onChange={(e) => setCompleteForm((f) => ({ ...f, followUpDueDate: e.target.value }))} />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleComplete(selected.id)}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Complete
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleCancel(selected.id)}>Cancel Visit</Button>
                    </div>
                  </div>
                )}

                {(selected.status === "proposed" || selected.status === "rescheduled") && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="destructive" onClick={() => handleCancel(selected.id)}>Cancel Visit</Button>
                  </div>
                )}

                {selected.comments.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Comments</p>
                    <div className="space-y-2">
                      {selected.comments.map((c) => (
                        <div key={c.id} className="p-2 bg-muted rounded text-sm">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                            <span className="font-medium">{c.user.name}</span> &middot; {new Date(c.createdAt).toLocaleDateString()}
                          </div>
                          <p>{c.body}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

// ─── Classification Wizard Component ───

function ClassificationWizard({ awards, headers, onBack, onCreated }: {
  awards: Award[];
  headers: Record<string, string>;
  onBack: () => void;
  onCreated: () => void;
}) {
  const [step, setStep] = useState(0); // 0=info, 1=classification, 2=risk, 3=review
  const [entityName, setEntityName] = useState("");
  const [uei, setUei] = useState("");
  const [selectedAwardId, setSelectedAwardId] = useState(awards[0]?.id || "");
  const [subawardAmount, setSubawardAmount] = useState("");
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [riskFactors, setRiskFactors] = useState<Record<string, boolean>>({
    newEntity: false, priorFindings: false, highSpend: false, noSingleAudit: false, lateReporting: false,
  });
  const [saving, setSaving] = useState(false);

  const yesCount = Object.values(answers).filter(Boolean).length;
  const classification = yesCount >= 3 ? "subrecipient" : "contractor";

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/subrecipients", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          awardId: selectedAwardId,
          entityName,
          uei: uei || undefined,
          subawardAmount: parseFloat(subawardAmount) || 0,
          classificationAnswers: CLASSIFICATION_QUESTIONS.map((q) => ({
            questionId: q.id,
            question: q.text,
            answer: answers[q.id] || false,
          })),
          riskFactors,
        }),
      });
      if (res.ok) onCreated();
    } catch { /* */ }
    setSaving(false);
  };

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div>
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ChevronRight className="h-4 w-4 rotate-180" /> Back
        </button>
        <h1 className="text-2xl font-bold tracking-tight">Add Entity</h1>
        <p className="text-sm text-muted-foreground mt-1">Classification wizard per 2 CFR 200.331</p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2">
        {["Entity Info", "Classification", "Risk Assessment", "Review"].map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <button
              onClick={() => i <= step ? setStep(i) : null}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                i === step ? "bg-[#3d8b8b] text-white" : i < step ? "bg-[#3d8b8b]/10 text-[#3d8b8b]" : "bg-muted text-muted-foreground"
              }`}
            >
              {i < step ? <CheckCircle2 className="h-3 w-3" /> : null}
              {label}
            </button>
            {i < 3 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Step 0: Info */}
      {step === 0 && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Entity Name *</label>
              <input value={entityName} onChange={(e) => setEntityName(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="e.g., ABC Engineering Corp" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">UEI (optional)</label>
              <input value={uei} onChange={(e) => setUei(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Unique Entity Identifier" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Award *</label>
              <select value={selectedAwardId} onChange={(e) => setSelectedAwardId(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                {awards.map((a) => <option key={a.id} value={a.id}>{a.program} — {a.title}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Subaward Amount *</label>
              <input type="number" value={subawardAmount} onChange={(e) => setSubawardAmount(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="0" />
            </div>
            <Button onClick={() => setStep(1)} disabled={!entityName || !subawardAmount}>Next: Classification</Button>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Classification questions */}
      {step === 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Subrecipient vs Contractor (2 CFR 200.331)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {CLASSIFICATION_QUESTIONS.map((q) => (
              <div key={q.id} className="flex items-start gap-3 p-3 rounded-lg border">
                <div className="flex gap-2 shrink-0 mt-0.5">
                  <button
                    onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: true }))}
                    className={`px-2 py-1 rounded text-xs font-medium ${answers[q.id] === true ? "bg-[#3d8b8b] text-white" : "bg-muted"}`}
                  >Yes</button>
                  <button
                    onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: false }))}
                    className={`px-2 py-1 rounded text-xs font-medium ${answers[q.id] === false ? "bg-gray-600 text-white" : "bg-muted"}`}
                  >No</button>
                </div>
                <p className="text-sm">{q.text}</p>
              </div>
            ))}
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30">
              <Shield className={`h-5 w-5 ${classification === "subrecipient" ? "text-purple-500" : "text-gray-500"}`} />
              <div>
                <p className="text-sm font-medium">Classification: <span className={classification === "subrecipient" ? "text-purple-600" : ""}>{classification}</span></p>
                <p className="text-xs text-muted-foreground">{yesCount}/5 criteria met — {classification === "subrecipient" ? "monitoring obligations apply" : "standard contract management"}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
              <Button onClick={() => setStep(2)}>Next: Risk Assessment</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Risk Assessment */}
      {step === 2 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Risk Assessment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { key: "newEntity", label: "New entity (no prior federal award history)" },
              { key: "priorFindings", label: "Prior audit findings or questioned costs" },
              { key: "highSpend", label: "High spend volume (>$500K subaward)" },
              { key: "noSingleAudit", label: "No Single Audit on file when required" },
              { key: "lateReporting", label: "History of late or incomplete reporting" },
            ].map((factor) => (
              <label key={factor.key} className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50">
                <input
                  type="checkbox"
                  checked={riskFactors[factor.key] || false}
                  onChange={(e) => setRiskFactors((prev) => ({ ...prev, [factor.key]: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">{factor.label}</span>
              </label>
            ))}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)}>Next: Review</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Review & Create</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Entity:</span> <span className="font-medium">{entityName}</span></div>
              <div><span className="text-muted-foreground">UEI:</span> <span className="font-medium">{uei || "N/A"}</span></div>
              <div><span className="text-muted-foreground">Subaward:</span> <span className="font-medium">{fmtFull(parseFloat(subawardAmount) || 0)}</span></div>
              <div><span className="text-muted-foreground">Classification:</span> <Badge className={classification === "subrecipient" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-700"}>{classification}</Badge></div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                Create Entity
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
