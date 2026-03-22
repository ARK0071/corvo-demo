"use client";

import { RefreshCw, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SyncStatusProps {
  lastSyncTime: Date | null;
  syncing: boolean;
  onSync: () => void;
  label?: string;
  compact?: boolean;
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export function SyncStatus({
  lastSyncTime,
  syncing,
  onSync,
  label = "Refresh",
  compact = false,
}: SyncStatusProps) {
  const isStale =
    !lastSyncTime ||
    new Date().getTime() - lastSyncTime.getTime() > 24 * 60 * 60 * 1000; // 24 hours

  if (compact) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onSync}
        disabled={syncing}
        className="gap-2"
      >
        <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
        {syncing ? "Syncing..." : label}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {syncing ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
            <span>Syncing...</span>
          </>
        ) : lastSyncTime ? (
          <>
            {isStale ? (
              <AlertCircle className="h-4 w-4 text-amber-500" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            )}
            <span>
              <Clock className="inline h-3 w-3 mr-1" />
              {formatTimeAgo(lastSyncTime)}
            </span>
          </>
        ) : (
          <>
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <span>Never synced</span>
          </>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onSync}
        disabled={syncing}
        className="gap-2"
      >
        <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
        {label}
      </Button>
    </div>
  );
}

interface SyncResultToastProps {
  success: boolean;
  recordsUpdated: number;
  onClose: () => void;
}

export function SyncResultToast({
  success,
  recordsUpdated,
  onClose,
}: SyncResultToastProps) {
  return (
    <div
      className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg ${
        success
          ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
          : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
      }`}
    >
      <div className="flex items-center gap-3">
        {success ? (
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
        ) : (
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
        )}
        <div>
          <p
            className={`font-medium ${
              success
                ? "text-green-800 dark:text-green-200"
                : "text-red-800 dark:text-red-200"
            }`}
          >
            {success ? "Sync completed" : "Sync failed"}
          </p>
          {success && (
            <p className="text-sm text-green-600 dark:text-green-400">
              {recordsUpdated} records updated
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="ml-4 text-gray-400 hover:text-gray-600"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
