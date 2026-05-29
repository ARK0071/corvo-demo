import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db/client";
import { z } from "zod";

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  title: z.string().default(""),
  portId: z.string().min(1),
  role: z.enum(["drafter", "reviewer", "certifying_official", "moderator", "admin"]),
});

export const GET = withRole(["admin", "moderator"], async (request, { user: caller }) => {
  const { searchParams } = new URL(request.url);
  const portId = searchParams.get("portId");
  const role = searchParams.get("role");
  const active = searchParams.get("active");

  const where: Record<string, unknown> = {};

  // Moderators can only see users in their own entity
  if (caller.role === "moderator") {
    where.portId = caller.portId;
  } else {
    if (portId) where.portId = portId;
  }

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

export const POST = withRole(["admin", "moderator"], async (request, { user: caller }) => {
  const body = await request.json();
  const parsed = createUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Moderators can only create users in their own entity and cannot assign admin/moderator roles
  if (caller.role === "moderator") {
    if (parsed.data.portId !== caller.portId) {
      return NextResponse.json(
        { error: "Moderators can only add users to their own entity" },
        { status: 403 }
      );
    }
    if (parsed.data.role === "admin" || parsed.data.role === "moderator") {
      return NextResponse.json(
        { error: "Moderators cannot assign admin or moderator roles" },
        { status: 403 }
      );
    }
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
