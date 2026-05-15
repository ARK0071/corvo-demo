/**
 * Port Freeport Mock Profile
 */

import type { PortProfile } from "../port-profile";

export const freeportMockProfile: PortProfile = {
  name: "Port Freeport",
  location: {
    city: "Freeport",
    state: "Texas",
    stateCode: "TX",
    county: "Brazoria County",
    region: "Gulf Coast",
  },
  entityType: "Special district government",
  classification: "Public Port Authority",

  characteristics: {
    cargoTypes: ["Container", "Bulk", "Breakbulk", "Liquid Bulk", "Project Cargo"],
    annualTonnage: 30_000_000,
    employeeCount: 50,
    operatingBudget: 50_000_000,
  },

  priorities: [
    "Port infrastructure modernization",
    "Zero-emission equipment",
    "Intermodal connectivity",
    "Climate resilience",
    "Environmental sustainability",
    "Security enhancements",
    "Economic development",
    "Workforce development",
  ],

  capabilities: [
    "Deep-water port operations",
    "Container terminal operations",
    "Bulk cargo handling",
    "Liquid bulk facilities",
    "Intermodal rail connections",
    "Warehousing and logistics",
    "Heavy-lift cargo",
  ],

  needs: [
    "Port electrification infrastructure",
    "Berth deepening and expansion",
    "Gate automation technology",
    "Shore power systems",
    "Stormwater management",
    "Hurricane resilience improvements",
    "Security and surveillance upgrades",
    "Rail infrastructure improvements",
    "Zero-emission cargo handling equipment",
  ],

  certifications: [
    "Green Marine certified",
    "ISO 14001 Environmental Management",
    "OSHA safety standards",
  ],

  environmentalGoals: [
    "Reduce diesel emissions",
    "Transition to zero-emission equipment",
    "Improve air quality",
    "Coastal resilience",
    "Environmental justice",
  ],

  communityImpact: [
    "Job creation",
    "Economic development",
    "Environmental justice",
    "Air quality improvement",
  ],
};
