import { NextRequest, NextResponse } from "next/server";
import { resolveSecureTenant } from "@/lib/db/tenant-config.server";
import { prisma } from "@/lib/db/client";
import { getTenantConfig } from "@/lib/db/tenant-config";

async function getPortProfileId(): Promise<string> {
  const portId = getTenantConfig().portId;
  const profile = await prisma.portProfile.findFirst({
    where: { slug: portId },
    select: { id: true },
  });
  if (!profile) throw new Error(`No PortProfile found for slug: ${portId}`);
  return profile.id;
}

export async function GET(request: NextRequest) {
  try {
    await resolveSecureTenant(request.headers);
    const portProfileId = await getPortProfileId();

    const rows = await prisma.subrecipientReport.findMany({
      where: {
        status: { in: ["pending", "overdue"] },
        subrecipient: { award: { portProfileId } },
      },
      include: {
        subrecipient: {
          select: {
            entityName: true,
            awardId: true,
            award: { select: { title: true, program: true } },
          },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    const reports = rows.map((r: any) => ({
      id: r.id,
      subrecipientName: r.subrecipient.entityName,
      awardTitle: r.subrecipient.award?.title ?? "",
      program: r.subrecipient.award?.program ?? "",
      reportType: r.reportType,
      title: r.title,
      dueDate: r.dueDate instanceof Date ? r.dueDate.toISOString() : String(r.dueDate),
      status: r.status,
    }));

    return NextResponse.json({ reports });
  } catch (error) {
    console.error("Subrecipient reports GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch" },
      { status: 500 },
    );
  }
}
