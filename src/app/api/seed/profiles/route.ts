import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { burnsEngineeringProfile } from "@/data/profiles/burns-engineering";
import type { PortProfile } from "@/data/port-profile";

const PROFILES_TO_SEED: Array<{ slug: string; profile: PortProfile }> = [
  { slug: "burns-engineering", profile: burnsEngineeringProfile },
];

export async function POST() {
  const log: string[] = [];
  try {
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
      log.push(`✓ ${slug} — ${profile.name}`);
    }
    return NextResponse.json({ ok: true, log });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message, log }, { status: 500 });
  }
}
