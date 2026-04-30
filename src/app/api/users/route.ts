import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { setTenantConfigFromHeaders, getTenantConfig } from "@/lib/db/tenant-config";

export async function GET(request: Request) {
  setTenantConfigFromHeaders(request.headers);
  const { portId } = getTenantConfig();

  try {
    let users = await prisma.user.findMany({
      where: { portId, active: true },
      orderBy: { name: "asc" },
    });

    if (users.length === 0) {
      const templates = [
        { email: `drafter@${portId}.demo`, name: "Alex Drafter", title: "Grants Accountant", role: "drafter" },
        { email: `reviewer@${portId}.demo`, name: "Pat Reviewer", title: "Grants Director", role: "reviewer" },
        { email: `cfo@${portId}.demo`, name: "Jamie Certifier", title: "Chief Financial Officer", role: "certifying_official" },
      ];
      for (const t of templates) {
        await prisma.user.upsert({
          where: { email: t.email },
          update: {},
          create: { portId, ...t },
        });
      }
      users = await prisma.user.findMany({
        where: { portId, active: true },
        orderBy: { name: "asc" },
      });
      console.log(`[users] Auto-seeded ${users.length} users for port ${portId}`);
    }

    return NextResponse.json({ users });
  } catch (error) {
    console.error("[users] Error:", error);
    return NextResponse.json({ users: [] });
  }
}
