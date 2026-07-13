import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db/client";
import { resolveSecureTenant } from "@/lib/db/tenant-config.server";
import { z } from "zod";

const createVisitSchema = z.object({
  subrecipientId: z.string().uuid(),
  awardId: z.string().uuid(),
  type: z.enum(["desk_review", "site_visit", "financial_review"]),
  scheduledDate: z.string(),
  location: z.string().optional(),
  agenda: z.string().default(""),
});

// Prime-side monitoring visit management
export const GET = withRole(
  ["admin", "moderator", "reviewer", "certifying_official", "drafter"],
  async (request: NextRequest) => {
    await resolveSecureTenant(request.headers);
    const params = request.nextUrl.searchParams;
    const subrecipientId = params.get("subrecipientId");
    const status = params.get("status");

    const where: Record<string, unknown> = {};
    if (subrecipientId) where.subrecipientId = subrecipientId;
    if (status) where.status = status;

    const visits = await prisma.monitoringVisit.findMany({
      where,
      include: {
        subrecipient: { select: { entityName: true } },
        award: { select: { title: true, fain: true } },
        scheduledBy: { select: { name: true } },
        confirmedBy: { select: { name: true } },
        completedBy: { select: { name: true } },
        comments: {
          include: { user: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { scheduledDate: "desc" },
    });

    return NextResponse.json({ visits });
  }
);

export const POST = withRole(
  ["admin", "moderator", "reviewer", "certifying_official"],
  async (request: NextRequest, { user }) => {
    await resolveSecureTenant(request.headers);
    const body = await request.json();
    const parsed = createVisitSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const visit = await prisma.monitoringVisit.create({
      data: {
        subrecipientId: parsed.data.subrecipientId,
        awardId: parsed.data.awardId,
        type: parsed.data.type,
        scheduledDate: new Date(parsed.data.scheduledDate),
        scheduledById: user.id,
        location: parsed.data.location || null,
        agenda: parsed.data.agenda,
        status: "proposed",
      },
      include: {
        subrecipient: { select: { entityName: true } },
      },
    });

    return NextResponse.json(visit, { status: 201 });
  }
);

// Complete a visit with findings
export const PUT = withRole(
  ["admin", "moderator", "reviewer", "certifying_official"],
  async (request: NextRequest, { user }) => {
    await resolveSecureTenant(request.headers);
    const body = await request.json();
    const { id, action, findings, findingsSeverity, followUpDueDate, scheduledDate } = body;

    if (!id || !action) {
      return NextResponse.json({ error: "id and action required" }, { status: 400 });
    }

    if (action === "complete") {
      const updated = await prisma.monitoringVisit.update({
        where: { id },
        data: {
          status: "completed",
          completedAt: new Date(),
          completedById: user.id,
          findings: findings || null,
          findingsSeverity: findingsSeverity || "none",
          followUpDueDate: followUpDueDate ? new Date(followUpDueDate) : null,
        },
      });
      return NextResponse.json(updated);
    }

    if (action === "reschedule") {
      if (!scheduledDate) {
        return NextResponse.json({ error: "scheduledDate required" }, { status: 400 });
      }
      const updated = await prisma.monitoringVisit.update({
        where: { id },
        data: {
          status: "proposed",
          scheduledDate: new Date(scheduledDate),
          confirmedAt: null,
          confirmedById: null,
        },
      });
      return NextResponse.json(updated);
    }

    if (action === "cancel") {
      const updated = await prisma.monitoringVisit.update({
        where: { id },
        data: { status: "cancelled" },
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
);
