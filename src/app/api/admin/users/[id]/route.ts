import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db/client";
import { z } from "zod";

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  title: z.string().optional(),
  portId: z.string().min(1).optional(),
  role: z.enum(["drafter", "reviewer", "certifying_official", "admin"]).optional(),
  active: z.boolean().optional(),
});

export const GET = withRole(["admin"], async (request, { params }) => {
  const id = params?.id;
  if (!id) return NextResponse.json({ error: "Missing user ID" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({ user });
});

export const PUT = withRole(["admin"], async (request, { user: adminUser, params }) => {
  const id = params?.id;
  if (!id) return NextResponse.json({ error: "Missing user ID" }, { status: 400 });

  const body = await request.json();
  const parsed = updateUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const updated = await prisma.user.update({
    where: { id },
    data: parsed.data,
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      portId: adminUser.portId,
      userId: adminUser.id,
      action: "admin.user.updated",
      metadata: {
        targetUserId: id,
        changes: parsed.data,
      },
    },
  }).catch(() => {});

  return NextResponse.json({ user: updated });
});

export const DELETE = withRole(["admin"], async (request, { user: adminUser, params }) => {
  const id = params?.id;
  if (!id) return NextResponse.json({ error: "Missing user ID" }, { status: 400 });

  // Deactivate rather than delete
  await prisma.user.update({
    where: { id },
    data: { active: false },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      portId: adminUser.portId,
      userId: adminUser.id,
      action: "admin.user.deactivated",
      metadata: { targetUserId: id },
    },
  }).catch(() => {});

  return NextResponse.json({ success: true });
});
