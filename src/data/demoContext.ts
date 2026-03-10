/**
 * Demo Context Data for Smart Match v1
 * 
 * Hard-coded Port Freeport projects and spend data for grant matching.
 * Based on FREEPORT_SPEND.md and initialized projects.
 */

import { getAllProjects, type Project } from "./projects";

export interface DemoProject {
  id: string;
  name: string;
  description: string;
  focusAreas: string[];
  budget?: number;
  startDate?: string;
  endDate?: string;
  priority: "Low" | "Medium" | "High";
  status: string;
  location?: string;
}

export interface SpendCategory {
  category: string;
  spend: number;
}

export interface SpendVendor {
  vendor: string;
  spend: number;
}

export interface SpendSignals {
  topCategoriesL2: SpendCategory[];
  topVendors: SpendVendor[];
  capexOpexMix?: {
    capex: number;
    opex: number;
  };
}

export interface DateWindow {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export interface DemoContext {
  projects: DemoProject[];
  spendSignals: SpendSignals;
  dateWindow: DateWindow;
}

/**
 * Convert Project to DemoProject format
 */
function projectToDemoProject(project: Project): DemoProject {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    focusAreas: project.focusAreas,
    budget: project.budget,
    startDate: project.startDate || undefined,
    endDate: project.endDate || undefined,
    priority: project.priority === "critical" ? "High" : 
              project.priority === "high" ? "High" :
              project.priority === "medium" ? "Medium" : "Low",
    status: project.status,
    location: project.location,
  };
}

/**
 * Get demo context with current projects and spend data
 */
export function getDemoContext(): DemoContext {
  console.log("[Demo Context] Loading demo context...");
  
  // Get projects from initialized Port Freeport projects
  const allProjects = getAllProjects();
  const projects = allProjects.map(projectToDemoProject);
  console.log("[Demo Context] Loaded", projects.length, "projects from project store");

  // If no projects exist yet, use fallback projects from FREEPORT_SPEND.md
  const fallbackProjects: DemoProject[] = [
    {
      id: "fhcip",
      name: "Freeport Harbor Channel Improvement Project (FHCIP)",
      description: "Deepen Freeport Harbor Channel from 46ft to 51-56ft MLLW. Total project cost $295M with $130M Port share. On schedule for completion late 2025.",
      focusAreas: ["infrastructure", "navigation", "channel deepening"],
      budget: 130_000_000,
      startDate: "2018-01-01",
      endDate: "2025-12-31",
      priority: "High",
      status: "construction",
      location: "Freeport Harbor Channel",
    },
    {
      id: "velasco-expansion",
      name: "Velasco Container Terminal Expansion",
      description: "Full buildout of Velasco Container Terminal with 2,400 ft of berth and super post-Panamax cranes. Phased construction over 5 years.",
      focusAreas: ["infrastructure", "terminal expansion", "container handling"],
      budget: 132_600_000,
      startDate: new Date().getFullYear().toString() + "-01-01",
      endDate: (new Date().getFullYear() + 5).toString() + "-12-31",
      priority: "High",
      status: "construction",
      location: "Velasco Terminal",
    },
  ];

  const activeProjects = projects.length > 0 ? projects : fallbackProjects;

  // Spend signals based on FREEPORT_SPEND.md
  const spendSignals: SpendSignals = {
    topCategoriesL2: [
      { category: "Professional Services", spend: 3_151_985 },
      { category: "Materials & Supplies", spend: 4_251_767 },
      { category: "Workforce / Labor", spend: 5_812_948 },
      { category: "Facilities Maintenance", spend: 1_357_231 },
      { category: "Utilities", spend: 1_055_624 },
    ],
    topVendors: [
      { vendor: "Engineering Consultants", spend: 1_200_000 },
      { vendor: "Legal Services", spend: 800_000 },
      { vendor: "Construction Materials", spend: 2_500_000 },
      { vendor: "Equipment Suppliers", spend: 1_800_000 },
      { vendor: "Maintenance Contractors", spend: 1_000_000 },
    ],
    capexOpexMix: {
      capex: 33_932_557, // Capital project spend
      opex: 15_629_555,  // Operating expenses (non-depreciation)
    },
  };

  // Date window: current year to 5 years out
  const currentYear = new Date().getFullYear();
  const dateWindow: DateWindow = {
    startDate: `${currentYear}-01-01`,
    endDate: `${currentYear + 5}-12-31`,
  };

  const context = {
    projects: activeProjects,
    spendSignals,
    dateWindow,
  };

  console.log("[Demo Context] Context summary:", {
    projects: context.projects.length,
    spendCategories: context.spendSignals.topCategoriesL2.length,
    vendors: context.spendSignals.topVendors.length,
    dateWindow: context.dateWindow,
    totalSpend: context.spendSignals.topCategoriesL2.reduce((sum, cat) => sum + cat.spend, 0),
  });

  return context;
}
