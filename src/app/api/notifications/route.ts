import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import * as Notifications from "@/lib/db/repositories/notifications";

// GET /api/notifications?unreadOnly=true&limit=50
export const GET = withAuth(async (request, { user }) => {
  const params = request.nextUrl.searchParams;
  const unreadOnly = params.get("unreadOnly") === "true";
  const limit = parseInt(params.get("limit") || "50", 10);

  const [notifications, unreadCount] = await Promise.all([
    Notifications.getNotifications(user.id, unreadOnly, limit),
    Notifications.getUnreadCount(user.id),
  ]);

  return NextResponse.json({ notifications, unreadCount });
});

// PUT /api/notifications (mark as read)
export const PUT = withAuth(async (request, { user }) => {
  const { action, notificationId } = await request.json();

  if (action === "mark_all_read") {
    await Notifications.markAllAsRead(user.id);
    return NextResponse.json({ success: true });
  }

  if (action === "mark_read" && notificationId) {
    await Notifications.markAsRead(notificationId);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
});
