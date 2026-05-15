/**
 * Polestar Defense, Inc. Profile
 *
 * Defense technology company specializing in autonomous maritime systems,
 * electronic warfare, and naval C4ISR. Based near Puget Sound Naval Shipyard.
 *
 * Note: This is a non-port-authority client. Fields are adapted:
 *   - cargoTypes → product/service lines
 *   - annualTonnage → unused
 *   - environmentalGoals / communityImpact → adapted to defense context
 */

import type { PortProfile } from "../port-profile";

export const polestarDefenseProfile: PortProfile = {
  name: "Polestar Defense",
  location: {
    city: "Bremerton",
    state: "Washington",
    stateCode: "WA",
    county: "Kitsap County",
    region: "Pacific Northwest",
  },
  entityType: "Private defense contractor",
  classification: "Defense Technology Company",

  characteristics: {
    // Repurposed: product/service lines instead of cargo types
    cargoTypes: [
      "Autonomous Maritime Systems (UUV/USV)",
      "Electronic Warfare Payloads",
      "Naval C4ISR Software",
      "AI/ML Threat Detection",
      "Tactical Communications",
    ],
    annualTonnage: undefined,
    employeeCount: 420,
    operatingBudget: 105_000_000,
  },

  priorities: [
    "Autonomous underwater vehicle (AUV) program of record transition",
    "Electronic warfare system miniaturization",
    "AI-enabled maritime domain awareness",
    "Grow DARPA and ONR direct research portfolio",
    "SBIR Phase II → III commercialization pipeline",
    "Secret facility expansion and SCIF capacity",
    "Export-controlled international partner development",
    "Production scaling for TRITON AUV fielding",
  ],

  capabilities: [
    "Autonomous vehicle guidance, navigation, and control (GNC)",
    "Underwater acoustic sensing and active/passive sonar signal processing",
    "Airborne and shipborne electronic attack (EA) payload design",
    "Command, control, communications, computers, and intelligence (C4I) systems",
    "AI/ML-based threat classification and sensor fusion",
    "Ruggedized embedded systems and real-time OS (RTOS) engineering",
    "RF, EW, and signals intelligence (SIGINT) hardware design",
    "Systems integration, test, and evaluation (SDTE) for undersea environments",
    "DCAA-compliant program management and cost accounting",
    "Software-defined radio (SDR) and waveform development",
  ],

  needs: [
    "SBIR/STTR Phase II follow-on bridge funding",
    "Navy program of record (POR) transition for TRITON AUV",
    "Production facility expansion (20,000 sq ft)",
    "Advanced manufacturing equipment for pressure hull fabrication",
    "Expanded cleared facility (SCIF) for TS/SCI program support",
    "Cleared engineering workforce pipeline",
    "OTA prototype agreements for next-gen EW development",
    "International cooperative research partners (Five Eyes)",
  ],

  certifications: [
    "DoD Facility Security Clearance (SECRET)",
    "ISO 9001:2015 Quality Management System",
    "CMMC Level 2 (Cybersecurity Maturity Model Certification)",
    "AS9100D Aerospace & Defense Quality Management",
    "ITAR Registered — U.S. Department of State, Directorate of Defense Trade Controls",
    "EAR Compliance — Bureau of Industry and Security registered",
    "DCAA-Approved Accounting System",
    "NIST SP 800-171 Compliant (CUI handling)",
  ],

  environmentalGoals: [
    "Reduce manufacturing facility energy consumption by 30% by 2028",
    "Eliminate hazardous materials (Pb, Cd) from production processes by 2027",
    "Sustainable supply chain: prioritize US-domestic material sourcing",
  ],

  communityImpact: [
    "Veteran hiring initiative — 28% of workforce are veterans or transitioning service members",
    "STEM partnership with Naval Station Bremerton and Kitsap County schools",
    "Cleared manufacturing apprenticeship program (12 apprentices/year)",
    "Local small business subcontractor development (DoD mentor-protégé program)",
    "Annual DoD SBIR workshop for Puget Sound defense tech startups",
  ],
};
