import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db/client";
import { randomBytes, createHash } from "crypto";

export const GET = withRole(["admin"], async () => {
  const keys = await prisma.apiKey.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json({ keys });
});

export const POST = withRole(["admin"], async (request, { user }) => {
  const { name } = await request.json();

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // Generate a secure random key
  const rawKey = `corvo_${randomBytes(32).toString("hex")}`;
  const keyHash = createHash("sha256").update(rawKey).digest("hex");
  const keyPrefix = rawKey.slice(0, 12);

  await prisma.apiKey.create({
    data: {
      userId: user.id,
      name: name.trim(),
      keyHash,
      keyPrefix,
    },
  });

  // Audit
  await prisma.auditLog.create({
    data: {
      portId: user.portId,
      userId: user.id,
      action: "admin.apikey.created",
      metadata: { keyName: name.trim(), keyPrefix },
    },
  }).catch(() => {});

  // Return the raw key ONCE — it cannot be retrieved again
  return NextResponse.json({ key: rawKey, prefix: keyPrefix }, { status: 201 });
});
