import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import { resolvePortProfileId } from "@/lib/db/tenant-config.server";
import * as Tasks from "@/lib/db/repositories/tasks";
import * as Notifications from "@/lib/db/repositories/notifications";

// GET /api/tasks?awardId=&assigneeId=&status=&area=&search=&dueBefore=&dueAfter=
export const GET = withAuth(async (request, { user }) => {
  const portProfileId = await resolvePortProfileId(request.headers);
  if (!portProfileId) {
    return NextResponse.json({ error: "Port profile not found" }, { status: 404 });
  }

  const params = request.nextUrl.searchParams;
  const myTasks = params.get("myTasks") === "true";

  if (myTasks) {
    const includeCompleted = params.get("includeCompleted") === "true";
    const tasks = await Tasks.getMyTasks(user.id, portProfileId, includeCompleted);
    return NextResponse.json({ tasks });
  }

  const filters: Tasks.TaskFilters = {
    portProfileId,
    awardId: params.get("awardId") || undefined,
    pipelineGrantId: params.get("pipelineGrantId") || undefined,
    assigneeId: params.get("assigneeId") || undefined,
    status: params.get("status") as Tasks.TaskStatus | undefined,
    area: params.get("area") || undefined,
    priority: params.get("priority") as Tasks.TaskPriority | undefined,
    search: params.get("search") || undefined,
    dueBefore: params.get("dueBefore") || undefined,
    dueAfter: params.get("dueAfter") || undefined,
  };

  // Top-level only by default unless parentTaskId is specified
  if (params.has("parentTaskId")) {
    filters.parentTaskId = params.get("parentTaskId") || undefined;
  } else {
    filters.parentTaskId = null;
  }

  const tasks = await Tasks.listTasks(filters);
  const stats = await Tasks.getTaskStats(portProfileId, filters.awardId);

  return NextResponse.json({ tasks, stats });
});

// POST /api/tasks
export const POST = withAuth(async (request, { user }) => {
  const portProfileId = await resolvePortProfileId(request.headers);
  if (!portProfileId) {
    return NextResponse.json({ error: "Port profile not found" }, { status: 404 });
  }

  const body = await request.json();
  const { title, description, awardId, pipelineGrantId, status, priority, startDate, dueDate, assigneeId, area, phase, parentTaskId, source, deliverableRef, deliverableType, deliverableId, sortOrder } = body;

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const task = await Tasks.createTask({
    portProfileId,
    title,
    description,
    awardId,
    pipelineGrantId,
    status,
    priority,
    startDate,
    dueDate,
    assigneeId,
    area,
    phase,
    parentTaskId,
    source,
    deliverableRef,
    deliverableType,
    deliverableId,
    sortOrder,
    createdBy: user.id,
  });

  // Notify assignee if different from creator
  if (assigneeId && assigneeId !== user.id) {
    await Notifications.createTaskAssignmentNotification(
      assigneeId,
      user.name,
      title,
      task.id,
      task.awardTitle || undefined
    );
  }

  return NextResponse.json(task, { status: 201 });
});
