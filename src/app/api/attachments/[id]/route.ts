import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db/client";
import { deleteFile } from "@/lib/s3/presigned";

export const DELETE = withAuth(
  async (
    _request: NextRequest,
    { user, params }
  ) => {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "Attachment ID required" }, { status: 400 });
    }

    const attachment = await prisma.attachment.findUnique({
      where: { id },
    });

    if (!attachment) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    // Only the uploader or admin/moderator can delete
    if (attachment.uploadedById !== user.id && !["admin", "moderator"].includes(user.role)) {
      return NextResponse.json({ error: "Not authorized to delete this attachment" }, { status: 403 });
    }

    await deleteFile(attachment.fileKey);
    await prisma.attachment.delete({ where: { id } });

    return NextResponse.json({ success: true });
  }
);
