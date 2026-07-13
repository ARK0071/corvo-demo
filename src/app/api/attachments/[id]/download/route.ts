import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db/client";
import { generateDownloadUrl } from "@/lib/s3/presigned";

export const GET = withAuth(
  async (
    _request: NextRequest,
    { params }
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

    const downloadUrl = await generateDownloadUrl(attachment.fileKey, attachment.fileName);

    return NextResponse.json({ downloadUrl });
  }
);
