import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
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
 * GET /api/profiles — Returns all port profiles from the database.
 * No static fallback — if DB is unavailable, returns an error.
 */
export async function GET() {
  try {
    const dbProfiles = await prisma.portProfile.findMany({
      orderBy: { name: "asc" },
    });

    const profiles = dbProfiles.map((p: DBPortProfile) => toProfile(p));
    return NextResponse.json({ profiles });
  } catch (err) {
    console.error("[/api/profiles] Database error:", err);
    return NextResponse.json(
      { error: "Failed to load profiles from database" },
      { status: 503 }
    );
  }
}
