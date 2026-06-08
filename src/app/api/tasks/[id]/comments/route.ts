import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import * as TaskComments from "@/lib/db/repositories/task-comments";
import * as Tasks from "@/lib/db/repositories/tasks";
import * as Notifications from "@/lib/db/repositories/notifications";

// GET /api/tasks/:id/comments
export const GET = withAuth(async (_request, { params }) => {
  const taskId = params?.id;
  if (!taskId) return NextResponse.json({ error: "Task ID required" }, { status: 400 });

  const comments = await TaskComments.getCommentsForTask(taskId);
  return NextResponse.json({ comments });
});

// POST /api/tasks/:id/comments
export const POST = withAuth(async (request, { user, params }) => {
  const taskId = params?.id;
  if (!taskId) return NextResponse.json({ error: "Task ID required" }, { status: 400 });

  const { body } = await request.json();
  if (!body?.trim()) {
    return NextResponse.json({ error: "Comment body required" }, { status: 400 });
  }

  const comment = await TaskComments.addComment(taskId, user.id, body);

  // Notify task assignee about new comment
  const task = await Tasks.getTaskById(taskId);
  if (task?.assigneeId && task.assigneeId !== user.id) {
    await Notifications.createNotification(
      task.assigneeId,
      "comment",
      "New comment on your task",
      `${user.name} commented on "${task.title}"`,
      taskId
    );
  }

  return NextResponse.json(comment, { status: 201 });
});
