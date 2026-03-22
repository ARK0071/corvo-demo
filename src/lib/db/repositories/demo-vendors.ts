import { prisma } from "../client";
import { DemoPortVendor as PrismaVendor, Prisma } from "@/generated/prisma";
import type { PortVendor } from "@/data/port-vendors";

// Convert Prisma model to application type
function toPortVendor(vendor: PrismaVendor): PortVendor {
  return {
    id: vendor.id,
    name: vendor.name,
    sector: vendor.sector || "",
    headquarters: vendor.headquarters || "",
    annualRevenue: Number(vendor.annualRevenue),
    bondingCapacity: Number(vendor.bondingCapacity),
    employeeCount: vendor.employeeCount,
    safetyRecord: Number(vendor.safetyRecord),
    disadvantagedBusiness: vendor.disadvantagedBusiness ?? null,
    capabilities: (vendor.capabilities as string[]) || [],
    certifications: (vendor.certifications as string[]) || [],
    keyPersonnel: (vendor.keyPersonnel as any[]) || [],
    pastPortProjects: (vendor.pastPortProjects as any[]) || [],
    description: vendor.description ?? "",
  };
}

// Convert application type to Prisma create input
function toPrismaCreate(vendor: PortVendor): Prisma.DemoPortVendorCreateInput {
  return {
    id: vendor.id,
    name: vendor.name,
    sector: vendor.sector || null,
    headquarters: vendor.headquarters || null,
    annualRevenue: vendor.annualRevenue || 0,
    bondingCapacity: vendor.bondingCapacity || 0,
    employeeCount: vendor.employeeCount || 0,
    safetyRecord: vendor.safetyRecord || 0.8,
    disadvantagedBusiness: vendor.disadvantagedBusiness || null,
    capabilities: vendor.capabilities || [],
    certifications: vendor.certifications || [],
    keyPersonnel: vendor.keyPersonnel || [],
    pastPortProjects: vendor.pastPortProjects || [],
    description: vendor.description || null,
  };
}

// Get vendor by ID
export async function getVendorById(id: string): Promise<PortVendor | null> {
  const vendor = await prisma.demoPortVendor.findUnique({
    where: { id },
  });
  return vendor ? toPortVendor(vendor) : null;
}

// Get multiple vendors by IDs
export async function getVendorsByIds(ids: string[]): Promise<PortVendor[]> {
  const vendors = await prisma.demoPortVendor.findMany({
    where: { id: { in: ids } },
  });
  return vendors.map(toPortVendor);
}

// Search vendors with filters
export interface VendorSearchParams {
  keyword?: string;
  sector?: string;
  disadvantagedBusiness?: string;
  minRevenue?: number;
  maxRevenue?: number;
  capabilities?: string[];
  certifications?: string[];
  limit?: number;
  offset?: number;
}

export async function searchVendors(
  params: VendorSearchParams
): Promise<{ vendors: PortVendor[]; total: number }> {
  const where: Prisma.DemoPortVendorWhereInput = {};

  if (params.keyword) {
    where.OR = [
      { name: { contains: params.keyword, mode: "insensitive" } },
      { description: { contains: params.keyword, mode: "insensitive" } },
    ];
  }

  if (params.sector) {
    where.sector = { equals: params.sector, mode: "insensitive" };
  }

  if (params.disadvantagedBusiness) {
    where.disadvantagedBusiness = params.disadvantagedBusiness;
  }

  const [vendors, total] = await Promise.all([
    prisma.demoPortVendor.findMany({
      where,
      take: params.limit || 50,
      skip: params.offset || 0,
      orderBy: { name: "asc" },
    }),
    prisma.demoPortVendor.count({ where }),
  ]);

  return {
    vendors: vendors.map(toPortVendor),
    total,
  };
}

// Upsert vendor (create or update)
export async function upsertVendor(vendor: PortVendor): Promise<PortVendor> {
  const data = toPrismaCreate(vendor);
  const result = await prisma.demoPortVendor.upsert({
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

  for (const vendor of vendors) {
    const data = toPrismaCreate(vendor);

    const existing = await prisma.demoPortVendor.findUnique({
      where: { id: vendor.id },
      select: { id: true },
    });

    if (existing) {
      await prisma.demoPortVendor.update({
        where: { id: vendor.id },
        data: {
          ...data,
          id: undefined,
          lastSyncedAt: new Date(),
        },
      });
      updated++;
    } else {
      await prisma.demoPortVendor.create({ data });
      created++;
    }
  }

  return { created, updated };
}

// Delete vendor
export async function deleteVendor(id: string): Promise<void> {
  await prisma.demoPortVendor.delete({
    where: { id },
  });
}

// Get vendor counts by sector
export async function getVendorCountsBySector(): Promise<Record<string, number>> {
  const results = await prisma.demoPortVendor.groupBy({
    by: ["sector"],
    _count: true,
  });

  return results.reduce(
    (acc, r) => {
      if (r.sector) acc[r.sector] = r._count;
      return acc;
    },
    {} as Record<string, number>
  );
}

// Get last sync time
export async function getLastSyncTime(): Promise<Date | null> {
  const result = await prisma.demoPortVendor.findFirst({
    orderBy: { lastSyncedAt: "desc" },
    select: { lastSyncedAt: true },
  });
  return result?.lastSyncedAt || null;
}