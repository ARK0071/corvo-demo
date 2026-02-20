/**
 * Port of Los Angeles Profile
 * Example profile showing how to add a new client
 */

import type { PortProfile } from "../port-profile";

export const portOfLosAngelesProfile: PortProfile = {
  name: "Port of Los Angeles",
  location: {
    city: "Los Angeles",
    state: "California",
    stateCode: "CA",
    county: "Los Angeles County",
    region: "Pacific Southwest",
  },
  entityType: "City government",
  classification: "Public Port Authority",

  characteristics: {
    cargoTypes: ["Container", "Breakbulk", "Liquid Bulk", "Dry Bulk"],
    annualTonnage: 180_000_000, // One of the busiest ports in the U.S.
    employeeCount: 850,
    operatingBudget: 500_000_000,
  },

  priorities: [
    "Zero-emission cargo handling",
    "Shore power expansion",
    "Air quality improvement",
    "Automated container terminals",
    "Green shipping corridors",
    "Community health initiatives",
    "Supply chain resilience",
    "Digital transformation",
  ],

  capabilities: [
    "World's largest container port complex",
    "Advanced container terminal automation",
    "Ro/Ro operations",
    "Cruise ship facilities",
    "On-dock rail infrastructure",
    "Cold chain logistics",
    "Liquid bulk terminals",
  ],

  needs: [
    "Zero-emission cargo handling equipment",
    "Electric truck charging infrastructure",
    "Hydrogen fueling stations",
    "Shore power expansion at all berths",
    "Terminal automation systems",
    "Air quality monitoring technology",
    "Grid infrastructure upgrades",
    "Rail capacity improvements",
  ],

  certifications: [
    "Green Marine certified",
    "ISO 14001 Environmental Management",
    "ISO 9001 Quality Management",
    "Green Flag certified terminals",
    "OSHA VPP Star certification",
  ],

  environmentalGoals: [
    "Zero-emission operations by 2030",
    "Air quality improvement in disadvantaged communities",
    "Clean truck programs",
    "Shore power for all vessel calls",
    "Wildlife habitat restoration",
  ],

  communityImpact: [
    "Environmental justice",
    "Air quality improvement",
    "Job creation and training",
    "STEM education programs",
    "Community health initiatives",
  ],
};
