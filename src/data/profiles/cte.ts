/**
 * CTE (Center for Transportation and the Environment) Profile
 */

import type { PortProfile } from "../port-profile";

export const cteProfile: PortProfile = {
  name: "Center for Transportation and the Environment",
  location: {
    city: "Atlanta",
    state: "Georgia",
    stateCode: "GA",
    county: "Fulton County",
    region: "Southeast",
  },
  entityType: "Nonprofit research and deployment organization",
  classification: "501(c)(3) Clean Transportation Nonprofit",

  characteristics: {
    cargoTypes: [
      "Zero-Emission Bus Deployment",
      "Hydrogen Fuel Cell Integration",
      "Battery-Electric Vehicle Programs",
      "Clean Freight Corridor Development",
    ],
    employeeCount: 85,
    operatingBudget: 28_000_000,
  },

  priorities: [
    "Zero-emission transit bus deployment and technical assistance",
    "Hydrogen fuel cell vehicle commercialization",
    "Clean freight and goods movement",
    "Fleet electrification planning for transit agencies",
    "Workforce development for zero-emission vehicle technology",
    "Disadvantaged community transportation equity",
    "Advanced vehicle technology demonstration and evaluation",
    "Charging and fueling infrastructure planning",
  ],

  capabilities: [
    "Zero-emission bus deployment program management",
    "Hydrogen fuel cell vehicle integration and testing",
    "Fleet electrification transition planning",
    "Clean transportation technology evaluation",
    "Federal grant program management and compliance",
    "Transit agency technical assistance",
    "Clean corridor planning and implementation",
    "Workforce training curriculum development",
  ],

  needs: [
    "Hydrogen fueling infrastructure expansion",
    "Battery-electric bus charging network buildout",
    "Clean freight demonstration corridors",
    "Advanced vehicle testing facilities",
    "Fleet transition planning tools and analytics",
    "Workforce development program expansion",
    "Community engagement and equity analysis",
    "Technology performance data collection systems",
  ],

  certifications: [
    "FTA-recognized technical assistance provider",
    "DOE Clean Cities Coalition partner",
    "EPA SmartWay Transport Partner",
    "ISO 9001 Quality Management",
  ],

  environmentalGoals: [
    "Deploy 1,000+ zero-emission buses through partner agencies by 2030",
    "Establish 5 hydrogen fueling corridors in the Southeast by 2028",
    "Reduce partner fleet GHG emissions by 500,000 metric tons CO2e by 2030",
    "Support 50 transit agencies in fleet electrification planning",
    "Achieve 100% renewable energy at CTE facilities by 2027",
  ],

  communityImpact: [
    "Technical assistance to 80+ transit agencies across 20 states",
    "Zero-emission deployments serving 3M+ daily transit riders",
    "Workforce training programs graduating 500+ clean energy technicians annually",
    "Environmental justice focus — 70% of deployments serve disadvantaged communities",
    "Southeast hydrogen hub development creating 2,000+ regional jobs",
  ],
};
