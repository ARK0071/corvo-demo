import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { setTenantConfigFromHeaders, getTenantConfig } from "@/lib/db/tenant-config";
import type { AuditLog, User } from "@/generated/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: reportId } = await params;
  setTenantConfigFromHeaders(request.headers);
  const { portId } = getTenantConfig();

  try {
    const entries = await prisma.auditLog.findMany({
      where: { portId, reportId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const userIds = [...new Set(entries.filter((e: AuditLog) => e.userId).map((e: AuditLog) => e.userId!))];
    const users: User[] = userIds.length > 0
      ? await prisma.user.findMany({ where: { id: { in: userIds } } })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u] as const));

    const enriched = entries.map((e: AuditLog) => ({
      id: e.id,
      action: e.action,
      userId: e.userId,
      userName: e.userId ? userMap.get(e.userId)?.name ?? null : null,
      userTitle: e.userId ? userMap.get(e.userId)?.title ?? null : null,
      userRole: e.userId ? userMap.get(e.userId)?.role ?? null : null,
      fieldChanged: e.fieldChanged,
      oldValue: e.oldValue,
      newValue: e.newValue,
      metadata: e.metadata,
      ipAddress: e.ipAddress,
      createdAt: e.createdAt.toISOString(),
    }));

    return NextResponse.json({ entries: enriched });
  } catch (error) {
    console.error("[activity] Error:", error);
    return NextResponse.json({ entries: [] });
  }
}
