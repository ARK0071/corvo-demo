/**
 * Burns Engineering Transit Authority Profile
 */

import type { PortProfile } from "../port-profile";

export const burnsEngineeringProfile: PortProfile = {
  name: "Burns Engineering",
  location: {
    city: "Tampa",
    state: "Florida",
    stateCode: "FL",
    county: "Hillsborough County",
    region: "Gulf Coast",
  },
  entityType: "Metropolitan transit authority",
  classification: "Public Transit Agency",

  characteristics: {
    cargoTypes: ["Fixed-Route Bus", "Bus Rapid Transit", "Paratransit", "Microtransit"],
    employeeCount: 320,
    operatingBudget: 85_000_000,
  },

  priorities: [
    "Zero-emission bus fleet transition",
    "Bus rapid transit expansion",
    "ADA accessibility improvements",
    "Transit-oriented development",
    "Rider safety and security",
    "Workforce development",
    "Service equity and coverage",
    "Maintenance facility modernization",
  ],

  capabilities: [
    "Fixed-route bus operations",
    "Paratransit and demand-response services",
    "Bus rapid transit corridors",
    "Transit planning and ridership analysis",
    "Fleet maintenance and management",
    "Real-time passenger information systems",
    "ADA-compliant transit services",
  ],

  needs: [
    "Zero-emission bus procurement",
    "Charging infrastructure deployment",
    "BRT corridor expansion",
    "Maintenance facility electrification",
    "ADA station accessibility upgrades",
    "Intelligent transportation systems",
    "Transit signal priority",
    "Passenger facility improvements",
    "Fleet management technology",
  ],

  certifications: [
    "FTA Triennial Review compliant",
    "NTD reporting compliant",
    "ADA Paratransit Certification",
    "ISO 14001 Environmental Management",
  ],

  environmentalGoals: [
    "Transition 100% of bus fleet to zero-emission by 2035",
    "Reduce fleet diesel consumption by 50% by 2028",
    "Install solar canopies at 15 major transit stops",
    "Achieve carbon-neutral operations by 2040",
    "Implement green infrastructure at all maintenance facilities",
  ],

  communityImpact: [
    "Transit access for 180,000 daily riders",
    "Environmental justice community service routes",
    "Workforce training partnerships with local colleges",
    "Low-income fare assistance program",
    "ADA accessibility beyond minimum requirements",
  ],
};
