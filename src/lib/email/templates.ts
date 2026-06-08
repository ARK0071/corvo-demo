const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.corvo.ai";

function layout(content: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <div style="border-bottom: 2px solid #3d8b8b; padding-bottom: 12px; margin-bottom: 24px;">
        <span style="font-size: 18px; font-weight: 700; color: #1a1a1a;">Corvo</span>
      </div>
      ${content}
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e5e5; color: #737373; font-size: 12px;">
        <p>You're receiving this because you're a member of a Corvo grant team.</p>
      </div>
    </div>
  `;
}

export function taskAssignmentEmail(params: {
  assigneeName: string;
  assignerName: string;
  taskTitle: string;
  taskId: string;
  awardTitle?: string;
  dueDate?: string;
}): { subject: string; html: string } {
  const context = params.awardTitle ? ` on <strong>${params.awardTitle}</strong>` : "";
  const dueLine = params.dueDate
    ? `<p style="color: #737373; font-size: 14px;">Due: <strong>${new Date(params.dueDate + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</strong></p>`
    : "";

  return {
    subject: `New task assigned: ${params.taskTitle}`,
    html: layout(`
      <p style="font-size: 14px; color: #404040;">Hi ${params.assigneeName},</p>
      <p style="font-size: 14px; color: #404040;">
        <strong>${params.assignerName}</strong> assigned you a new task${context}:
      </p>
      <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="font-size: 16px; font-weight: 600; color: #1a1a1a; margin: 0 0 8px 0;">${params.taskTitle}</p>
        ${dueLine}
      </div>
      <a href="${BASE_URL}/grants?tab=pipeline" style="display: inline-block; background: #3d8b8b; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500;">
        View Task
      </a>
    `),
  };
}

export function taskDueReminderEmail(params: {
  userName: string;
  taskTitle: string;
  taskId: string;
  dueDate: string;
  daysUntilDue: number;
  awardTitle?: string;
}): { subject: string; html: string } {
  const urgency =
    params.daysUntilDue === 0 ? "due today"
    : params.daysUntilDue < 0 ? `overdue by ${Math.abs(params.daysUntilDue)} day(s)`
    : `due in ${params.daysUntilDue} day(s)`;

  const urgencyColor = params.daysUntilDue <= 0 ? "#dc2626" : params.daysUntilDue <= 1 ? "#ea580c" : "#d97706";

  return {
    subject: `Task ${urgency}: ${params.taskTitle}`,
    html: layout(`
      <p style="font-size: 14px; color: #404040;">Hi ${params.userName},</p>
      <p style="font-size: 14px; color: #404040;">
        You have a task that is <strong style="color: ${urgencyColor};">${urgency}</strong>:
      </p>
      <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 3px solid ${urgencyColor};">
        <p style="font-size: 16px; font-weight: 600; color: #1a1a1a; margin: 0 0 8px 0;">${params.taskTitle}</p>
        <p style="color: #737373; font-size: 14px; margin: 0;">
          Due: ${new Date(params.dueDate + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          ${params.awardTitle ? ` &middot; ${params.awardTitle}` : ""}
        </p>
      </div>
      <a href="${BASE_URL}/grants?tab=pipeline" style="display: inline-block; background: #3d8b8b; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500;">
        View My Tasks
      </a>
    `),
  };
}
