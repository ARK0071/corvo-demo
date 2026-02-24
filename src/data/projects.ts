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
