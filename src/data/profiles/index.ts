/**
 * Port Profile Registry
 *
 * Central registry for all client port profiles.
 * To add a new client:
 * 1. Create a new file in this directory (e.g., port-of-seattle.ts)
 * 2. Define the profile following the PortProfile interface
 * 3. Import and register it in the AVAILABLE_PROFILES object below
 * 4. The profile will automatically appear in the UI selector
 */

import type { PortProfile } from "../port-profile";
import { portFreeportProfile } from "./port-freeport";
import { portOfLosAngelesProfile } from "./port-of-los-angeles";
import { lawaProfile } from "./lawa";
import { louisianaGatewayPortProfile } from "./louisiana-gateway-port";

// Registry of all available port profiles
export const AVAILABLE_PROFILES: Record<string, PortProfile> = {
  "port-freeport": portFreeportProfile,
  "louisiana-gateway-port": louisianaGatewayPortProfile,
  "port-of-los-angeles": portOfLosAngelesProfile,
  "lawa": lawaProfile,
  // Add new profiles here:
  // "port-of-seattle": portOfSeattleProfile,
  // "port-of-houston": portOfHoustonProfile,
};

// Get profile by ID
export function getProfile(profileId: string): PortProfile | undefined {
  return AVAILABLE_PROFILES[profileId];
}

// Get all profile IDs
export function getAllProfileIds(): string[] {
  return Object.keys(AVAILABLE_PROFILES);
}

// Get all profiles
export function getAllProfiles(): Array<{ id: string; profile: PortProfile }> {
  return Object.entries(AVAILABLE_PROFILES).map(([id, profile]) => ({
    id,
    profile,
  }));
}

// Default profile ID (can be changed based on deployment)
export const DEFAULT_PROFILE_ID = "port-freeport";

// Get default profile
export function getDefaultProfile(): PortProfile {
  return AVAILABLE_PROFILES[DEFAULT_PROFILE_ID];
}
