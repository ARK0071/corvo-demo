/**
 * Audit log service for Porter AI and platform-wide write tracking.
 *
 * Every write tool (Tier 1 and Tier 2) must call `logAudit()` to record
 * the action, before/after state, and whether it was initiated via Porter.
 */

import { prisma } from "@/lib/db/client";

export interface AuditEntry {
  portId: string;
  userId: string;
  action: string; // e.g. "create_task", "assign_task", "move_pipeline_stage"
  resourceType: string; // e.g. "Task", "PipelineGrant", "Notification"
  resourceId: string;
  viaPorter?: boolean;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  fieldChanged?: string;
  reportId?: string;
  awardId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Write an audit log row. Called by every Porter write tool and
 * can also be used by regular platform mutations.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  if (!prisma) return; // DB unavailable — skip silently

  try {
    await prisma.auditLog.create({
      data: {
        portId: entry.portId,
        userId: entry.userId,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        actorType: entry.viaPorter ? "porter" : "user",
        viaPorter: entry.viaPorter ?? false,
        oldValue: entry.oldValue ?? undefined,
        newValue: entry.newValue ?? undefined,
        fieldChanged: entry.fieldChanged,
        reportId: entry.reportId,
        awardId: entry.awardId,
        metadata: entry.metadata ?? undefined,
      },
    });
  } catch (error) {
    // Audit logging should never break the primary operation.
    // Log the failure but don't throw.
    console.error("[audit] Failed to write audit log:", error);
  }
}

/**
 * Convenience wrapper for Porter-initiated writes.
 * Sets viaPorter=true and actorType="porter" automatically.
 */
export async function logPorterAudit(
  entry: Omit<AuditEntry, "viaPorter">
): Promise<void> {
  return logAudit({ ...entry, viaPorter: true });
}
