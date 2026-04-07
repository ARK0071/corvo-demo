import { prisma } from "../client";
import { DemoPortVendor as PrismaVendor, Prisma } from "@/generated/prisma";
import type { PortVendor } from "@/data/port-vendors";
import { getTenantConfig } from "../tenant-config";

// Get current port ID from tenant config
function getPortId(): string {
  return getTenantConfig().portId;
}

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
function toPrismaCreate(
  vendor: PortVendor,
  portId: string
): Prisma.DemoPortVendorCreateInput {
  return {
    id: vendor.id,
    portId: portId,
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

// Get vendor by ID (filtered by current port)
export async function getVendorById(id: string): Promise<PortVendor | null> {
  const portId = getPortId();
  const vendor = await prisma.demoPortVendor.findFirst({
    where: { id, portId },
  });
  return vendor ? toPortVendor(vendor) : null;
}

// Get multiple vendors by IDs (filtered by current port)
export async function getVendorsByIds(ids: string[]): Promise<PortVendor[]> {
  const portId = getPortId();
  const vendors = await prisma.demoPortVendor.findMany({
    where: { id: { in: ids }, portId },
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
  const portId = getPortId();
  const where: Prisma.DemoPortVendorWhereInput = { portId };

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
  const portId = getPortId();
  const data = toPrismaCreate(vendor, portId);

  // Check if exists for this port
  const existing = await prisma.demoPortVendor.findFirst({
    where: { id: vendor.id, portId },
  });

  let result: PrismaVendor;
  if (existing) {
    result = await prisma.demoPortVendor.update({
      where: { id_portId: { id: vendor.id, portId } },
      data: {
        ...data,
        id: undefined,
        portId: undefined,
        lastSyncedAt: new Date(),
      },
    });
  } else {
    result = await prisma.demoPortVendor.create({ data });
  }

  return toPortVendor(result);
}

// Batch upsert vendors
export async function upsertVendors(
  vendors: PortVendor[]
): Promise<{ created: number; updated: number }> {
  const portId = getPortId();
  let created = 0;
  let updated = 0;

  for (const vendor of vendors) {
    const data = toPrismaCreate(vendor, portId);

    const existing = await prisma.demoPortVendor.findFirst({
      where: { id: vendor.id, portId },
      select: { id: true },
    });

    if (existing) {
      await prisma.demoPortVendor.update({
        where: { id_portId: { id: vendor.id, portId } },
        data: {
          ...data,
          id: undefined,
          portId: undefined,
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
  const portId = getPortId();
  await prisma.demoPortVendor.delete({
    where: { id_portId: { id, portId } },
  });
}

// Get vendor counts by sector (for current port)
export async function getVendorCountsBySector(): Promise<Record<string, number>> {
  const portId = getPortId();
  const results = await prisma.demoPortVendor.groupBy({
    by: ["sector"],
    where: { portId },
    _count: true,
  });

  return results.reduce(
    (acc: Record<string, number>, r: typeof results[number]) => {
      if (r.sector) acc[r.sector] = r._count;
      return acc;
    },
    {} as Record<string, number>
  );
}

// Get last sync time (for current port)
export async function getLastSyncTime(): Promise<Date | null> {
  const portId = getPortId();
  const result = await prisma.demoPortVendor.findFirst({
    where: { portId },
    orderBy: { lastSyncedAt: "desc" },
    select: { lastSyncedAt: true },
  });
  return result?.lastSyncedAt || null;
}