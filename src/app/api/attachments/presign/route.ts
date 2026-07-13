import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db/client";
import {
  validateUpload,
  buildFileKey,
  generateUploadUrl,
} from "@/lib/s3/presigned";

export const POST = withAuth(async (request: NextRequest, { user }) => {
  const body = await request.json();
  const { fileName, mimeType, fileSize, resourceType, resourceId } = body;

  if (!fileName || !mimeType || !fileSize || !resourceType || !resourceId) {
    return NextResponse.json(
      { error: "fileName, mimeType, fileSize, resourceType, and resourceId are required" },
      { status: 400 }
    );
  }

  const validationError = validateUpload(mimeType, fileSize);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const fileKey = buildFileKey(resourceType, resourceId, fileName);
  const uploadUrl = await generateUploadUrl(fileKey, mimeType);

  const attachment = await prisma.attachment.create({
    data: {
      uploadedById: user.id,
      fileName,
      fileKey,
      fileSize,
      mimeType,
      resourceType,
      resourceId,
    },
  });

  return NextResponse.json({ uploadUrl, attachment });
});
