/**
 * Port Authority Profile
 *
 * Defines the characteristics of the port authority to enable
 * intelligent grant matching and eligibility scoring.
 */

export interface PortProfile {
  name: string;
  location: {
    city: string;
    state: string;
    stateCode: string;
    county: string;
    region: string; // e.g., "Gulf Coast", "Pacific Northwest"
  };
  entityType: string; // e.g., "Special district government", "State government"
  classification: string; // e.g., "Public Port Authority"

  // Port characteristics
  characteristics: {
    cargoTypes: string[]; // e.g., "Container", "Bulk", "Breakbulk"
    annualTonnage?: number;
    employeeCount?: number;
    operatingBudget?: number;
  };

  // Strategic priorities
  priorities: string[]; // e.g., "Zero-emission equipment", "Infrastructure modernization"

  // Current capabilities and needs
  capabilities: string[];
  needs: string[];

  // Certifications and designations
  certifications: string[];

  // Environmental and social factors
  environmentalGoals: string[];
  communityImpact: string[];
}

// Re-export profile registry
export { AVAILABLE_PROFILES, getProfile, getAllProfiles, getAllProfileIds, getDefaultProfile, DEFAULT_PROFILE_ID } from "./profiles";

// Export default profile (for backward compatibility)
export { getDefaultProfile as getCurrentProfile };

// Legacy export - use getDefaultProfile() instead
import { getDefaultProfile } from "./profiles";
export const currentPortProfile = getDefaultProfile();
