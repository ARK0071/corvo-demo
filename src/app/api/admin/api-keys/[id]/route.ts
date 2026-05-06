import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db/client";

export const DELETE = withRole(["admin"], async (request, { user, params }) => {
  const id = params?.id;
  if (!id) return NextResponse.json({ error: "Missing key ID" }, { status: 400 });

  const key = await prisma.apiKey.findUnique({ where: { id } });
  if (!key) return NextResponse.json({ error: "Key not found" }, { status: 404 });

  await prisma.apiKey.update({
    where: { id },
    data: { active: false },
  });

  // Audit
  await prisma.auditLog.create({
    data: {
      portId: user.portId,
      userId: user.id,
      action: "admin.apikey.revoked",
      metadata: { keyId: id, keyName: key.name },
    },
  }).catch(() => {});

  return NextResponse.json({ success: true });
});
