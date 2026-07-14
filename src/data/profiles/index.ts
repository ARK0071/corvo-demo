/**
 * Port Profile Registry
 *
 * All profiles are loaded from the database via ensureProfilesLoaded().
 * No static/hardcoded fallbacks — if DB is unavailable, profiles are empty.
 */

import type { PortProfile } from "../port-profile";

// Profiles loaded from DB at runtime
const dbProfiles: Record<string, PortProfile> = {};

// Whether DB profiles have been loaded
let dbLoaded = false;

/**
 * Load all profiles from the database into the in-memory registry.
 * Call this from API routes before using getProfile() to ensure
 * DB-persisted entities are available.
 */
export async function ensureProfilesLoaded(): Promise<void> {
  if (dbLoaded) return;
  if (typeof window !== "undefined") return;

  try {
    const { prisma } = await import("@/lib/db/client");
    const records = await prisma.portProfile.findMany({
      orderBy: { name: "asc" },
    });

    for (const p of records) {
      dbProfiles[p.slug] = {
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
        fundingDomains: (p.fundingDomains as Array<{ id: string; name: string }>) || undefined,
      };
    }

    dbLoaded = true;
  } catch (err) {
    console.error("[profiles] Failed to load profiles from database:", err);
  }
}

// Add a profile at runtime
export function registerProfile(id: string, profile: PortProfile): void {
  dbProfiles[id] = profile;
}

// Remove a profile
export function unregisterProfile(id: string): boolean {
  if (id in dbProfiles) {
    delete dbProfiles[id];
    return true;
  }
  return false;
}

// Get profile by ID
export function getProfile(profileId: string): PortProfile | undefined {
  return dbProfiles[profileId];
}

// Get all profile IDs
export function getAllProfileIds(): string[] {
  return Object.keys(dbProfiles);
}

// Get all profiles
export function getAllProfiles(): Array<{ id: string; profile: PortProfile }> {
  return getAllProfileIds().map((id) => ({
    id,
    profile: dbProfiles[id],
  }));
}

export const DEFAULT_PROFILE_ID = "freeport-mock";

// Get default profile (may be undefined if DB hasn't loaded)
export function getDefaultProfile(): PortProfile | undefined {
  return getProfile(DEFAULT_PROFILE_ID);
}
