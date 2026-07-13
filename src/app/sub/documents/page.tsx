"use client";

import { useEffect, useState, useCallback } from "react";
import { useTenantHeaders } from "@/contexts/tenant-context";
import { useCurrentUser } from "@/contexts/user-context";
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
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  Plus,
} from "lucide-react";

interface Document {
  id: string;
  category: string;
  title: string;
  description: string;
  status: string;
  reviewNotes: string | null;
  reviewedAt: string | null;
  reviewedBy: { name: string } | null;
  uploadedBy: { name: string };
  report: { title: string; reportType: string; dueDate: string } | null;
  comments: Array<{
    id: string;
    body: string;
    createdAt: string;
    user: { id: string; name: string; role: string };
  }>;
  createdAt: string;
}

interface RequiredReport {
  id: string;
  title: string;
  reportType: string;
  dueDate: string;
  status: string;
}

const CATEGORIES = [
  { value: "single_audit", label: "Single Audit" },
  { value: "financial_report", label: "Financial Report" },
  { value: "performance_report", label: "Performance Report" },
  { value: "certification", label: "Certification" },
  { value: "corrective_action", label: "Corrective Action" },
  { value: "other", label: "Other" },
];

const STATUS_ICONS: Record<string, React.ReactNode> = {
  uploaded: <Clock className="h-3.5 w-3.5 text-blue-600" />,
  under_review: <Clock className="h-3.5 w-3.5 text-amber-600" />,
  accepted: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />,
  rejected: <XCircle className="h-3.5 w-3.5 text-red-600" />,
};

const STATUS_COLORS: Record<string, string> = {
  uploaded: "bg-blue-100 text-blue-700",
  under_review: "bg-amber-100 text-amber-700",
  accepted: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function SubDocuments() {
  const headers = useTenantHeaders();
  const { user } = useCurrentUser();
  const [docs, setDocs] = useState<Document[]>([]);
  const [requiredReports, setRequiredReports] = useState<RequiredReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [commentText, setCommentText] = useState("");
  const [uploadForm, setUploadForm] = useState({
    category: "",
    title: "",
    description: "",
    reportId: "",
  });
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fetchDocs = useCallback(async () => {
    try {
      const res = await fetch("/api/sub/documents", { headers });
      if (res.ok) {
        const data = await res.json();
        setDocs(data.documents);
        setRequiredReports(data.requiredReports);
      }
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleUpload = async () => {
    if (!uploadForm.category || !uploadForm.title || !user?.subrecipientId) return;

    setUploading(true);
    try {
      // Get subrecipient to find awardId
      const dashRes = await fetch("/api/sub/dashboard", { headers });
      const dashData = await dashRes.json();
      const awardId = dashData.award.id;

      // Create document record
      const docRes = await fetch("/api/sub/documents", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          awardId,
          category: uploadForm.category,
          title: uploadForm.title,
          description: uploadForm.description,
          reportId: uploadForm.reportId || undefined,
        }),
      });

      if (!docRes.ok) {
        const err = await docRes.json();
        alert(err.error || "Failed to create document");
        return;
      }

      const newDoc = await docRes.json();

      // If file selected, upload to S3
      if (selectedFile) {
        const presignRes = await fetch("/api/attachments/presign", {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: selectedFile.name,
            mimeType: selectedFile.type,
            fileSize: selectedFile.size,
            resourceType: "subrecipient_document",
            resourceId: newDoc.id,
          }),
        });

        if (presignRes.ok) {
          const { uploadUrl } = await presignRes.json();
          await fetch(uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": selectedFile.type },
            body: selectedFile,
          });
        }
      }

      setShowUpload(false);
      setUploadForm({ category: "", title: "", description: "", reportId: "" });
      setSelectedFile(null);
      fetchDocs();
    } finally {
      setUploading(false);
    }
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

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading documents...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Documents</h1>
          <p className="text-sm text-muted-foreground">
            Upload and manage required documents
          </p>
        </div>
        <Button onClick={() => setShowUpload(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Upload Document
        </Button>
      </div>

      {/* Required reports needing documents */}
      {requiredReports.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Required Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {requiredReports.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between text-sm border-b pb-2 last:border-0"
                >
                  <div>
                    <p className="font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.reportType} &mdash; Due {formatDate(r.dueDate)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setUploadForm({
                        category: r.reportType.includes("audit")
                          ? "single_audit"
                          : r.reportType.includes("financial")
                            ? "financial_report"
                            : "other",
                        title: r.title,
                        description: "",
                        reportId: r.id,
                      });
                      setShowUpload(true);
                    }}
                  >
                    <Upload className="h-3.5 w-3.5 mr-1" />
                    Upload
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document list */}
      <div className="space-y-3">
        {docs.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No documents uploaded yet. Click &ldquo;Upload Document&rdquo; to
              get started.
            </CardContent>
          </Card>
        ) : (
          docs.map((doc) => (
            <Card key={doc.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedDoc(doc)}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">{doc.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {doc.category.replace(/_/g, " ")}
                        {doc.report && ` — ${doc.report.title}`}
                      </p>
                      {doc.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {doc.description}
                        </p>
                      )}
                      {doc.status === "rejected" && doc.reviewNotes && (
                        <p className="text-xs text-red-600 mt-1">
                          Rejected: {doc.reviewNotes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {doc.comments.length > 0 && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MessageSquare className="h-3 w-3" />
                        {doc.comments.length}
                      </span>
                    )}
                    <Badge className={STATUS_COLORS[doc.status] || ""}>
                      {STATUS_ICONS[doc.status]}
                      <span className="ml-1">{doc.status}</span>
                    </Badge>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  Uploaded {formatDate(doc.createdAt)}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Upload Sheet */}
      <Sheet open={showUpload} onOpenChange={setShowUpload}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Upload Document</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Category</label>
              <Select
                value={uploadForm.category}
                onValueChange={(v) =>
                  setUploadForm((f) => ({ ...f, category: v }))
                }
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
              <label className="text-sm font-medium">Title</label>
              <Input
                value={uploadForm.title}
                onChange={(e) =>
                  setUploadForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="Document title"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={uploadForm.description}
                onChange={(e) =>
                  setUploadForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Optional description"
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm font-medium">File</label>
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.xlsx,.csv,.png,.jpg,.jpeg"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                PDF, Word, Excel, CSV, or images. Max 50MB.
              </p>
            </div>

            <Button
              onClick={handleUpload}
              disabled={!uploadForm.category || !uploadForm.title || uploading}
              className="w-full"
            >
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Document Detail Sheet */}
      <Sheet
        open={!!selectedDoc}
        onOpenChange={(open) => !open && setSelectedDoc(null)}
      >
        <SheetContent className="overflow-y-auto">
          {selectedDoc && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedDoc.title}</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-4">
                <div className="flex items-center gap-2">
                  <Badge className={STATUS_COLORS[selectedDoc.status] || ""}>
                    {selectedDoc.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground capitalize">
                    {selectedDoc.category.replace(/_/g, " ")}
                  </span>
                </div>

                {selectedDoc.description && (
                  <p className="text-sm">{selectedDoc.description}</p>
                )}

                {selectedDoc.status === "rejected" && selectedDoc.reviewNotes && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-md border border-red-200">
                    <p className="text-sm font-medium text-red-700">
                      Rejection Notes
                    </p>
                    <p className="text-sm text-red-600 mt-1">
                      {selectedDoc.reviewNotes}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() => {
                        setUploadForm({
                          category: selectedDoc.category,
                          title: selectedDoc.title,
                          description: selectedDoc.description,
                          reportId: selectedDoc.report?.dueDate
                            ? ""
                            : "",
                        });
                        setSelectedDoc(null);
                        setShowUpload(true);
                      }}
                    >
                      Re-upload
                    </Button>
                  </div>
                )}

                {/* Comments */}
                <div>
                  <p className="text-sm font-medium mb-2">Comments</p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedDoc.comments.map((c) => (
                      <div key={c.id} className="p-2 bg-muted rounded text-sm">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <span className="font-medium">{c.user.name}</span>
                          <span>&middot;</span>
                          <span>{formatDate(c.createdAt)}</span>
                          {c.user.role !== "subrecipient" && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 ml-1">
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
                          handleComment(selectedDoc.id);
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={() => handleComment(selectedDoc.id)}
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
