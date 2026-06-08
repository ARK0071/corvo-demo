import { prisma } from "../client";
import { Prisma } from "@/generated/prisma";

export type AssignmentRole = "grant_lead" | "area_owner";

export interface GrantAssignmentWithUser {
  id: string;
  portProfileId: string;
  awardId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userImage: string | null;
  role: AssignmentRole;
  area: string | null;
  createdAt: string;
}

const assignmentInclude = {
  user: { select: { id: true, name: true, email: true, image: true } },
} satisfies Prisma.GrantAssignmentInclude;

type AssignmentWithUser = Prisma.GrantAssignmentGetPayload<{ include: typeof assignmentInclude }>;

function toAssignmentWithUser(a: AssignmentWithUser): GrantAssignmentWithUser {
  return {
    id: a.id,
    portProfileId: a.portProfileId,
    awardId: a.awardId,
    userId: a.userId,
    userName: a.user.name,
    userEmail: a.user.email,
    userImage: a.user.image,
    role: a.role as AssignmentRole,
    area: a.area,
    createdAt: a.createdAt.toISOString(),
  };
}

export async function getAssignmentsForAward(awardId: string): Promise<GrantAssignmentWithUser[]> {
  const assignments = await prisma.grantAssignment.findMany({
    where: { awardId },
    include: assignmentInclude,
    orderBy: [{ role: "asc" }, { area: "asc" }],
  });

  return assignments.map(toAssignmentWithUser);
}

export async function getAssignmentsForUser(
  userId: string,
  portProfileId: string
): Promise<GrantAssignmentWithUser[]> {
  const assignments = await prisma.grantAssignment.findMany({
    where: { userId, portProfileId },
    include: assignmentInclude,
    orderBy: { createdAt: "desc" },
  });

  return assignments.map(toAssignmentWithUser);
}

export async function assignUser(
  portProfileId: string,
  awardId: string,
  userId: string,
  role: AssignmentRole,
  area?: string
): Promise<GrantAssignmentWithUser> {
  // If assigning grant_lead, remove any existing lead first
  if (role === "grant_lead") {
    await prisma.grantAssignment.deleteMany({
      where: { awardId, role: "grant_lead" },
    });
  }

  // If assigning area_owner for a specific area, remove existing owner
  if (role === "area_owner" && area) {
    await prisma.grantAssignment.deleteMany({
      where: { awardId, role: "area_owner", area },
    });
  }

  const assignment = await prisma.grantAssignment.create({
    data: {
      portProfileId,
      awardId,
      userId,
      role,
      area: area || null,
    },
    include: assignmentInclude,
  });

  return toAssignmentWithUser(assignment);
}

export async function removeAssignment(id: string): Promise<boolean> {
  await prisma.grantAssignment.delete({ where: { id } });
  return true;
}

export async function getGrantLead(awardId: string): Promise<GrantAssignmentWithUser | null> {
  const assignment = await prisma.grantAssignment.findFirst({
    where: { awardId, role: "grant_lead" },
    include: assignmentInclude,
  });

  return assignment ? toAssignmentWithUser(assignment) : null;
}

export async function getAreaOwner(
  awardId: string,
  area: string
): Promise<GrantAssignmentWithUser | null> {
  const assignment = await prisma.grantAssignment.findFirst({
    where: { awardId, role: "area_owner", area },
    include: assignmentInclude,
  });

  return assignment ? toAssignmentWithUser(assignment) : null;
}

export async function getTeamMembers(portProfileId: string) {
  return prisma.user.findMany({
    where: {
      portId: portProfileId,
      active: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      title: true,
      role: true,
    },
    orderBy: { name: "asc" },
  });
}

export async function getTeamMembersByPortSlug(portId: string) {
  return prisma.user.findMany({
    where: {
      portId,
      active: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      title: true,
      role: true,
    },
    orderBy: { name: "asc" },
  });
}
