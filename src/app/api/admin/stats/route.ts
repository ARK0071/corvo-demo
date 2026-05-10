import { NextResponse } from "next/server";
import { withRole } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db/client";

export const GET = withRole(["admin"], async () => {
  const [totalUsers, activeUsers, recentLogins, totalAuditEntries] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { active: true } }),
    prisma.user.count({
      where: {
        lastLoginAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    prisma.auditLog.count(),
  ]);

  return NextResponse.json({ totalUsers, activeUsers, recentLogins, totalAuditEntries });
});
