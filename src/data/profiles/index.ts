/**
 * Port Profile Registry
 *
 * Central registry for all client port profiles.
 * Supports both static (built-in) and dynamic (runtime-added) profiles.
 */

import type { PortProfile } from "../port-profile";
import { portFreeportProfile } from "./port-freeport";
import { portOfLosAngelesProfile } from "./port-of-los-angeles";
import { lawaProfile } from "./lawa";
import { louisianaGatewayPortProfile } from "./louisiana-gateway-port";

// Static (built-in) profiles
const STATIC_PROFILES: Record<string, PortProfile> = {
  "port-freeport": portFreeportProfile,
  "louisiana-gateway-port": louisianaGatewayPortProfile,
  "port-of-los-angeles": portOfLosAngelesProfile,
  "lawa": lawaProfile,
};

// Dynamic profiles added at runtime via admin
const dynamicProfiles: Record<string, PortProfile> = {};

// Combined view of all profiles
export const AVAILABLE_PROFILES: Record<string, PortProfile> = new Proxy(
  {},
  {
    get(_target, prop: string) {
      return STATIC_PROFILES[prop] ?? dynamicProfiles[prop];
    },
    has(_target, prop: string) {
      return prop in STATIC_PROFILES || prop in dynamicProfiles;
    },
    ownKeys() {
      return [...Object.keys(STATIC_PROFILES), ...Object.keys(dynamicProfiles)];
    },
    getOwnPropertyDescriptor(_target, prop: string) {
      const value = STATIC_PROFILES[prop] ?? dynamicProfiles[prop];
      if (value) {
        return { configurable: true, enumerable: true, value };
      }
      return undefined;
    },
  }
);

// Add a profile at runtime
export function registerProfile(id: string, profile: PortProfile): void {
  dynamicProfiles[id] = profile;
}

// Remove a dynamic profile
export function unregisterProfile(id: string): boolean {
  if (id in STATIC_PROFILES) return false; // Cannot remove built-in profiles
  if (id in dynamicProfiles) {
    delete dynamicProfiles[id];
    return true;
  }
  return false;
}

// Check if a profile is built-in
export function isStaticProfile(id: string): boolean {
  return id in STATIC_PROFILES;
}

// Get profile by ID
export function getProfile(profileId: string): PortProfile | undefined {
  return STATIC_PROFILES[profileId] ?? dynamicProfiles[profileId];
}

// Get all profile IDs
export function getAllProfileIds(): string[] {
  return [...Object.keys(STATIC_PROFILES), ...Object.keys(dynamicProfiles)];
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
  return STATIC_PROFILES[DEFAULT_PROFILE_ID];
}
