import { prisma } from "../client";
import { DemoDiscoveredGrant as PrismaGrant, Prisma } from "@/generated/prisma";
import { DiscoveredGrant } from "@/lib/grants-gov";

// Convert Prisma model to application type
function toDiscoveredGrant(grant: PrismaGrant): DiscoveredGrant {
  return {
    id: grant.id,
    opportunityNumber: grant.opportunityNumber || "",
    title: grant.title,
    agency: grant.agency,
    agencyCode: grant.agencyCode || "",
    description: grant.description || "",
    awardFloor: Number(grant.awardFloor),
    awardCeiling: Number(grant.awardCeiling),
    totalFunding: Number(grant.totalFunding),
    closeDate: grant.closeDate?.toISOString().split("T")[0] || "",
    postDate: grant.postDate?.toISOString().split("T")[0] || "",
    status: grant.status,
    applicationUrl: grant.applicationUrl || "",
    eligibility: (grant.eligibility as string[]) || [],
    fundingCategories: (grant.fundingCategories as string[]) || [],
    fundingInstruments: (grant.fundingInstruments as string[]) || [],
    costSharing: grant.costSharing,
    alnNumbers: (grant.alnNumbers as string[]) || [],
    contactName: grant.contactName || undefined,
    contactEmail: grant.contactEmail || undefined,
    contactPhone: grant.contactPhone || undefined,
  };
}

// Convert application type to Prisma create input
function toPrismaCreate(
  grant: DiscoveredGrant
): Prisma.DemoDiscoveredGrantCreateInput {
  return {
    id: grant.id,
    opportunityNumber: grant.opportunityNumber || null,
    title: grant.title,
    agency: grant.agency,
    agencyCode: grant.agencyCode || null,
    description: grant.description || null,
    awardFloor: grant.awardFloor,
    awardCeiling: grant.awardCeiling,
    totalFunding: grant.totalFunding,
    closeDate: grant.closeDate ? new Date(grant.closeDate) : null,
    postDate: grant.postDate ? new Date(grant.postDate) : null,
    status: grant.status,
    applicationUrl: grant.applicationUrl || null,
    eligibility: grant.eligibility,
    fundingCategories: grant.fundingCategories,
    fundingInstruments: grant.fundingInstruments,
    costSharing: grant.costSharing,
    alnNumbers: grant.alnNumbers,
    contactName: grant.contactName || null,
    contactEmail: grant.contactEmail || null,
    contactPhone: grant.contactPhone || null,
  };
}

// Get grant by ID
export async function getGrantById(id: string): Promise<DiscoveredGrant | null> {
  const grant = await prisma.demoDiscoveredGrant.findUnique({
    where: { id },
  });
  return grant ? toDiscoveredGrant(grant) : null;
}

// Get multiple grants by IDs
export async function getGrantsByIds(ids: string[]): Promise<DiscoveredGrant[]> {
  const grants = await prisma.demoDiscoveredGrant.findMany({
    where: { id: { in: ids } },
  });
  return grants.map(toDiscoveredGrant);
}

// Search grants with filters
export interface GrantSearchParams {
  keyword?: string;
  status?: string[];
  agency?: string;
  minAward?: number;
  maxAward?: number;
  closeDateAfter?: Date;
  limit?: number;
  offset?: number;
}

export async function searchGrants(
  params: GrantSearchParams
): Promise<{ grants: DiscoveredGrant[]; total: number }> {
  const where: Prisma.DemoDiscoveredGrantWhereInput = {};

  if (params.keyword) {
    where.OR = [
      { title: { contains: params.keyword, mode: "insensitive" } },
      { description: { contains: params.keyword, mode: "insensitive" } },
      { agency: { contains: params.keyword, mode: "insensitive" } },
    ];
  }

  if (params.status && params.status.length > 0) {
    where.status = { in: params.status };
  }

  if (params.agency) {
    where.agency = { contains: params.agency, mode: "insensitive" };
  }

  if (params.minAward !== undefined) {
    where.awardCeiling = { gte: params.minAward };
  }

  if (params.maxAward !== undefined) {
    where.awardFloor = { lte: params.maxAward };
  }

  if (params.closeDateAfter) {
    where.closeDate = { gte: params.closeDateAfter };
  }

  const [grants, total] = await Promise.all([
    prisma.demoDiscoveredGrant.findMany({
      where,
      take: params.limit || 50,
      skip: params.offset || 0,
      orderBy: { closeDate: "asc" },
    }),
    prisma.demoDiscoveredGrant.count({ where }),
  ]);

  return {
    grants: grants.map(toDiscoveredGrant),
    total,
  };
}

// Get all active grants (posted or forecasted, not closed)
export async function getActiveGrants(
  limit: number = 100
): Promise<DiscoveredGrant[]> {
  const grants = await prisma.demoDiscoveredGrant.findMany({
    where: {
      status: { in: ["posted", "forecasted"] },
      OR: [{ closeDate: { gte: new Date() } }, { closeDate: null }],
    },
    take: limit,
    orderBy: { closeDate: "asc" },
  });
  return grants.map(toDiscoveredGrant);
}

// Upsert grant (create or update)
export async function upsertGrant(grant: DiscoveredGrant): Promise<DiscoveredGrant> {
  const data = toPrismaCreate(grant);
  const result = await prisma.demoDiscoveredGrant.upsert({
    where: { id: grant.id },
    create: data,
    update: {
      ...data,
      id: undefined,
      lastSyncedAt: new Date(),
    },
  });
  return toDiscoveredGrant(result);
}

// Batch upsert grants
export async function upsertGrants(
  grants: DiscoveredGrant[]
): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  for (const grant of grants) {
    const data = toPrismaCreate(grant);

    const existing = await prisma.demoDiscoveredGrant.findUnique({
      where: { id: grant.id },
      select: { id: true },
    });

    if (existing) {
      await prisma.demoDiscoveredGrant.update({
        where: { id: grant.id },
        data: {
          ...data,
          id: undefined,
          lastSyncedAt: new Date(),
        },
      });
      updated++;
    } else {
      await prisma.demoDiscoveredGrant.create({ data });
      created++;
    }
  }

  return { created, updated };
}

// Delete grant
export async function deleteGrant(id: string): Promise<void> {
  await prisma.demoDiscoveredGrant.delete({
    where: { id },
  });
}

// Get grants count by status
export async function getGrantCountsByStatus(): Promise<Record<string, number>> {
  const results = await prisma.demoDiscoveredGrant.groupBy({
    by: ["status"],
    _count: true,
  });

  return results.reduce(
    (acc, r) => {
      acc[r.status] = r._count;
      return acc;
    },
    {} as Record<string, number>
  );
}

// Get last sync time
export async function getLastSyncTime(): Promise<Date | null> {
  const result = await prisma.demoDiscoveredGrant.findFirst({
    orderBy: { lastSyncedAt: "desc" },
    select: { lastSyncedAt: true },
  });
  return result?.lastSyncedAt || null;
}