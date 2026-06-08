import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import { resolvePortProfileId } from "@/lib/db/tenant-config.server";
import * as Templates from "@/lib/db/repositories/task-templates";
import * as Tasks from "@/lib/db/repositories/tasks";
import { prisma } from "@/lib/db/client";

// GET /api/task-templates?program=PIDP
export const GET = withAuth(async (request) => {
  const program = request.nextUrl.searchParams.get("program") || undefined;
  const templates = await Templates.listTemplates(program);
  return NextResponse.json({ templates });
});

// POST /api/task-templates/apply - Apply a template to an award
export const POST = withAuth(async (request, { user }) => {
  const portProfileId = await resolvePortProfileId(request.headers);
  if (!portProfileId) {
    return NextResponse.json({ error: "Port profile not found" }, { status: 404 });
  }

  const { templateId, awardId } = await request.json();

  if (!templateId || !awardId) {
    return NextResponse.json(
      { error: "templateId and awardId are required" },
      { status: 400 }
    );
  }

  const template = await Templates.getTemplateById(templateId);
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const award = await prisma.award.findUnique({
    where: { id: awardId },
    select: { performancePeriodStart: true, performancePeriodEnd: true },
  });

  if (!award) {
    return NextResponse.json({ error: "Award not found" }, { status: 404 });
  }

  const taskInputs = Templates.instantiatePlaybook(
    template,
    awardId,
    portProfileId,
    award.performancePeriodStart,
    award.performancePeriodEnd,
    user.id
  );

  const count = await Tasks.bulkCreateTasks(taskInputs);

  return NextResponse.json({
    success: true,
    tasksCreated: count,
    templateName: template.name,
  });
});
