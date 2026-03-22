import { prisma } from "../client";
import { PortVendor as PrismaVendor, Prisma } from "@/generated/prisma";
import { PortVendor } from "@/data/port-vendors";
import { findSimilarVendors, findVendorsForGrant } from "../vector";

// Convert Prisma model to application type
function toPortVendor(vendor: PrismaVendor): PortVendor {
  return {
    id: vendor.id,
    name: vendor.name,
    sector: vendor.sector || "",
    headquarters: vendor.headquarters || "",
    annualRevenue: Number(vendor.annualRevenue),
    employeeCount: vendor.employeeCount,
    capabilities: (vendor.capabilities as string[]) || [],
    certifications: (vendor.certifications as string[]) || [],
    pastPortProjects:
      (vendor.pastPortProjects as {
        name: string;
        port: string;
        value: number;
        year: number;
      }[]) || [],
    bondingCapacity: Number(vendor.bondingCapacity),
    safetyRecord: Number(vendor.safetyRecord),
    disadvantagedBusiness: vendor.disadvantagedBusiness,
    keyPersonnel:
      (vendor.keyPersonnel as { name: string; title: string }[]) || [],
    description: vendor.description || "",
  };
}

// Convert application type to Prisma create input
function toPrismaCreate(vendor: PortVendor): Prisma.PortVendorCreateInput {
  return {
    id: vendor.id,
    name: vendor.name,
    sector: vendor.sector || null,
    headquarters: vendor.headquarters || null,
    annualRevenue: vendor.annualRevenue,
    bondingCapacity: vendor.bondingCapacity,
    employeeCount: vendor.employeeCount,
    safetyRecord: vendor.safetyRecord,
    disadvantagedBusiness: vendor.disadvantagedBusiness,
    capabilities: vendor.capabilities,
    certifications: vendor.certifications,
    keyPersonnel: vendor.keyPersonnel,
    pastPortProjects: vendor.pastPortProjects,
    description: vendor.description || null,
  };
}

// Get vendor by ID
export async function getVendorById(id: string): Promise<PortVendor | null> {
  const vendor = await prisma.portVendor.findUnique({
    where: { id },
  });
  return vendor ? toPortVendor(vendor) : null;
}

// Get multiple vendors by IDs
export async function getVendorsByIds(ids: string[]): Promise<PortVendor[]> {
  const vendors = await prisma.portVendor.findMany({
    where: { id: { in: ids } },
  });
  return vendors.map(toPortVendor);
}

// Search vendors with filters
export interface VendorSearchParams {
  keyword?: string;
  sector?: string;
  capabilities?: string[];
  certifications?: string[];
  disadvantagedBusiness?: string;
  minBondingCapacity?: number;
  limit?: number;
  offset?: number;
}

export async function searchVendors(
  params: VendorSearchParams
): Promise<{ vendors: PortVendor[]; total: number }> {
  const where: Prisma.PortVendorWhereInput = {};

  if (params.keyword) {
    where.OR = [
      { name: { contains: params.keyword, mode: "insensitive" } },
      { description: { contains: params.keyword, mode: "insensitive" } },
      { sector: { contains: params.keyword, mode: "insensitive" } },
    ];
  }

  if (params.sector) {
    where.sector = { contains: params.sector, mode: "insensitive" };
  }

  if (params.disadvantagedBusiness) {
    where.disadvantagedBusiness = params.disadvantagedBusiness;
  }

  if (params.minBondingCapacity !== undefined) {
    where.bondingCapacity = { gte: params.minBondingCapacity };
  }

  // For array contains queries, we need to use raw SQL or JSONB operators
  // For now, we'll filter capabilities/certifications in memory after basic query

  const [vendors, total] = await Promise.all([
    prisma.portVendor.findMany({
      where,
      take: params.limit || 50,
      skip: params.offset || 0,
      orderBy: { name: "asc" },
    }),
    prisma.portVendor.count({ where }),
  ]);

  let result = vendors.map(toPortVendor);

  // Post-filter by capabilities if specified
  if (params.capabilities && params.capabilities.length > 0) {
    const capLower = params.capabilities.map((c) => c.toLowerCase());
    result = result.filter((v) =>
      capLower.some((cap) =>
        v.capabilities.some((vc) => vc.toLowerCase().includes(cap))
      )
    );
  }

  // Post-filter by certifications if specified
  if (params.certifications && params.certifications.length > 0) {
    const certLower = params.certifications.map((c) => c.toLowerCase());
    result = result.filter((v) =>
      certLower.some((cert) =>
        v.certifications.some((vc) => vc.toLowerCase().includes(cert))
      )
    );
  }

  return {
    vendors: result,
    total,
  };
}

// Get all vendors
export async function getAllVendors(limit: number = 500): Promise<PortVendor[]> {
  const vendors = await prisma.portVendor.findMany({
    take: limit,
    orderBy: { name: "asc" },
  });
  return vendors.map(toPortVendor);
}

// Get vendors by sector
export async function getVendorsBySector(sector: string): Promise<PortVendor[]> {
  const vendors = await prisma.portVendor.findMany({
    where: {
      sector: { contains: sector, mode: "insensitive" },
    },
    orderBy: { name: "asc" },
  });
  return vendors.map(toPortVendor);
}

// Get DBE vendors
export async function getDBEVendors(): Promise<PortVendor[]> {
  const vendors = await prisma.portVendor.findMany({
    where: {
      disadvantagedBusiness: { not: null },
    },
    orderBy: { name: "asc" },
  });
  return vendors.map(toPortVendor);
}

// Upsert vendor (create or update)
export async function upsertVendor(vendor: PortVendor): Promise<PortVendor> {
  const data = toPrismaCreate(vendor);
  const result = await prisma.portVendor.upsert({
    where: { id: vendor.id },
    create: data,
    update: {
      ...data,
      id: undefined,
      lastSyncedAt: new Date(),
    },
  });
  return toPortVendor(result);
}

// Batch upsert vendors
export async function upsertVendors(
  vendors: PortVendor[]
): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  // Use individual upserts (Prisma 7 driver adapters have transaction limitations)
  for (const vendor of vendors) {
    const data = toPrismaCreate(vendor);

    const existing = await prisma.portVendor.findUnique({
      where: { id: vendor.id },
      select: { id: true },
    });

    if (existing) {
      await prisma.portVendor.update({
        where: { id: vendor.id },
        data: {
          ...data,
          id: undefined,
          lastSyncedAt: new Date(),
        },
      });
      updated++;
    } else {
      await prisma.portVendor.create({ data });
      created++;
    }
  }

  return { created, updated };
}

// Delete vendor
export async function deleteVendor(id: string): Promise<void> {
  await prisma.portVendor.delete({
    where: { id },
  });
}

// Get vendor count
export async function getVendorCount(): Promise<number> {
  return prisma.portVendor.count();
}

// Get vendors count by certification type
export async function getVendorCountsByDBE(): Promise<Record<string, number>> {
  const results = await prisma.portVendor.groupBy({
    by: ["disadvantagedBusiness"],
    _count: true,
    where: {
      disadvantagedBusiness: { not: null },
    },
  });

  return results.reduce(
    (acc, r) => {
      if (r.disadvantagedBusiness) {
        acc[r.disadvantagedBusiness] = r._count;
      }
      return acc;
    },
    {} as Record<string, number>
  );
}

// Get last sync time
export async function getLastSyncTime(): Promise<Date | null> {
  const result = await prisma.portVendor.findFirst({
    orderBy: { lastSyncedAt: "desc" },
    select: { lastSyncedAt: true },
  });
  return result?.lastSyncedAt || null;
}

// Vector search: find vendors similar to an embedding
export async function findSimilarVendorsByEmbedding(
  embedding: number[],
  limit: number = 20,
  minSimilarity: number = 0.5
) {
  return findSimilarVendors(embedding, limit, minSimilarity);
}

// Vector search: find vendors matching a grant
export async function findVendorsMatchingGrant(
  grantId: string,
  limit: number = 30,
  minSimilarity: number = 0.4
) {
  return findVendorsForGrant(grantId, limit, minSimilarity);
}

// Check if vendors are loaded in database
export async function isVendorsLoaded(): Promise<boolean> {
  const count = await prisma.portVendor.count();
  return count > 0;
}
