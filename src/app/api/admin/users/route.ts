import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db/client";
import { z } from "zod";

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  title: z.string().default(""),
  portId: z.string().min(1),
  role: z.enum(["drafter", "reviewer", "certifying_official", "admin"]),
});

export const GET = withRole(["admin"], async (request) => {
  const { searchParams } = new URL(request.url);
  const portId = searchParams.get("portId");
  const role = searchParams.get("role");
  const active = searchParams.get("active");

  const where: Record<string, unknown> = {};
  if (portId) where.portId = portId;
  if (role) where.role = role;
  if (active !== null && active !== undefined && active !== "") where.active = active === "true";

  const users = await prisma.user.findMany({
    where,
    orderBy: { name: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      title: true,
      portId: true,
      role: true,
      active: true,
      lastLoginAt: true,
      loginCount: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ users });
});

export const POST = withRole(["admin"], async (request) => {
  const body = await request.json();
  const parsed = createUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Check if email already exists
  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (existing) {
    return NextResponse.json(
      { error: "A user with this email already exists" },
      { status: 409 }
    );
  }

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      title: parsed.data.title,
      portId: parsed.data.portId,
      role: parsed.data.role,
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      portId: user.portId,
      action: "admin.user.created",
      metadata: { createdUserId: user.id, email: user.email, role: user.role },
    },
  }).catch(() => {});

  return NextResponse.json({ user }, { status: 201 });
});
