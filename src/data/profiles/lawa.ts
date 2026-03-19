/**
 * LAWA — Los Angeles World Airports Profile
 * Temporary profile for airport customer demo
 */

import type { PortProfile } from "../port-profile";

export const lawaProfile: PortProfile = {
  name: "Los Angeles World Airports (LAWA)",
  location: {
    city: "Los Angeles",
    state: "California",
    stateCode: "CA",
    county: "Los Angeles County",
    region: "Pacific Southwest",
  },
  entityType: "City department",
  classification: "Public Airport Authority",

  characteristics: {
    cargoTypes: ["Air Cargo", "Passenger Aviation", "General Aviation"],
    annualTonnage: 2_900_000, // ~2.9M metric tons of air cargo annually
    employeeCount: 3_500,
    operatingBudget: 1_800_000_000,
  },

  priorities: [
    "Terminal modernization and expansion",
    "Sustainable aviation and zero-emission ground transport",
    "Automated people mover and landside access",
    "Airfield safety and resilience improvements",
    "Noise mitigation and community programs",
    "Cybersecurity and digital infrastructure",
    "Workforce development and local hire",
    "Accessibility and ADA compliance upgrades",
  ],

  capabilities: [
    "LAX — one of the world's busiest airports (87M+ annual passengers)",
    "Van Nuys Airport (VNY) — busiest general aviation airport in the world",
    "Major international air cargo hub",
    "Automated People Mover (APM) transit system",
    "Consolidated Rent-A-Car (ConRAC) facility",
    "Metro rail connectivity (LAX/Metro Transit Center)",
    "Advanced airfield operations and safety systems",
  ],

  needs: [
    "Zero-emission ground support equipment",
    "Electric vehicle charging infrastructure (landside and airside)",
    "Sustainable aviation fuel (SAF) infrastructure",
    "Terminal energy efficiency and electrification",
    "Climate resilience and stormwater management",
    "Advanced security and screening technology",
    "Noise monitoring and mitigation systems",
    "Runway and taxiway rehabilitation",
  ],

  certifications: [
    "FAA Part 139 Certified Airport",
    "TSA-regulated Airport Security Program",
    "ISO 14001 Environmental Management",
    "LEED-certified terminal facilities",
    "ACI Airport Carbon Accreditation",
  ],

  environmentalGoals: [
    "Carbon neutral airport operations by 2030",
    "100% zero-emission ground support equipment by 2035",
    "Sustainable aviation fuel adoption and infrastructure",
    "Stormwater capture and reuse across all facilities",
    "Urban heat island reduction through cool surfaces and green infrastructure",
  ],

  communityImpact: [
    "Noise mitigation and soundproofing programs for surrounding communities",
    "Local hire and workforce development initiatives",
    "Small and disadvantaged business enterprise programs",
    "Community benefits agreements with Inglewood, El Segundo, and Westchester",
    "Air quality monitoring and improvement in neighboring areas",
  ],
};
