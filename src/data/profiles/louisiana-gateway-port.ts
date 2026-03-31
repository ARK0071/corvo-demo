/**
 * Louisiana Gateway Port (Plaquemines Port) — demo client profile
 */

import type { PortProfile } from "../port-profile";

export const louisianaGatewayPortProfile: PortProfile = {
  name: "Louisiana Gateway Port",
  location: {
    city: "Belle Chasse",
    state: "Louisiana",
    stateCode: "LA",
    county: "Plaquemines Parish",
    region: "Gulf Coast",
  },
  entityType: "Special district government",
  classification: "Public Port Authority",

  characteristics: {
    cargoTypes: ["Container", "Liquid Bulk", "Breakbulk", "LNG", "Intermodal"],
    annualTonnage: 50_000_000,
    employeeCount: 75,
    operatingBudget: 45_000_000,
  },

  priorities: [
    "Greenfield container terminal (LGCT) delivery",
    "Intermodal rail and highway connectivity",
    "LNG and energy export infrastructure",
    "Hurricane resilience and evacuation routes",
    "Saltwater intrusion and water supply resilience",
    "Land acquisition for port expansion",
    "Community and workforce development",
  ],

  capabilities: [
    "Deep-water Mississippi River access",
    "Multi-tenant industrial and terminal sites",
    "Ferry and marine highway services",
    "Partnerships with Class I and short-line rail",
    "Liquid bulk and LNG staging",
  ],

  needs: [
    "GIWW bridge and highway bypass projects",
    "Rail realignment and extension capital",
    "Ferry fleet modernization",
    "Water treatment for saltwater intrusion",
    "Emergency response and maritime support facilities",
    "Federal and state multimodal grants",
  ],

  certifications: [
    "MARAD Marine Highway designation (where applicable)",
    "FTA ferry program participation",
  ],

  environmentalGoals: [
    "Reduce congestion via rail and marine highway",
    "Support lower-carbon fuels and green methanol logistics",
    "Storm-resilient infrastructure",
    "Protect Mississippi River water quality",
  ],

  communityImpact: [
    "Evacuation and lifeline transportation",
    "Jobs from terminal and energy projects",
    "Parish infrastructure partnerships",
  ],
};
