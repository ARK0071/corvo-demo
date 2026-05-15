/**
 * Synthetic port profile for end-to-end testing with no seeded projects,
 * pipeline grants, or awards. Pair with tenant port "greenfield-demo" (Demo env).
 */

import type { PortProfile } from "../port-profile";

export const greenfieldDemoPortProfile: PortProfile = {
  name: "Greenfield Demo Port (blank slate)",
  location: {
    city: "Riverside Bay",
    state: "Washington",
    stateCode: "WA",
    county: "Demo County",
    region: "Pacific Northwest",
  },
  entityType: "Special district government",
  classification: "Public Port Authority",

  characteristics: {
    cargoTypes: ["Container", "Breakbulk"],
    annualTonnage: undefined,
    employeeCount: undefined,
    operatingBudget: undefined,
  },

  priorities: [
    "Infrastructure modernization",
    "Safety and environmental compliance",
    "Intermodal connectivity",
  ],

  capabilities: [
    "Marine terminal operations",
    "Cargo handling",
  ],

  needs: [
    "Grant-funded capital improvements",
    "Equipment modernization",
  ],

  certifications: [],

  environmentalGoals: [
    "Air quality",
    "Climate resilience",
  ],

  communityImpact: [
    "Regional economic development",
  ],
};
