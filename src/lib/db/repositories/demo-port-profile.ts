import { prisma } from "../client";
import { getTenantConfig, getPortInfo } from "../tenant-config";

/**
 * Ensure a DemoPortProfile row exists for the current tenant (demo DB).
 * Used when a new portId has never been provisioned in demo_port_profiles.
 */
export async function ensureDemoPortProfile(): Promise<string> {
  const { portId, portSlug } = getTenantConfig();

  const bySlug = await prisma.demoPortProfile.findFirst({
    where: { portId, slug: portSlug },
  });
  if (bySlug) return bySlug.id;

  const anyForPort = await prisma.demoPortProfile.findFirst({
    where: { portId },
    orderBy: { createdAt: "asc" },
  });
  if (anyForPort) return anyForPort.id;

  const portMeta = getPortInfo(portId);
  const created = await prisma.demoPortProfile.create({
    data: {
      portId,
      slug: portSlug,
      name: portMeta.name,
      entityType: "Port Authority",
      classification: "Public Port Authority",
    },
  });
  return created.id;
}

/**
 * Resolve a client profile key (e.g. port-freeport), tenant slug, UUID, or legacy row to DemoPortProfile id.
 */
export async function resolveDemoPortProfileId(portProfileIdOrSlug: string): Promise<string> {
  const { portId, portSlug } = getTenantConfig();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (uuidRegex.test(portProfileIdOrSlug)) {
    const row = await prisma.demoPortProfile.findFirst({
      where: { id: portProfileIdOrSlug, portId },
    });
    if (!row) {
      throw new Error(`Demo port profile ${portProfileIdOrSlug} not found for portId ${portId}`);
    }
    return row.id;
  }

  const byClientProfileKey = await prisma.demoPortProfile.findFirst({
    where: { portId, slug: portProfileIdOrSlug },
  });
  if (byClientProfileKey) return byClientProfileKey.id;

  const byTenantSlug = await prisma.demoPortProfile.findFirst({
    where: { portId, slug: portSlug },
  });
  if (byTenantSlug) return byTenantSlug.id;

  const legacy = await prisma.demoPortProfile.findFirst({
    where: { portId },
    orderBy: { createdAt: "asc" },
  });
  if (legacy) return legacy.id;

  return ensureDemoPortProfile();
}
