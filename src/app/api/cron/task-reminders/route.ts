import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { sendEmail } from "@/lib/email/client";
import { taskDueReminderEmail } from "@/lib/email/templates";
import * as Notifications from "@/lib/db/repositories/notifications";

/**
 * Cron endpoint: POST /api/cron/task-reminders
 *
 * Finds tasks due soon (7 days, 1 day, today, overdue) and sends
 * email + in-app notifications to assignees.
 *
 * Protect with a CRON_SECRET header in production.
 */
export async function POST(request: NextRequest) {
  const cronSecret = request.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  // Reminder windows: 7 days, 1 day, today, overdue
  const windows = [
    { daysOut: 7, label: "due_soon" as const },
    { daysOut: 1, label: "due_soon" as const },
    { daysOut: 0, label: "due_today" as const },
    { daysOut: -1, label: "overdue" as const },
  ];

  let emailsSent = 0;
  let notificationsCreated = 0;

  for (const window of windows) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + window.daysOut);
    const targetStr = targetDate.toISOString().split("T")[0];

    const tasks = await prisma.task.findMany({
      where: {
        dueDate: new Date(targetStr),
        status: { notIn: ["done", "submitted"] },
        assigneeId: { not: null },
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        award: { select: { title: true } },
      },
    });

    for (const task of tasks) {
      if (!task.assignee) continue;

      // Check if we already sent a notification for this task+date combo today
      const existing = await prisma.notification.findFirst({
        where: {
          userId: task.assignee.id,
          taskId: task.id,
          type: window.label,
          createdAt: { gte: new Date(todayStr) },
        },
      });
      if (existing) continue;

      // Create in-app notification
      await Notifications.createDueReminderNotification(
        task.assignee.id,
        task.title,
        task.id,
        window.daysOut
      );
      notificationsCreated++;

      // Send email
      const template = taskDueReminderEmail({
        userName: task.assignee.name,
        taskTitle: task.title,
        taskId: task.id,
        dueDate: targetStr,
        daysUntilDue: window.daysOut,
        awardTitle: task.award?.title,
      });

      const sent = await sendEmail({
        to: task.assignee.email,
        subject: template.subject,
        html: template.html,
      });

      if (sent) emailsSent++;
    }
  }

  return NextResponse.json({
    success: true,
    emailsSent,
    notificationsCreated,
    timestamp: new Date().toISOString(),
  });
}
