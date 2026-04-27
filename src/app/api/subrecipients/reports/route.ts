import { NextRequest, NextResponse } from "next/server";
import { setTenantConfigFromHeaders, getTenantConfig } from "@/lib/db/tenant-config";
import { prisma } from "@/lib/db/client";

export async function GET(request: NextRequest) {
  try {
    setTenantConfigFromHeaders(request.headers);
    const { portId } = getTenantConfig();

    const rows = await prisma.demoSubrecipientReport.findMany({
      where: {
        portId,
        status: { in: ["pending", "overdue"] },
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
