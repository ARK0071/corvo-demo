/**
 * Polestar Defense — Active R&D Programs and Contract Projects
 *
 * Five active defense programs spanning SBIR, ONR BAA, AFWERX OTA, and DARPA.
 * projectType values are adapted for defense context:
 *   "r_and_d"        → basic/applied research contract
 *   "prototype"      → OTA prototype agreement or SBIR Phase II
 *   "production"     → fielding / low-rate initial production
 *   "infrastructure" → facility / equipment capital projects
 */

import type { Project } from "./projects";

export const polestarDefenseProjects: Project[] = [
  // ─── TRITON AUV ───────────────────────────────────────────────────────────
  {
    id: "psd-triton-auv",
    name: "TRITON Autonomous Underwater Vehicle — Mine Countermeasures",
    description:
      "Development and prototype delivery of the TRITON AUV system for Navy mine countermeasures (MCM). TRITON is a man-portable, propeller-driven UUV with integrated sonar, AI-based mine classification, and encrypted data link. The Navy SBIR Phase II contract covers two prototype deliveries, at-sea testing at NSWC Panama City, and a Phase III transition plan for program of record entry. Polestar is the prime contractor; NIWC Pacific provides government-side technical oversight.",
    projectType: "prototype",
    status: "construction", // "construction" = development/build phase
    priority: "critical",
    budget: 1_875_000,
    location: "Bremerton, WA + NSWC Panama City, FL (testing)",
    startDate: "2022-09-01",
    endDate: "2025-08-31",
    focusAreas: [
      "Autonomous underwater vehicle",
      "Mine countermeasures",
      "Acoustic sensing",
      "AI mine classification",
      "Navy SBIR",
      "Program of record transition",
    ],
    notes:
      "Phase II option exercised Dec 2023. At-sea test event scheduled Q3 FY2025 at NSWC Panama City. Phase III LOI from PMS 408 (LCS Mission Modules) under negotiation. Competing against Hydroid (Kongsberg) and Riptide Autonomous Solutions.",
    readiness: {
      nepaStatus: "categorical_exclusion",
      designCompletion: 92,
      designPhase: "final",
      permits: [
        { name: "NSWC Panama City Range Access Agreement", status: "obtained", date: "2024-11-01" },
        { name: "DoD Frequency Allocation (acoustic)", status: "obtained", date: "2023-06-15" },
      ],
      rightOfWay: "not_needed",
      procurementApproach: "SBIR Phase II sole-source (FAR 6.302-5)",
      constructionStartTarget: "2022-09-01",
      shovelReady: true,
    },
    pastPerformance: {
      priorFederalAwards: [
        { program: "Navy SBIR Phase I — TRITON AUV", amount: 275_000, year: 2021, status: "completed_on_time" },
      ],
      auditFindings: "none",
      onTimeCompletion: 100,
    },
    metrics: {
      jobsCreated: 12,
      jobsRetained: 28,
      emissionsReduction: "Electric AUV replaces diesel-powered manned MCM vessel operations (est. 180 tons CO2e/yr reduction)",
      safetyImpact: "Removes sailors from minefield proximity; aligns with Navy zero-casualty MCM doctrine",
      economicImpact: "Phase III production contract valued at $85M–$120M over 5 years (projected)",
      communitiesBenefited: "Kitsap County defense manufacturing base; Puget Sound small business subcontractor ecosystem",
    },
    fundingSource: "Navy SBIR Phase II — NAVSEA PMS 408",
    costShareSource: "N/A (100% government funded, SBIR)",
  },

  // ─── NAVIGATOR ────────────────────────────────────────────────────────────
  {
    id: "psd-navigator-mda",
    name: "NAVIGATOR Maritime Domain Awareness Platform",
    description:
      "Applied research and prototype development of NAVIGATOR, an AI/ML sensor fusion platform for maritime domain awareness (MDA). NAVIGATOR ingests AIS, radar, EO/IR, acoustic, and SIGINT feeds, fusing them through a transformer-based anomaly detection model to classify vessel behavior (spoofing, loitering, rendezvous) in near-real time. Office of Naval Research (ONR) BAA N00014-22-S-B001. Polestar leads; University of Washington Applied Physics Lab (APL-UW) is a cost-sharing research partner.",
    projectType: "r_and_d",
    status: "construction",
    priority: "high",
    budget: 7_400_000,
    location: "Bremerton, WA + APL-UW Seattle, WA",
    startDate: "2023-03-01",
    endDate: "2026-02-28",
    focusAreas: [
      "Maritime domain awareness",
      "AI/ML sensor fusion",
      "Anomaly detection",
      "Naval C4ISR",
      "ONR research",
      "Multi-INT integration",
    ],
    notes:
      "Preliminary design review (PDR) passed Oct 2024. APL-UW delivering transformer model baseline. Navy Program Manager (OPNAV N2/N6) observing for potential JMDO integration. Annual program review with ONR in March 2025.",
    readiness: {
      nepaStatus: "categorical_exclusion",
      designCompletion: 55,
      designPhase: "preliminary",
      permits: [
        { name: "ONR Classified Data Agreement", status: "obtained", date: "2023-01-15" },
        { name: "APL-UW Research Collaboration Agreement", status: "obtained", date: "2023-02-01" },
      ],
      rightOfWay: "not_needed",
      procurementApproach: "ONR BAA competitive award (FAR Part 35)",
      constructionStartTarget: "2023-03-01",
      shovelReady: true,
    },
    pastPerformance: {
      priorFederalAwards: [
        { program: "ONR BAA N00014-20 — Undersea Sensor Fusion Pilot", amount: 1_200_000, year: 2020, status: "completed_on_time" },
      ],
      auditFindings: "none",
      onTimeCompletion: 100,
    },
    metrics: {
      jobsCreated: 18,
      jobsRetained: 35,
      economicImpact: "Platform addresses $2.4B/yr illicit maritime trade and illegal fishing enforcement market",
      communitiesBenefited: "Kitsap County; UW research community; Pacific Fleet maritime patrol squadrons",
    },
    fundingSource: "ONR BAA — Office of Naval Research",
    costShareSource: "APL-UW in-kind research contribution (~$740K value)",
  },

  // ─── SHADOWHAWK ───────────────────────────────────────────────────────────
  {
    id: "psd-shadowhawk-ew",
    name: "SHADOWHAWK Miniaturized Airborne Electronic Attack Pod",
    description:
      "AFWERX OTA prototype agreement to develop SHADOWHAWK, a next-generation miniaturized electronic attack (EA) pod designed for carriage on F-16, F/A-18, and MQ-9 platforms. SHADOWHAWK reduces form factor by 60% vs. legacy ALQ-series pods while adding software-defined waveform agility and AI-driven threat response. Polestar is prime integrator; Raytheon Intelligence & Space provides the transmitter subsystem as a major subcontractor (25% of value). Industry cost-share: 25%.",
    projectType: "prototype",
    status: "design",
    priority: "critical",
    budget: 11_200_000,
    location: "Bremerton, WA (prime) + McKinney, TX (Raytheon sub)",
    startDate: "2024-01-15",
    endDate: "2027-01-14",
    focusAreas: [
      "Electronic warfare",
      "Electronic attack",
      "Airborne EW",
      "Software-defined EW",
      "AFWERX OTA",
      "Multi-platform integration",
    ],
    notes:
      "OTA agreement W911QX-24-9-0012 executed Jan 2024. System requirements review (SRR) completed April 2024. PDR scheduled Q2 FY2025. Air Force Life Cycle Management Center (AFLCMC/EW) is the requiring activity. Raytheon subcontract executed Sept 2024.",
    readiness: {
      nepaStatus: "categorical_exclusion",
      designCompletion: 35,
      designPhase: "preliminary",
      permits: [
        { name: "EMS Frequency Coordination — AFRC Range", status: "pending" },
        { name: "Raytheon Subcontract Agreement", status: "obtained", date: "2024-09-01" },
        { name: "AFWERX Consortium Agreement", status: "obtained", date: "2023-11-15" },
      ],
      rightOfWay: "not_needed",
      procurementApproach: "OTA Prototype Agreement (10 U.S.C. § 4022)",
      constructionStartTarget: "2025-06-01",
      shovelReady: false,
    },
    pastPerformance: {
      priorFederalAwards: [
        { program: "Air Force SBIR Phase II — Wideband EA Waveform", amount: 1_650_000, year: 2021, status: "completed_on_time" },
        { program: "AFWERX STRATFI — SDR EW Prototype", amount: 3_200_000, year: 2022, status: "active" },
      ],
      auditFindings: "none",
      onTimeCompletion: 100,
    },
    metrics: {
      jobsCreated: 32,
      jobsRetained: 58,
      emissionsReduction: "Lighter pod reduces fuel burn ~0.4% per sortie vs. legacy ALQ-99 (est. 2,200 sorties/yr)",
      economicImpact: "Potential $400M+ LRIP production contract; 200+ jobs in Bremerton over 7-year production run",
      communitiesBenefited: "Kitsap County defense manufacturing; McKinney, TX Raytheon workforce",
    },
    fundingSource: "AFWERX OTA (75%) + Polestar Defense corporate cost-share (25%)",
    costShareSource: "Polestar Defense IR&D and corporate investment ($2.8M committed)",
  },

  // ─── CIPHER-TAC ───────────────────────────────────────────────────────────
  {
    id: "psd-cipher-tac",
    name: "CIPHER-TAC Tactical Communications Encryption System",
    description:
      "Army SBIR Phase II development of CIPHER-TAC, a Type 1-certifiable tactical encryption module for denied, degraded, intermittent, and limited (DDIL) communications environments. CIPHER-TAC uses a hardware security module (HSM) with NSA-certified Type 1 cryptographic algorithms, integrates with Harris AN/PRC-163 and L3Harris MUOS radios, and adds AI-driven link adaptation for low-probability-of-intercept (LPI) operations. Contract is in closeout phase — all deliverables submitted to Army PM WIN-T.",
    projectType: "prototype",
    status: "completed",
    priority: "medium",
    budget: 1_750_000,
    location: "Bremerton, WA",
    startDate: "2022-05-01",
    endDate: "2025-04-30",
    focusAreas: [
      "Tactical communications",
      "Cryptography",
      "Type 1 encryption",
      "DDIL environments",
      "Army SBIR",
      "Electronic protection",
    ],
    notes:
      "All technical deliverables accepted by Army PM WIN-T (Dec 2024). Final report and invention disclosure submitted Jan 2025. Awaiting final invoice approval and closeout documentation. Phase III opportunity under evaluation by PEO C3T.",
    readiness: {
      nepaStatus: "categorical_exclusion",
      designCompletion: 100,
      designPhase: "complete",
      permits: [
        { name: "NSA Type 1 Certification Submission", status: "obtained", date: "2024-08-15" },
        { name: "Army PM WIN-T Technical Acceptance", status: "obtained", date: "2024-12-10" },
      ],
      rightOfWay: "not_needed",
      procurementApproach: "SBIR Phase II sole-source",
      constructionStartTarget: "2022-05-01",
      shovelReady: true,
    },
    pastPerformance: {
      priorFederalAwards: [
        { program: "Army SBIR Phase I — Tactical Encryption Module", amount: 250_000, year: 2021, status: "completed_on_time" },
        { program: "Army SBIR Phase II — CIPHER-TAC", amount: 1_750_000, year: 2022, status: "completed_on_time" },
      ],
      auditFindings: "none",
      onTimeCompletion: 100,
    },
    metrics: {
      jobsCreated: 8,
      jobsRetained: 15,
      safetyImpact: "Enables secure comms in EW-contested environments; reduces friendly force intercept risk",
      economicImpact: "Phase III Army sole-source production contract estimated $22M over 3 years",
    },
    fundingSource: "Army SBIR Phase II — DEVCOM C5ISR Center",
    costShareSource: "N/A (100% government funded, SBIR)",
  },

  // ─── AURORA USV ───────────────────────────────────────────────────────────
  {
    id: "psd-aurora-usv",
    name: "AURORA Autonomous Surface Vessel — Persistent Maritime Surveillance",
    description:
      "DARPA Tactical Technology Office (TTO) contract for AURORA, an extra-large autonomous surface vessel (XLAUSV) designed for 90-day persistent maritime surveillance in contested littoral environments. AURORA integrates multi-modal sensing (radar, EO/IR, ESM), onboard AI for rules-of-engagement-compliant engagement decisions, and a distributed autonomous teaming architecture for coordination with other AURORA vessels and UUVs. Polestar leads; Pacific Maritime Sciences (subcontractor) provides hull design and marine engineering.",
    projectType: "prototype",
    status: "design",
    priority: "high",
    budget: 4_800_000,
    location: "Bremerton, WA (design + integration) + Puget Sound (sea trials)",
    startDate: "2023-08-01",
    endDate: "2026-07-31",
    focusAreas: [
      "Autonomous surface vessel",
      "Persistent surveillance",
      "Maritime domain awareness",
      "Autonomous teaming",
      "DARPA research",
      "Unmanned maritime systems",
    ],
    notes:
      "DARPA TTO contract HR001123C0156. Concept design complete. Detailed design underway — hull form selection finalized Q4 2024. DARPA PM review Q1 FY2025. Sea trials planned Puget Sound Q3 FY2026. Competing concept: Leidos Sea Hunter follow-on.",
    readiness: {
      nepaStatus: "categorical_exclusion",
      designCompletion: 25,
      designPhase: "preliminary",
      permits: [
        { name: "DARPA Classification Guidance Agreement", status: "obtained", date: "2023-07-15" },
        { name: "Puget Sound Sea Trial Range Agreement", status: "pending" },
        { name: "Pacific Maritime Sciences Subcontract", status: "obtained", date: "2023-10-01" },
      ],
      rightOfWay: "not_needed",
      procurementApproach: "DARPA TTO Research Contract (SBIR Phase III equivalent)",
      constructionStartTarget: "2025-09-01",
      shovelReady: false,
    },
    pastPerformance: {
      priorFederalAwards: [
        { program: "ONR — Unmanned Surface Vessel Autonomy Stack", amount: 890_000, year: 2021, status: "completed_on_time" },
        { program: "Navy SBIR Phase I — Autonomous Teaming Algorithms", amount: 275_000, year: 2022, status: "completed_on_time" },
      ],
      auditFindings: "none",
      onTimeCompletion: 100,
    },
    metrics: {
      jobsCreated: 22,
      jobsRetained: 40,
      safetyImpact: "Removes sailors from high-risk littoral surveillance missions",
      economicImpact: "DARPA → Navy transition pathway; MUSV program of record estimated $1.2B over 10 years",
      communitiesBenefited: "Kitsap County shipbuilding workforce; Puget Sound Naval Shipyard ecosystem",
    },
    fundingSource: "DARPA TTO Research Contract",
    costShareSource: "Polestar Defense IR&D contribution (~$480K value; 10% of contract)",
  },
];
