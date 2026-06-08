import { prisma } from "../client";

export type NotificationType =
  | "assignment"
  | "due_soon"
  | "due_today"
  | "overdue"
  | "status_change"
  | "comment"
  | "blocked";

export interface NotificationData {
  id: string;
  userId: string;
  taskId: string | null;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  emailSent: boolean;
  createdAt: string;
}

export async function getNotifications(
  userId: string,
  unreadOnly = false,
  limit = 50
): Promise<NotificationData[]> {
  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      ...(unreadOnly ? { read: false } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return notifications.map((n: { id: string; userId: string; taskId: string | null; type: string; title: string; body: string; read: boolean; emailSent: boolean; createdAt: Date }) => ({
    id: n.id,
    userId: n.userId,
    taskId: n.taskId,
    type: n.type as NotificationType,
    title: n.title,
    body: n.body,
    read: n.read,
    emailSent: n.emailSent,
    createdAt: n.createdAt.toISOString(),
  }));
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, read: false },
  });
}

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  taskId?: string
): Promise<NotificationData> {
  const n = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      body,
      taskId: taskId || null,
    },
  });

  return {
    id: n.id,
    userId: n.userId,
    taskId: n.taskId,
    type: n.type as NotificationType,
    title: n.title,
    body: n.body,
    read: n.read,
    emailSent: n.emailSent,
    createdAt: n.createdAt.toISOString(),
  };
}

export async function markAsRead(notificationId: string): Promise<void> {
  await prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });
}

export async function markAllAsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}

export async function markEmailSent(notificationId: string): Promise<void> {
  await prisma.notification.update({
    where: { id: notificationId },
    data: { emailSent: true },
  });
}

export async function createTaskAssignmentNotification(
  assigneeId: string,
  assignerName: string,
  taskTitle: string,
  taskId: string,
  awardTitle?: string
): Promise<NotificationData> {
  const context = awardTitle ? ` on ${awardTitle}` : "";
  return createNotification(
    assigneeId,
    "assignment",
    `New task assigned to you`,
    `${assignerName} assigned you "${taskTitle}"${context}`,
    taskId
  );
}

export async function createDueReminderNotification(
  userId: string,
  taskTitle: string,
  taskId: string,
  daysUntilDue: number
): Promise<NotificationData> {
  const urgency =
    daysUntilDue === 0 ? "due today"
    : daysUntilDue < 0 ? `overdue by ${Math.abs(daysUntilDue)} day(s)`
    : `due in ${daysUntilDue} day(s)`;

  const type: NotificationType =
    daysUntilDue < 0 ? "overdue"
    : daysUntilDue === 0 ? "due_today"
    : "due_soon";

  return createNotification(
    userId,
    type,
    `Task ${urgency}`,
    `"${taskTitle}" is ${urgency}`,
    taskId
  );
}

export async function createStatusChangeNotification(
  userId: string,
  changerName: string,
  taskTitle: string,
  taskId: string,
  newStatus: string
): Promise<NotificationData> {
  return createNotification(
    userId,
    newStatus === "blocked" ? "blocked" : "status_change",
    `Task status updated`,
    `${changerName} changed "${taskTitle}" to ${newStatus.replace(/_/g, " ")}`,
    taskId
  );
}
