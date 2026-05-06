import { NextResponse } from "next/server";
import { withRole } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db/client";

export const GET = withRole(["admin"], async () => {
  // Check database connectivity
  let databaseConnected = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseConnected = true;
  } catch { /* ignore */ }

  return NextResponse.json({
    sessionMaxAge: parseInt(process.env.NEXTAUTH_SESSION_MAX_AGE || "28800"),
    sessionUpdateAge: parseInt(process.env.NEXTAUTH_SESSION_UPDATE_AGE || "3600"),
    googleConfigured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    microsoftConfigured: !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET),
    databaseConnected,
  });
});
