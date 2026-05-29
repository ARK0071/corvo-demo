import { NextResponse } from "next/server";
import { withRole } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db/client";

export const GET = withRole(["admin", "moderator"], async (_request, { user }) => {
  // Moderators see stats scoped to their entity
  const portFilter = user.role === "moderator" ? { portId: user.portId } : {};

  const [totalUsers, activeUsers, recentLogins, totalAuditEntries] = await Promise.all([
    prisma.user.count({ where: portFilter }),
    prisma.user.count({ where: { ...portFilter, active: true } }),
    prisma.user.count({
      where: {
        ...portFilter,
        lastLoginAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    user.role === "moderator"
      ? prisma.auditLog.count({ where: { portId: user.portId } })
      : prisma.auditLog.count(),
  ]);

  return NextResponse.json({ totalUsers, activeUsers, recentLogins, totalAuditEntries });
});
