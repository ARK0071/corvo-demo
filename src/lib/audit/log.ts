import { prisma } from "../db/client";
import { getAuthUserId, getAuthPortId } from "../db/tenant-config.server";
import { getPortIdFromRequest, getUserIdFromRequest } from "../db/tenant-config.server";
import type { Prisma } from "@/generated/prisma";

export async function audit(
  request: Request,
  entry: {
    action: string;
    reportId?: string;
    awardId?: string;
    fieldChanged?: string;
    before?: unknown;
    after?: unknown;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  // Prefer session-based identity; fall back to headers during migration
  let portId: string;
  let userId: string | null;

  try {
    portId = await getAuthPortId();
    userId = await getAuthUserId();
  } catch {
    // Fallback for routes not yet migrated
    portId = getPortIdFromRequest(request.headers);
    userId = getUserIdFromRequest(request.headers);
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? null;
  const ua = request.headers.get("user-agent") ?? null;

  void prisma.auditLog.create({
    data: {
      portId,
      userId,
      reportId: entry.reportId ?? null,
      awardId: entry.awardId ?? null,
      action: entry.action,
      fieldChanged: entry.fieldChanged ?? null,
      oldValue: entry.before as Prisma.InputJsonValue ?? undefined,
      newValue: entry.after as Prisma.InputJsonValue ?? undefined,
      ipAddress: ip,
      userAgent: ua,
      metadata: entry.metadata as Prisma.InputJsonValue ?? undefined,
    },
  }).catch((err: unknown) => console.error("[audit] write failed", err));
}
