import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import * as Tasks from "@/lib/db/repositories/tasks";
import * as Notifications from "@/lib/db/repositories/notifications";

// GET /api/tasks/:id
export const GET = withAuth(async (_request, { params }) => {
  const id = params?.id;
  if (!id) return NextResponse.json({ error: "Task ID required" }, { status: 400 });

  const task = await Tasks.getTaskById(id);
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  return NextResponse.json(task);
});

// PUT /api/tasks/:id
export const PUT = withAuth(async (request, { user, params }) => {
  const id = params?.id;
  if (!id) return NextResponse.json({ error: "Task ID required" }, { status: 400 });

  const existing = await Tasks.getTaskById(id);
  if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const body = await request.json();
  const task = await Tasks.updateTask(id, body);
  if (!task) return NextResponse.json({ error: "Update failed" }, { status: 500 });

  // Notify on assignment change
  if (body.assigneeId && body.assigneeId !== existing.assigneeId && body.assigneeId !== user.id) {
    await Notifications.createTaskAssignmentNotification(
      body.assigneeId,
      user.name,
      task.title,
      task.id,
      task.awardTitle || undefined
    );
  }

  // Notify assignee on status change to blocked
  if (body.status && body.status !== existing.status && existing.assigneeId && existing.assigneeId !== user.id) {
    await Notifications.createStatusChangeNotification(
      existing.assigneeId,
      user.name,
      task.title,
      task.id,
      body.status
    );
  }

  return NextResponse.json(task);
});

// DELETE /api/tasks/:id
export const DELETE = withAuth(async (_request, { params }) => {
  const id = params?.id;
  if (!id) return NextResponse.json({ error: "Task ID required" }, { status: 400 });

  await Tasks.deleteTask(id);
  return NextResponse.json({ success: true });
});
