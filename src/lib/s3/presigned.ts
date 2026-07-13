import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, S3_BUCKET } from "./client";

const UPLOAD_EXPIRY = 300; // 5 minutes
const DOWNLOAD_EXPIRY = 3600; // 1 hour

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/csv",
  "text/plain",
]);

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function validateUpload(mimeType: string, fileSize: number): string | null {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return `File type ${mimeType} is not allowed`;
  }
  if (fileSize > MAX_FILE_SIZE) {
    return `File size exceeds maximum of 50MB`;
  }
  return null;
}

export function buildFileKey(resourceType: string, resourceId: string, fileName: string): string {
  const timestamp = Date.now();
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `uploads/${resourceType}/${resourceId}/${timestamp}-${safeFileName}`;
}

export async function generateUploadUrl(fileKey: string, mimeType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: fileKey,
    ContentType: mimeType,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return getSignedUrl(s3 as any, command, { expiresIn: UPLOAD_EXPIRY });
}

export async function generateDownloadUrl(fileKey: string, fileName: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: fileKey,
    ResponseContentDisposition: `attachment; filename="${fileName}"`,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return getSignedUrl(s3 as any, command, { expiresIn: DOWNLOAD_EXPIRY });
}

export async function deleteFile(fileKey: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: S3_BUCKET,
    Key: fileKey,
  });
  await s3.send(command);
}
