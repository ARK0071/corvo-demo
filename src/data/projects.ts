/**
 * Project State Management
 *
 * Tracks port authority projects that can be matched with grants.
 */

export type ProjectStatus = "planning" | "design" | "procurement" | "construction" | "completed" | "on_hold";
export type ProjectPriority = "critical" | "high" | "medium" | "low";
export type ProjectType = 
  | "infrastructure"
  | "equipment"
  | "environmental"
  | "security"
  | "technology"
  | "maintenance"
  | "expansion"
  | "resilience"
  | "other";

export interface Project {
  id: string;                    // Unique project ID
  name: string;                  // Project name
  description: string;           // Detailed description
  focusAreas: string[];          // Focus areas/categories (e.g., "zero-emission", "infrastructure")
  budget: number;                // Total project budget in dollars
  startDate: string | null;      // ISO date string (optional)
  endDate: string | null;        // ISO date string (optional)
  location: string;               // Project location/area
  projectType: ProjectType;       // Type of project
  status: ProjectStatus;          // Current project status
  priority: ProjectPriority;      // Project priority
  createdAt: string;             // ISO timestamp when created
  updatedAt: string;             // ISO timestamp when last updated
  notes?: string;                // Additional notes
}

// Mutable in-memory project storage (same pattern as grant-pipeline.ts)
const projects: Project[] = [];

/**
 * Get all projects
 */
export function getAllProjects(): Project[] {
  return projects;
}

/**
 * Get a single project by ID
 */
export function getProjectById(id: string): Project | undefined {
  return projects.find((p) => p.id === id);
}

/**
 * Create a new project
 */
export function createProject(
  project: Omit<Project, "id" | "createdAt" | "updatedAt">
): Project {
  const now = new Date().toISOString();
  const newProject: Project = {
    ...project,
    id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: now,
    updatedAt: now,
  };

  projects.push(newProject);
  return newProject;
}

/**
 * Update an existing project
 */
export function updateProject(id: string, updates: Partial<Omit<Project, "id" | "createdAt">>): Project | null {
  const project = projects.find((p) => p.id === id);
  if (!project) return null;

  Object.assign(project, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });

  return project;
}

/**
 * Delete a project
 */
export function deleteProject(id: string): boolean {
  const index = projects.findIndex((p) => p.id === id);
  if (index === -1) return false;

  projects.splice(index, 1);
  return true;
}

/**
 * Get projects by status
 */
export function getProjectsByStatus(status: ProjectStatus): Project[] {
  return projects.filter((p) => p.status === status);
}

/**
 * Get projects by priority
 */
export function getProjectsByPriority(priority: ProjectPriority): Project[] {
  return projects.filter((p) => p.priority === priority);
}

/**
 * Get projects by type
 */
export function getProjectsByType(type: ProjectType): Project[] {
  return projects.filter((p) => p.projectType === type);
}

/**
 * Clear all projects (useful for testing)
 */
export function clearProjects(): void {
  projects.length = 0;
}

/**
 * Get project statistics
 */
export function getProjectStats() {
  return {
    total: projects.length,
    byStatus: {
      planning: getProjectsByStatus("planning").length,
      design: getProjectsByStatus("design").length,
      procurement: getProjectsByStatus("procurement").length,
      construction: getProjectsByStatus("construction").length,
      completed: getProjectsByStatus("completed").length,
      on_hold: getProjectsByStatus("on_hold").length,
    },
    byPriority: {
      critical: getProjectsByPriority("critical").length,
      high: getProjectsByPriority("high").length,
      medium: getProjectsByPriority("medium").length,
      low: getProjectsByPriority("low").length,
    },
    totalBudget: projects.reduce((sum, p) => sum + p.budget, 0),
  };
}

/**
 * Initialize Port Freeport default projects from FREEPORT_SPEND.md
 * Only adds projects if the projects array is empty (first time initialization)
 */
export function initializePortFreeportProjects(): void {
  // Only initialize if no projects exist
  if (projects.length > 0) {
    return;
  }

  const now = new Date().toISOString();
  const currentYear = new Date().getFullYear();

  const defaultProjects: Omit<Project, "id" | "createdAt" | "updatedAt">[] = [
    {
      name: "Freeport Harbor Channel Improvement Project (FHCIP)",
      description: "Deepen Freeport Harbor Channel from 46ft to 51-56ft MLLW. Total project cost $295M with $130M Port share. On schedule for completion late 2025.",
      focusAreas: ["infrastructure", "navigation", "channel deepening"],
      budget: 130_000_000, // Port share
      startDate: "2018-01-01",
      endDate: "2025-12-31",
      location: "Freeport Harbor Channel",
      projectType: "infrastructure",
      status: "construction",
      priority: "critical",
      notes: "$207.7M federal funding + $130M GO bonds (voter approved 2018)",
    },
    {
      name: "Velasco Container Terminal Expansion",
      description: "Full buildout of Velasco Container Terminal with 2,400 ft of berth and super post-Panamax cranes. Phased construction over 5 years.",
      focusAreas: ["infrastructure", "terminal expansion", "container handling"],
      budget: 132_600_000,
      startDate: `${currentYear}-01-01`,
      endDate: `${currentYear + 5}-12-31`,
      location: "Velasco Terminal",
      projectType: "expansion",
      status: "construction",
      priority: "critical",
      notes: "Revenue bonds + grants + operating income. $13.6M authorized, $2.8M expended to date, $10.8M remaining commitment.",
    },
    {
      name: "Velasco Terminal Access & North Gate Entrance",
      description: "Construction of terminal access roads and North Gate entrance improvements. Combined project value $11.9M.",
      focusAreas: ["infrastructure", "access roads", "terminal access"],
      budget: 11_900_000,
      startDate: `${currentYear}-01-01`,
      endDate: `${currentYear + 1}-12-31`,
      location: "Velasco Terminal",
      projectType: "infrastructure",
      status: "construction",
      priority: "high",
      notes: "Construction started. Part of terminal expansion program.",
    },
    {
      name: "Two Super Post-Panamax STS Gantry Cranes",
      description: "Purchase and installation of two super post-Panamax ship-to-shore gantry cranes for Velasco Terminal. Delivery expected FY2025.",
      focusAreas: ["equipment", "container handling", "cranes"],
      budget: 35_000_000, // Estimated portion of $132.6M
      startDate: `${currentYear}-01-01`,
      endDate: `${currentYear + 1}-06-30`,
      location: "Velasco Terminal",
      projectType: "equipment",
      status: "procurement",
      priority: "critical",
      notes: "Ordered, delivery FY2025. Series 2024 revenue bonds. Included in Velasco Terminal Expansion budget.",
    },
    {
      name: "15-Acre Concrete Storage Area",
      description: "Construction of 15-acre concrete storage area for project cargo, automotive, and heavy equipment laydown.",
      focusAreas: ["infrastructure", "storage", "laydown area"],
      budget: 12_800_000, // Estimated portion of $25.6M combined
      startDate: `${currentYear + 1}-01-01`,
      endDate: `${currentYear + 1}-12-31`,
      location: "Port Freeport",
      projectType: "infrastructure",
      status: "planning",
      priority: "high",
      notes: "Scheduled to begin 2025. Part of $25.6M combined projects. Grants + operating income funding.",
    },
    {
      name: "Terminal Access Street Reconstruction",
      description: "Reconstruction of terminal access streets to support increased container and vehicle traffic.",
      focusAreas: ["infrastructure", "roads", "terminal access"],
      budget: 12_800_000, // Estimated portion of $25.6M combined
      startDate: `${currentYear + 1}-01-01`,
      endDate: `${currentYear + 1}-12-31`,
      location: "Terminal Access Area",
      projectType: "infrastructure",
      status: "planning",
      priority: "high",
      notes: "Scheduled to begin 2025. Part of $25.6M combined projects. Grants + operating income funding.",
    },
    {
      name: "Cathodic Protection Systems",
      description: "Installation of cathodic protection systems for port infrastructure corrosion prevention.",
      focusAreas: ["infrastructure", "maintenance", "corrosion protection"],
      budget: 4_660_000,
      startDate: `${currentYear}-01-01`,
      endDate: `${currentYear + 2}-12-31`,
      location: "Portwide",
      projectType: "maintenance",
      status: "construction",
      priority: "medium",
      notes: "$4.66M authorized, $241K expended to date, $4.4M remaining. Series 2024 revenue bonds.",
    },
    {
      name: "125-Acre Vehicle Import/Processing Facility",
      description: "125-acre vehicle import and processing facility completed by third-party developer. Developer-funded project.",
      focusAreas: ["infrastructure", "vehicle processing", "automotive"],
      budget: 0, // Developer-funded
      startDate: "2023-01-01",
      endDate: "2024-12-31",
      location: "Port Freeport",
      projectType: "expansion",
      status: "completed",
      priority: "medium",
      notes: "Developer-funded project. Completed. Supports 78% YoY growth in vehicle imports.",
    },
  ];

  // Create all default projects
  for (const project of defaultProjects) {
    createProject(project);
  }
}
