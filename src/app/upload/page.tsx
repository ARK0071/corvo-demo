"use client";

import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";

export default function VendorUploadPage() {
  const [dragOver, setDragOver] = useState(false);
  const [uploaded, setUploaded] = useState<{ name: string; rows: number } | null>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setUploaded({ name: file.name, rows: Math.floor(Math.random() * 500) + 100 });
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploaded({ name: file.name, rows: Math.floor(Math.random() * 500) + 100 });
    }
  }, []);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Upload className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Vendor Upload</h1>
            <p className="text-sm text-muted-foreground">Upload vendor spend data for categorization and analysis</p>
          </div>
        </div>

        {/* Upload Zone */}
        <Card
          className={`p-12 border-2 border-dashed transition-colors cursor-pointer ${
            dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById("file-input")?.click()}
        >
          <div className="flex flex-col items-center text-center">
            <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm font-medium mb-1">Drop your file here or click to browse</p>
            <p className="text-xs text-muted-foreground mb-4">Supports CSV, XLSX, or XLS up to 50MB</p>
            <Button variant="outline" size="sm">Select File</Button>
          </div>
          <input id="file-input" type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileSelect} />
        </Card>

        {/* Upload Result */}
        {uploaded && (
          <Card className="mt-6 p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">File uploaded successfully</p>
                <p className="text-xs text-muted-foreground mt-1">{uploaded.name} -- {uploaded.rows} rows detected</p>
                <div className="mt-4 flex gap-2">
                  <Button size="sm">Run Categorization</Button>
                  <Button size="sm" variant="outline" onClick={() => setUploaded(null)}>Upload Another</Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Expected Format */}
        <Card className="mt-6 p-5">
          <h2 className="text-sm font-semibold mb-3">Expected Format</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">vendor_name</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">invoice_amount</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">invoice_date</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">description</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">po_number</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b border-dashed">
                  <td className="py-2 px-3">Acme Corp</td>
                  <td className="py-2 px-3">12,500.00</td>
                  <td className="py-2 px-3">2024-01-15</td>
                  <td className="py-2 px-3">Server maintenance</td>
                  <td className="py-2 px-3">PO-2024-001</td>
                </tr>
                <tr>
                  <td className="py-2 px-3">GlobalTech Inc</td>
                  <td className="py-2 px-3">45,000.00</td>
                  <td className="py-2 px-3">2024-02-01</td>
                  <td className="py-2 px-3">SaaS license renewal</td>
                  <td className="py-2 px-3">PO-2024-015</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-start gap-2">
            <AlertCircle className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">Column headers are auto-detected. At minimum, vendor_name and invoice_amount are required.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
