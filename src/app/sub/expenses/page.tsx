"use client";

import { useEffect, useState, useCallback } from "react";
import { useTenantHeaders } from "@/contexts/tenant-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Receipt,
  Plus,
  Send,
  DollarSign,
  MessageSquare,
} from "lucide-react";

interface Expense {
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
  reviewedBy: { name: string } | null;
  comments: Array<{
    id: string;
    body: string;
    createdAt: string;
    user: { id: string; name: string; role: string };
  }>;
  createdAt: string;
}

const CATEGORIES = [
  { value: "personnel", label: "Personnel" },
  { value: "fringe", label: "Fringe Benefits" },
  { value: "travel", label: "Travel" },
  { value: "equipment", label: "Equipment" },
  { value: "supplies", label: "Supplies" },
  { value: "contractual", label: "Contractual" },
  { value: "construction", label: "Construction" },
  { value: "indirect", label: "Indirect Costs" },
  { value: "other", label: "Other" },
];

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  submitted: "bg-blue-100 text-blue-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

function formatCurrency(val: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(val);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function SubExpenses() {
  const headers = useTenantHeaders();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [reportingMode, setReportingMode] = useState("line_item");
  const [subawardAmount, setSubawardAmount] = useState(0);
  const [cumulativeSpend, setCumulativeSpend] = useState(0);
  const [categoryTotals, setCategoryTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [commentText, setCommentText] = useState("");
  const [awardId, setAwardId] = useState("");
  const [form, setForm] = useState({
    category: "",
    description: "",
    amount: "",
    expenseDate: "",
    periodStart: "",
    periodEnd: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchExpenses = useCallback(async () => {
    try {
      const res = await fetch("/api/sub/expenses", { headers });
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses);
        setReportingMode(data.reportingMode);
        setSubawardAmount(Number(data.subawardAmount));
        setCumulativeSpend(Number(data.cumulativeSpend));
        setCategoryTotals(data.categoryTotals);
      }
    } finally {
      setLoading(false);
    }
  }, [headers]);

  // Fetch awardId from dashboard
  useEffect(() => {
    fetch("/api/sub/dashboard", { headers })
      .then((r) => r.json())
      .then((d) => setAwardId(d.award.id))
      .catch(() => {});
  }, [headers]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleCreate = async () => {
    if (!form.category || !form.description || !form.amount || !awardId) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/sub/expenses", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          awardId,
          category: form.category,
          description: form.description,
          amount: parseFloat(form.amount),
          expenseDate: form.expenseDate || undefined,
          periodStart: form.periodStart || undefined,
          periodEnd: form.periodEnd || undefined,
        }),
      });

      if (res.ok) {
        setShowCreate(false);
        setForm({
          category: "",
          description: "",
          amount: "",
          expenseDate: "",
          periodStart: "",
          periodEnd: "",
        });
        fetchExpenses();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create expense");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitDrafts = async () => {
    const draftIds = expenses
      .filter((e) => e.status === "draft")
      .map((e) => e.id);
    if (draftIds.length === 0) return;

    const res = await fetch("/api/sub/expenses", {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "submit", expenseIds: draftIds }),
    });

    if (res.ok) {
      fetchExpenses();
    }
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

  const draftCount = expenses.filter((e) => e.status === "draft").length;
  const draftTotal = expenses
    .filter((e) => e.status === "draft")
    .reduce((sum, e) => sum + Number(e.amount), 0);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading expenses...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Expenses</h1>
          <p className="text-sm text-muted-foreground">
            Reporting mode:{" "}
            <span className="font-medium capitalize">
              {reportingMode.replace(/_/g, " ")}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          {draftCount > 0 && (
            <Button size="sm" variant="outline" onClick={handleSubmitDrafts}>
              <Send className="h-4 w-4 mr-1" />
              Submit {draftCount} Draft{draftCount > 1 ? "s" : ""} (
              {formatCurrency(draftTotal)})
            </Button>
          )}
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground mb-1">Subaward</div>
            <p className="text-lg font-semibold">
              {formatCurrency(subawardAmount)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground mb-1">
              Approved Spend
            </div>
            <p className="text-lg font-semibold">
              {formatCurrency(cumulativeSpend)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground mb-1">Remaining</div>
            <p className="text-lg font-semibold">
              {formatCurrency(subawardAmount - cumulativeSpend)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground mb-1">
              Total Submitted
            </div>
            <p className="text-lg font-semibold">{expenses.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Category breakdown */}
      {Object.keys(categoryTotals).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Approved Spend by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(categoryTotals).map(([cat, total]) => (
                <div key={cat} className="flex justify-between text-sm p-2 bg-muted rounded">
                  <span className="capitalize">{cat.replace(/_/g, " ")}</span>
                  <span className="font-medium">{formatCurrency(total)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expense list */}
      <div className="space-y-2">
        {expenses.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No expenses yet. Click &ldquo;Add Expense&rdquo; to start
              tracking.
            </CardContent>
          </Card>
        ) : (
          expenses.map((exp) => (
            <Card
              key={exp.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedExpense(exp)}
            >
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{exp.description}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {exp.category.replace(/_/g, " ")}
                        {exp.expenseDate && ` — ${formatDate(exp.expenseDate)}`}
                        {exp.periodStart &&
                          exp.periodEnd &&
                          ` — ${formatDate(exp.periodStart)} to ${formatDate(exp.periodEnd)}`}
                      </p>
                      {exp.status === "rejected" && exp.reviewNotes && (
                        <p className="text-xs text-red-600 mt-0.5">
                          {exp.reviewNotes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {exp.comments.length > 0 && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MessageSquare className="h-3 w-3" />
                        {exp.comments.length}
                      </span>
                    )}
                    <span className="font-semibold text-sm">
                      {formatCurrency(Number(exp.amount))}
                    </span>
                    <Badge className={STATUS_COLORS[exp.status] || ""}>
                      {exp.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Expense Sheet */}
      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {reportingMode === "lump_sum"
                ? "Add Period Expense"
                : "Add Expense"}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Category</label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder={
                  reportingMode === "lump_sum"
                    ? "Summary for this period"
                    : "Expense description"
                }
                rows={2}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Amount</label>
              <div className="relative">
                <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, amount: e.target.value }))
                  }
                  className="pl-7"
                  placeholder="0.00"
                />
              </div>
            </div>

            {reportingMode === "line_item" ? (
              <div>
                <label className="text-sm font-medium">Expense Date</label>
                <Input
                  type="date"
                  value={form.expenseDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, expenseDate: e.target.value }))
                  }
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium">Period Start</label>
                  <Input
                    type="date"
                    value={form.periodStart}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, periodStart: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Period End</label>
                  <Input
                    type="date"
                    value={form.periodEnd}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, periodEnd: e.target.value }))
                    }
                  />
                </div>
              </div>
            )}

            <Button
              onClick={handleCreate}
              disabled={
                !form.category || !form.description || !form.amount || submitting
              }
              className="w-full"
            >
              {submitting ? "Saving..." : "Save as Draft"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Expense Detail Sheet */}
      <Sheet
        open={!!selectedExpense}
        onOpenChange={(open) => !open && setSelectedExpense(null)}
      >
        <SheetContent className="overflow-y-auto">
          {selectedExpense && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedExpense.description}</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-4">
                <div className="flex items-center gap-2">
                  <Badge className={STATUS_COLORS[selectedExpense.status] || ""}>
                    {selectedExpense.status}
                  </Badge>
                  <span className="text-lg font-semibold">
                    {formatCurrency(Number(selectedExpense.amount))}
                  </span>
                </div>

                <div className="text-sm space-y-1">
                  <p>
                    <span className="text-muted-foreground">Category:</span>{" "}
                    <span className="capitalize">
                      {selectedExpense.category.replace(/_/g, " ")}
                    </span>
                  </p>
                  {selectedExpense.expenseDate && (
                    <p>
                      <span className="text-muted-foreground">Date:</span>{" "}
                      {formatDate(selectedExpense.expenseDate)}
                    </p>
                  )}
                  {selectedExpense.periodStart && selectedExpense.periodEnd && (
                    <p>
                      <span className="text-muted-foreground">Period:</span>{" "}
                      {formatDate(selectedExpense.periodStart)} &mdash;{" "}
                      {formatDate(selectedExpense.periodEnd)}
                    </p>
                  )}
                </div>

                {selectedExpense.status === "rejected" &&
                  selectedExpense.reviewNotes && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-md border border-red-200">
                      <p className="text-sm font-medium text-red-700">
                        Rejection Notes
                      </p>
                      <p className="text-sm text-red-600 mt-1">
                        {selectedExpense.reviewNotes}
                      </p>
                    </div>
                  )}

                {/* Comments */}
                <div>
                  <p className="text-sm font-medium mb-2">Comments</p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedExpense.comments.map((c) => (
                      <div key={c.id} className="p-2 bg-muted rounded text-sm">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <span className="font-medium">{c.user.name}</span>
                          <span>&middot;</span>
                          <span>{formatDate(c.createdAt)}</span>
                          {c.user.role !== "subrecipient" && (
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1 py-0 ml-1"
                            >
                              Prime
                            </Badge>
                          )}
                        </div>
                        <p>{c.body}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add a comment..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleComment(selectedExpense.id);
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={() => handleComment(selectedExpense.id)}
                      disabled={!commentText.trim()}
                    >
                      Send
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
