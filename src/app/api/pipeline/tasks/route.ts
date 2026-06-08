import { NextRequest, NextResponse } from "next/server";
import { resolveSecureTenant } from "@/lib/db/tenant-config.server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/client";
import { PHASE_TASK_TEMPLATES, PIPELINE_PHASES } from "@/lib/pipeline-tasks";
import type { PipelinePhase } from "@/lib/pipeline-tasks";

async function resolvePortProfileId(
  ...candidates: (string | null | undefined)[]
): Promise<string | null> {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  for (const value of candidates) {
    if (!value) continue;
    if (uuidRegex.test(value)) return value;
    const exact = await prisma.portProfile.findUnique({
      where: { slug: value },
      select: { id: true },
    });
    if (exact) return exact.id;
  }
  for (const value of candidates) {
    if (!value || /^[0-9a-f]{8}-/i.test(value)) continue;
    const like = await prisma.portProfile.findFirst({
      where: { slug: { startsWith: value } },
      select: { id: true },
    });
    if (like) return like.id;
  }
  return null;
}

async function getPortCandidates(request: NextRequest) {
  const tenant = await resolveSecureTenant(request.headers);
  const session = await auth();
  const candidates: string[] = [];
  if (session?.user?.portId) candidates.push(session.user.portId);
  const headerSlug = request.headers.get("x-corvo-port-slug");
  const headerPortId = request.headers.get("x-corvo-port-id");
  if (headerSlug) candidates.push(headerSlug);
  if (headerPortId) candidates.push(headerPortId);
  if (tenant.portSlug) candidates.push(tenant.portSlug);
  if (tenant.portId) candidates.push(tenant.portId);
  return { candidates, tenant, session };
}

// GET: Get all tasks for a pipeline grant, grouped by phase
export async function GET(request: NextRequest) {
  try {
    const { candidates } = await getPortCandidates(request);
    const portProfileId = await resolvePortProfileId(...candidates);
    if (!portProfileId) {
      return NextResponse.json({ error: "No port profile found" }, { status: 404 });
    }

    const pipelineGrantId = request.nextUrl.searchParams.get("pipelineGrantId");

    const where: Record<string, unknown> = { portProfileId };
    if (pipelineGrantId) {
      where.pipelineGrantId = pipelineGrantId;
    } else {
      // Return tasks for all pipeline grants (for Gantt view)
      where.pipelineGrantId = { not: null };
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true, email: true, image: true } },
        subtasks: {
          include: {
            assignee: { select: { id: true, name: true, email: true, image: true } },
          },
          orderBy: { sortOrder: "asc" },
        },
        pipelineGrant: {
          include: {
            grant: { select: { title: true, agency: true } },
          },
        },
      },
      orderBy: [{ phase: "asc" }, { sortOrder: "asc" }],
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("Pipeline tasks GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

// POST: Auto-generate tasks for a pipeline grant
export async function POST(request: NextRequest) {
  try {
    const { candidates, session } = await getPortCandidates(request);
    const portProfileId = await resolvePortProfileId(...candidates);
    if (!portProfileId) {
      return NextResponse.json({ error: "No port profile found" }, { status: 404 });
    }

    const { pipelineGrantId, phases } = await request.json();
    if (!pipelineGrantId) {
      return NextResponse.json({ error: "pipelineGrantId is required" }, { status: 400 });
    }

    // Check if tasks already exist for this pipeline grant
    const existingCount = await prisma.task.count({
      where: { pipelineGrantId, parentTaskId: null },
    });
    if (existingCount > 0) {
      return NextResponse.json({ message: "Tasks already exist", created: 0 });
    }

    const phasesToGenerate: PipelinePhase[] = phases || PIPELINE_PHASES;
    const userId = session?.user?.id;
    let totalCreated = 0;

    for (let i = 0; i < phasesToGenerate.length; i++) {
      const phase = phasesToGenerate[i];
      const template = PHASE_TASK_TEMPLATES[phase];
      if (!template) continue;

      // Create the parent task for this phase
      const parentTask = await prisma.task.create({
        data: {
          portProfileId,
          pipelineGrantId,
          title: template.title,
          description: template.description,
          status: "not_started",
          priority: template.priority,
          phase,
          source: "template",
          sortOrder: i,
          createdBy: userId || null,
        },
      });
      totalCreated++;

      // Create subtasks
      for (let j = 0; j < template.subtasks.length; j++) {
        const sub = template.subtasks[j];
        await prisma.task.create({
          data: {
            portProfileId,
            pipelineGrantId,
            title: sub.title,
            description: sub.description,
            status: "not_started",
            priority: sub.priority,
            phase,
            parentTaskId: parentTask.id,
            source: "template",
            sortOrder: j,
            createdBy: userId || null,
          },
        });
        totalCreated++;
      }
    }

    return NextResponse.json({ created: totalCreated }, { status: 201 });
  } catch (error) {
    console.error("Pipeline tasks POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create tasks" },
      { status: 500 }
    );
  }
}

// PUT: Update a pipeline task (status, assignee, notes)
export async function PUT(request: NextRequest) {
  try {
    const { candidates } = await getPortCandidates(request);
    const portProfileId = await resolvePortProfileId(...candidates);
    if (!portProfileId) {
      return NextResponse.json({ error: "No port profile found" }, { status: 404 });
    }

    const { taskId, ...updates } = await request.json();
    if (!taskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    }

    // Verify task belongs to this port
    const task = await prisma.task.findFirst({
      where: { id: taskId, portProfileId },
    });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (updates.status !== undefined) data.status = updates.status;
    if (updates.title !== undefined) data.title = updates.title;
    if (updates.description !== undefined) data.description = updates.description;
    if (updates.assigneeId !== undefined) data.assigneeId = updates.assigneeId || null;
    if (updates.priority !== undefined) data.priority = updates.priority;
    if (updates.startDate !== undefined) data.startDate = updates.startDate ? new Date(updates.startDate) : null;
    if (updates.dueDate !== undefined) data.dueDate = updates.dueDate ? new Date(updates.dueDate) : null;

    const updated = await prisma.task.update({
      where: { id: taskId },
      data,
      include: {
        assignee: { select: { id: true, name: true, email: true, image: true } },
        subtasks: {
          include: {
            assignee: { select: { id: true, name: true, email: true, image: true } },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    // If marking a parent task as done, check if all phase tasks are done
    // and auto-advance the pipeline grant to the next phase
    if (updates.status === "done" && !task.parentTaskId && task.pipelineGrantId && task.phase) {
      const phaseTasks = await prisma.task.findMany({
        where: {
          pipelineGrantId: task.pipelineGrantId,
          parentTaskId: null,
          phase: task.phase,
        },
        select: { status: true },
      });

      const allDone = phaseTasks.every((t: { status: string }) => t.status === "done");
      if (allDone) {
        const currentPhaseIndex = PIPELINE_PHASES.indexOf(task.phase as PipelinePhase);
        if (currentPhaseIndex >= 0 && currentPhaseIndex < PIPELINE_PHASES.length - 1) {
          const nextPhase = PIPELINE_PHASES[currentPhaseIndex + 1];
          await prisma.pipelineGrant.update({
            where: { id: task.pipelineGrantId },
            data: { stage: nextPhase },
          });
        }
      }
    }

    return NextResponse.json({ task: updated });
  } catch (error) {
    console.error("Pipeline tasks PUT error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update task" },
      { status: 500 }
    );
  }
}
