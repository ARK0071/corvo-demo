import { NextResponse } from "next/server";
import { withRole } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db/client";
import { portFreeportProfile } from "@/data/profiles/port-freeport";
import { lawaProfile } from "@/data/profiles/lawa";
import { louisianaGatewayPortProfile } from "@/data/profiles/louisiana-gateway-port";
import { portOfLosAngelesProfile } from "@/data/profiles/port-of-los-angeles";
import type { PortProfile } from "@/data/port-profile";

const PROFILES_TO_SEED: Array<{ slug: string; profile: PortProfile }> = [
  { slug: "port-freeport", profile: portFreeportProfile },
  { slug: "lawa", profile: lawaProfile },
  { slug: "louisiana-gateway-port", profile: louisianaGatewayPortProfile },
  { slug: "port-of-los-angeles", profile: portOfLosAngelesProfile },
];

const PORT_ONLY_ENTRIES = [
  { slug: "polestar-defense", name: "Pole Star Defense", entityType: "Private company" },
  { slug: "freeport-demo", name: "Port Freeport DEMO", entityType: "Special district government" },
  { slug: "freeport-mock", name: "Port Freeport Mock", entityType: "Special district government" },
];

/**
 * POST /api/admin/seed-profiles — Seeds static profiles into the PortProfile DB table.
 * Admin-only. Safe to run multiple times (uses upsert).
 */
export const POST = withRole(["admin"], async () => {
  const results: string[] = [];

  for (const { slug, profile } of PROFILES_TO_SEED) {
    await prisma.portProfile.upsert({
      where: { slug },
      update: {
        name: profile.name,
        entityType: profile.entityType,
        classification: profile.classification,
        location: profile.location as object,
        characteristics: profile.characteristics as object,
        priorities: profile.priorities,
        capabilities: profile.capabilities,
        needs: profile.needs,
        certifications: profile.certifications,
        environmentalGoals: profile.environmentalGoals,
        communityImpact: profile.communityImpact,
      },
      create: {
        slug,
        name: profile.name,
        entityType: profile.entityType,
        classification: profile.classification,
        location: profile.location as object,
        characteristics: profile.characteristics as object,
        priorities: profile.priorities,
        capabilities: profile.capabilities,
        needs: profile.needs,
        certifications: profile.certifications,
        environmentalGoals: profile.environmentalGoals,
        communityImpact: profile.communityImpact,
      },
    });
    results.push(`${slug} — ${profile.name}`);
  }

  for (const entry of PORT_ONLY_ENTRIES) {
    await prisma.portProfile.upsert({
      where: { slug: entry.slug },
      update: { name: entry.name, entityType: entry.entityType },
      create: {
        slug: entry.slug,
        name: entry.name,
        entityType: entry.entityType,
        location: {},
        characteristics: {},
        priorities: [],
        capabilities: [],
        needs: [],
        certifications: [],
        environmentalGoals: [],
        communityImpact: [],
      },
    });
    results.push(`${entry.slug} — ${entry.name} (port-only)`);
  }

  return NextResponse.json({ seeded: results });
});
