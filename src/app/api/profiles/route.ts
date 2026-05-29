import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { ensureProfilesLoaded, getAllProfiles } from "@/data/profiles";
import type { PortProfile } from "@/data/port-profile";

interface DBPortProfile {
  slug: string;
  name: string;
  entityType: string;
  classification: string | null;
  location: unknown;
  characteristics: unknown;
  priorities: unknown;
  capabilities: unknown;
  needs: unknown;
  certifications: unknown;
  environmentalGoals: unknown;
  communityImpact: unknown;
}

function toProfile(p: DBPortProfile): { id: string; profile: PortProfile } {
  return {
    id: p.slug,
    profile: {
      name: p.name,
      entityType: p.entityType,
      classification: p.classification || "",
      location: (p.location as PortProfile["location"]) || {
        city: "",
        state: "",
        stateCode: "",
        county: "",
        region: "",
      },
      characteristics: (p.characteristics as PortProfile["characteristics"]) || {
        cargoTypes: [],
      },
      priorities: (p.priorities as string[]) || [],
      capabilities: (p.capabilities as string[]) || [],
      needs: (p.needs as string[]) || [],
      certifications: (p.certifications as string[]) || [],
      environmentalGoals: (p.environmentalGoals as string[]) || [],
      communityImpact: (p.communityImpact as string[]) || [],
    },
  };
}

/**
 * GET /api/profiles — Returns all port profiles (static + DB-persisted).
 * Public endpoint used by the ProfileProvider on the client.
 */
export async function GET() {
  // Ensure server-side registry is hydrated from DB
  await ensureProfilesLoaded();

  try {
    const dbProfiles = await prisma.portProfile.findMany({
      orderBy: { name: "asc" },
    });

    const profiles = dbProfiles.map((p: DBPortProfile) => toProfile(p));
    return NextResponse.json({ profiles });
  } catch {
    // If DB is unavailable, fall back to server-side in-memory profiles
    const profiles = getAllProfiles();
    return NextResponse.json({ profiles });
  }
}
