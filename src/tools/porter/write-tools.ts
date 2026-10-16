/**
 * Porter AI — Write Tool Implementations (Tier 1)
 *
 * Tier 1: Lightweight, reversible writes.
 * Every write emits an audit log row via logPorterAudit().
 *
 * These tools should only be invoked after the user has confirmed
 * the intended action. The system prompt enforces this.
 */

import { prisma } from "@/lib/db/client";
import { getPorterContext } from "@/lib/porter-context";
import { logPorterAudit } from "@/lib/audit";

// ---------------------------------------------------------------------------
// create_task — Tier 1
// ---------------------------------------------------------------------------

export async function createTask(params: {
  title: string;
  description?: string;
  awardId?: string;
  pipelineGrantId?: string;
  assigneeId?: string;
  dueDate?: string;
  priority?: string;
  area?: string;
}) {
  const ctx = getPorterContext();
  if (!prisma || !ctx.portProfileId) {
    return { error: "Database not available." };
  }

  const task = await prisma.task.create({
    data: {
      portProfileId: ctx.portProfileId,
      title: params.title,
      description: params.description ?? "",
      awardId: params.awardId,
      pipelineGrantId: params.pipelineGrantId,
      assigneeId: params.assigneeId,
      dueDate: params.dueDate ? new Date(params.dueDate) : undefined,
      priority: params.priority ?? "medium",
      area: params.area,
      source: "ai",
      createdBy: ctx.userId,
    },
    include: {
      assignee: { select: { name: true } },
    },
  });

  await logPorterAudit({
    portId: ctx.portId,
    userId: ctx.userId,
    action: "create_task",
    resourceType: "Task",
    resourceId: task.id,
    newValue: {
      title: task.title,
      assigneeId: task.assigneeId,
      dueDate: params.dueDate,
      priority: task.priority,
      area: task.area,
    },
  });

  // Send notification to assignee if one was set
  if (params.assigneeId && params.assigneeId !== ctx.userId) {
    try {
      await prisma.notification.create({
        data: {
          userId: params.assigneeId,
          taskId: task.id,
          type: "task_assigned",
          title: `New task assigned: ${task.title}`,
          body: `Porter AI created and assigned a task to you.`,
        },
      });
    } catch {
      // Non-critical — don't fail the task creation
    }
  }

  return {
    success: true,
    taskId: task.id,
    title: task.title,
    assignee: task.assignee?.name ?? "Unassigned",
    dueDate: params.dueDate,
    message: `Task "${task.title}" created successfully.`,
  };
}

// ---------------------------------------------------------------------------
// assign_task — Tier 1
// ---------------------------------------------------------------------------

export async function assignTask(params: {
  taskId: string;
  assigneeId: string;
}) {
  const ctx = getPorterContext();
  if (!prisma || !ctx.portProfileId) {
    return { error: "Database not available." };
  }

  const task = await prisma.task.findFirst({
    where: { id: params.taskId, portProfileId: ctx.portProfileId },
    select: { id: true, title: true, assigneeId: true },
  });

  if (!task) return { error: "Task not found." };

  const previousAssignee = task.assigneeId;

  const updated = await prisma.task.update({
    where: { id: params.taskId },
    data: { assigneeId: params.assigneeId },
    include: { assignee: { select: { name: true } } },
  });

  await logPorterAudit({
    portId: ctx.portId,
    userId: ctx.userId,
    action: "assign_task",
    resourceType: "Task",
    resourceId: task.id,
    fieldChanged: "assigneeId",
    oldValue: { assigneeId: previousAssignee },
    newValue: { assigneeId: params.assigneeId },
  });

  // Notify new assignee
  if (params.assigneeId !== ctx.userId) {
    try {
      await prisma.notification.create({
        data: {
          userId: params.assigneeId,
          taskId: task.id,
          type: "task_assigned",
          title: `Task assigned: ${task.title}`,
          body: `Porter AI assigned you to this task.`,
        },
      });
    } catch {
      // Non-critical
    }
  }

  return {
    success: true,
    taskId: task.id,
    title: task.title,
    assignee: updated.assignee?.name ?? "Unknown",
    message: `Task "${task.title}" assigned to ${updated.assignee?.name ?? "user"}.`,
  };
}

// ---------------------------------------------------------------------------
// update_task_status — Tier 1
// ---------------------------------------------------------------------------

export async function updateTaskStatus(params: {
  taskId: string;
  status: string;
}) {
  const ctx = getPorterContext();
  if (!prisma || !ctx.portProfileId) {
    return { error: "Database not available." };
  }

  const task = await prisma.task.findFirst({
    where: { id: params.taskId, portProfileId: ctx.portProfileId },
    select: { id: true, title: true, status: true },
  });

  if (!task) return { error: "Task not found." };

  const previousStatus = task.status;

  await prisma.task.update({
    where: { id: params.taskId },
    data: { status: params.status },
  });

  await logPorterAudit({
    portId: ctx.portId,
    userId: ctx.userId,
    action: "update_task_status",
    resourceType: "Task",
    resourceId: task.id,
    fieldChanged: "status",
    oldValue: { status: previousStatus },
    newValue: { status: params.status },
  });

  return {
    success: true,
    taskId: task.id,
    title: task.title,
    previousStatus,
    newStatus: params.status,
    message: `Task "${task.title}" status changed from ${previousStatus} to ${params.status}.`,
  };
}

// ---------------------------------------------------------------------------
// add_comment — Tier 1
// ---------------------------------------------------------------------------

export async function addComment(params: { taskId: string; text: string }) {
  const ctx = getPorterContext();
  if (!prisma || !ctx.portProfileId) {
    return { error: "Database not available." };
  }

  // Verify task belongs to this port
  const task = await prisma.task.findFirst({
    where: { id: params.taskId, portProfileId: ctx.portProfileId },
    select: { id: true, title: true },
  });

  if (!task) return { error: "Task not found." };

  const comment = await prisma.taskComment.create({
    data: {
      taskId: params.taskId,
      userId: ctx.userId,
      body: params.text,
    },
  });

  await logPorterAudit({
    portId: ctx.portId,
    userId: ctx.userId,
    action: "add_comment",
    resourceType: "TaskComment",
    resourceId: comment.id,
    newValue: { taskId: params.taskId, body: params.text },
  });

  return {
    success: true,
    commentId: comment.id,
    taskTitle: task.title,
    message: `Comment added to task "${task.title}".`,
  };
}

// ---------------------------------------------------------------------------
// send_notification — Tier 1
// ---------------------------------------------------------------------------

export async function sendNotification(params: {
  userId: string;
  message: string;
  link?: string;
}) {
  const ctx = getPorterContext();
  if (!prisma) return { error: "Database not available." };

  const notification = await prisma.notification.create({
    data: {
      userId: params.userId,
      type: "porter_message",
      title: "Message from Porter",
      body: params.message,
    },
  });

  await logPorterAudit({
    portId: ctx.portId,
    userId: ctx.userId,
    action: "send_notification",
    resourceType: "Notification",
    resourceId: notification.id,
    newValue: {
      recipientUserId: params.userId,
      message: params.message,
    },
  });

  return {
    success: true,
    notificationId: notification.id,
    message: `Notification sent.`,
  };
}

// ---------------------------------------------------------------------------
// add_to_pipeline — Tier 1
// ---------------------------------------------------------------------------

export async function addToPipeline(params: {
  grantId: string;
  notes?: string;
}) {
  const ctx = getPorterContext();
  if (!prisma || !ctx.portProfileId) {
    return { error: "Database not available." };
  }

  // Check if grant exists
  const grant = await prisma.discoveredGrant.findUnique({
    where: { id: params.grantId },
    select: { id: true, title: true, agency: true },
  });
  if (!grant) return { error: `Grant ${params.grantId} not found.` };

  // Check if already in pipeline
  const existing = await prisma.pipelineGrant.findFirst({
    where: { grantId: params.grantId, portProfileId: ctx.portProfileId },
  });
  if (existing) {
    return {
      alreadyExists: true,
      pipelineGrantId: existing.id,
      stage: existing.stage,
      message: `Grant "${grant.title}" is already in your pipeline (stage: ${existing.stage}).`,
    };
  }

  const pg = await prisma.pipelineGrant.create({
    data: {
      grantId: params.grantId,
      portProfileId: ctx.portProfileId,
      stage: "eligible",
      notes: params.notes ?? "",
    },
  });

  await logPorterAudit({
    portId: ctx.portId,
    userId: ctx.userId,
    action: "add_to_pipeline",
    resourceType: "PipelineGrant",
    resourceId: pg.id,
    newValue: {
      grantId: params.grantId,
      grantTitle: grant.title,
      stage: "eligible",
    },
  });

  return {
    success: true,
    pipelineGrantId: pg.id,
    grantTitle: grant.title,
    agency: grant.agency,
    stage: "eligible",
    message: `Grant "${grant.title}" added to pipeline (stage: eligible).`,
  };
}
