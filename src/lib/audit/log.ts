import { prisma } from "../db/client";
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
  const portId = getPortIdFromRequest(request.headers);
  const userId = getUserIdFromRequest(request.headers);
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
