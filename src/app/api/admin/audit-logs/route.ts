import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db/client";

export const GET = withRole(["admin"], async (request) => {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "50"));
  const action = searchParams.get("action");
  const userId = searchParams.get("userId");
  const portId = searchParams.get("portId");

  const where: Record<string, unknown> = {};
  if (action) where.action = { contains: action };
  if (userId) where.userId = userId;
  if (portId) where.portId = portId;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  // Enrich with user names
  const userIds = [...new Set(logs.map((l: { userId: string | null }) => l.userId).filter(Boolean))] as string[];
  const users = userIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true },
      })
    : [];
  const userMap = new Map(users.map((u: { id: string; name: string }) => [u.id, u.name]));

  const enrichedLogs = logs.map((log: { userId: string | null; [key: string]: unknown }) => ({
    ...log,
    userName: log.userId ? userMap.get(log.userId) || null : null,
  }));

  return NextResponse.json({
    logs: enrichedLogs,
    total,
    page,
    hasMore: page * limit < total,
  });
});
