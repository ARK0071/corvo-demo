/**
 * Port Profile Registry
 *
 * Central registry for all client port profiles.
 * Profiles are loaded from the database via ensureProfilesLoaded().
 * Static profiles are kept as fallbacks until DB is available.
 */

import type { PortProfile } from "../port-profile";
import { portFreeportProfile } from "./port-freeport";
import { portOfLosAngelesProfile } from "./port-of-los-angeles";
import { lawaProfile } from "./lawa";
import { louisianaGatewayPortProfile } from "./louisiana-gateway-port";
import { burnsEngineeringProfile } from "./burns-engineering";

// Static (built-in) profiles — used as fallback until DB is loaded
const STATIC_PROFILES: Record<string, PortProfile> = {
  "port-freeport": portFreeportProfile,
  "louisiana-gateway-port": louisianaGatewayPortProfile,
  "port-of-los-angeles": portOfLosAngelesProfile,
  "lawa": lawaProfile,
  "burns-engineering": burnsEngineeringProfile,
};

// Dynamic profiles added at runtime (from DB or admin)
const dynamicProfiles: Record<string, PortProfile> = {};

// Track which profile IDs came from DB (vs admin runtime)
const dbProfileIds = new Set<string>();

// Whether DB profiles have been loaded
let dbLoaded = false;

/**
 * Load all profiles from the database into the in-memory registry.
 * Call this from API routes before using getProfile() to ensure
 * DB-persisted entities (like admin-created ones) are available.
 */
export async function ensureProfilesLoaded(): Promise<void> {
  if (dbLoaded) return;
  // Only run on server side
  if (typeof window !== "undefined") return;

  try {
    // Dynamic import to avoid bundling prisma client-side
    const { prisma } = await import("@/lib/db/client");
    const dbRecords = await prisma.portProfile.findMany({
      orderBy: { name: "asc" },
    });

    for (const p of dbRecords) {
      const profile: PortProfile = {
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
      };
      dynamicProfiles[p.slug] = profile;
      dbProfileIds.add(p.slug);
    }

    dbLoaded = true;
  } catch {
    // DB unavailable — rely on static profiles
  }
}

// Add a profile at runtime
export function registerProfile(id: string, profile: PortProfile): void {
  dynamicProfiles[id] = profile;
}

// Remove a dynamic profile
export function unregisterProfile(id: string): boolean {
  if (id in STATIC_PROFILES && !dbProfileIds.has(id)) return false;
  if (id in dynamicProfiles) {
    delete dynamicProfiles[id];
    dbProfileIds.delete(id);
    return true;
  }
  return false;
}

// Check if a profile is built-in (exists in static data and NOT overridden by DB)
export function isStaticProfile(id: string): boolean {
  return id in STATIC_PROFILES && !dbProfileIds.has(id);
}

// Get profile by ID
export function getProfile(profileId: string): PortProfile | undefined {
  return dynamicProfiles[profileId] ?? STATIC_PROFILES[profileId];
}

// Get all profile IDs
export function getAllProfileIds(): string[] {
  const ids = new Set([...Object.keys(STATIC_PROFILES), ...Object.keys(dynamicProfiles)]);
  return Array.from(ids);
}

// Get all profiles
export function getAllProfiles(): Array<{ id: string; profile: PortProfile }> {
  return getAllProfileIds().map((id) => ({
    id,
    profile: getProfile(id)!,
  }));
}

// Default profile ID (can be changed based on deployment)
export const DEFAULT_PROFILE_ID = "port-freeport";

// Get default profile
export function getDefaultProfile(): PortProfile {
  return getProfile(DEFAULT_PROFILE_ID) ?? STATIC_PROFILES[DEFAULT_PROFILE_ID];
}
