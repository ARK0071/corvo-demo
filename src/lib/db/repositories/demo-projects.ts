import { prisma } from "../client";
import { DemoProject as PrismaProject, Prisma } from "@/generated/prisma";
import { getTenantConfig } from "../tenant-config";
import type { Project, ProjectReadiness, ProjectPastPerformance, ProjectMetrics } from "@/data/projects";

// Get current port ID from tenant config
function getPortId(): string {
  return getTenantConfig().portId;
}

// Convert Prisma model to application type
function toProject(project: PrismaProject): Project {
  // Build readiness object from flat fields
  const readiness: ProjectReadiness | undefined = project.nepaStatus ? {
    nepaStatus: project.nepaStatus as ProjectReadiness["nepaStatus"],
    nepaDocument: project.nepaDocument || undefined,
    nepaCompletionDate: project.nepaCompletionDate?.toISOString().split("T")[0],
    designCompletion: project.designCompletion,
    designPhase: project.designPhase as ProjectReadiness["designPhase"],
    permits: (project.permits as ProjectReadiness["permits"]) || [],
    rightOfWay: project.rightOfWay as ProjectReadiness["rightOfWay"],
    procurementApproach: project.procurementApproach || undefined,
    constructionStartTarget: project.constructionStartTarget?.toISOString().split("T")[0],
    shovelReady: project.shovelReady,
  } : undefined;

  // Build past performance object
  const pastPerformance: ProjectPastPerformance | undefined = project.priorFederalAwards &&
    (project.priorFederalAwards as any[]).length > 0 ? {
    priorFederalAwards: project.priorFederalAwards as ProjectPastPerformance["priorFederalAwards"],
    auditFindings: project.auditFindings as ProjectPastPerformance["auditFindings"],
    onTimeCompletion: project.onTimeCompletion || 0,
  } : undefined;

  // Build metrics object
  const metrics: ProjectMetrics | undefined = (
    project.jobsCreated || project.jobsRetained || project.tonnageImpact ||
    project.emissionsReduction || project.safetyImpact || project.economicImpact ||
    project.communitiesBenefited
  ) ? {
    jobsCreated: project.jobsCreated || undefined,
    jobsRetained: project.jobsRetained || undefined,
    tonnageImpact: project.tonnageImpact || undefined,
    emissionsReduction: project.emissionsReduction || undefined,
    safetyImpact: project.safetyImpact || undefined,
    economicImpact: project.economicImpact || undefined,
    communitiesBenefited: project.communitiesBenefited || undefined,
  } : undefined;

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    projectType: project.projectType,
    status: project.status as Project["status"],
    priority: project.priority as Project["priority"],
    budget: Number(project.budget),
    location: project.location || undefined,
    startDate: project.startDate?.toISOString().split("T")[0],
    endDate: project.endDate?.toISOString().split("T")[0],
    focusAreas: (project.focusAreas as string[]) || [],
    notes: project.notes || undefined,
    fundingSource: project.fundingSource || undefined,
    costShareSource: project.costShareSource || undefined,
    readiness,
    pastPerformance,
    metrics,
  };
}

// Convert application type to Prisma create input
function toPrismaCreate(
  project: Omit<Project, "id"> & { id?: string },
  portId: string,
  portProfileId: string
): Prisma.DemoProjectCreateInput {
  return {
    id: project.id || undefined,
    portId,
    portProfile: { connect: { id: portProfileId } },
    name: project.name,
    description: project.description || "",
    projectType: project.projectType,
    status: project.status || "planning",
    priority: project.priority || "medium",
    budget: project.budget || 0,
    location: project.location || null,
    startDate: project.startDate ? new Date(project.startDate) : null,
    endDate: project.endDate ? new Date(project.endDate) : null,
    focusAreas: project.focusAreas || [],
    notes: project.notes || null,
    fundingSource: project.fundingSource || null,
    costShareSource: project.costShareSource || null,
    // Readiness fields
    nepaStatus: project.readiness?.nepaStatus || "not_started",
    nepaDocument: project.readiness?.nepaDocument || null,
    nepaCompletionDate: project.readiness?.nepaCompletionDate ? new Date(project.readiness.nepaCompletionDate) : null,
    designCompletion: project.readiness?.designCompletion || 0,
    designPhase: project.readiness?.designPhase || "conceptual",
    permits: project.readiness?.permits || [],
    rightOfWay: project.readiness?.rightOfWay || "not_needed",
    procurementApproach: project.readiness?.procurementApproach || null,
    constructionStartTarget: project.readiness?.constructionStartTarget ? new Date(project.readiness.constructionStartTarget) : null,
    shovelReady: project.readiness?.shovelReady || false,
    // Past performance fields
    priorFederalAwards: project.pastPerformance?.priorFederalAwards || [],
    auditFindings: project.pastPerformance?.auditFindings || "none",
    onTimeCompletion: project.pastPerformance?.onTimeCompletion || null,
    // Metrics fields
    jobsCreated: project.metrics?.jobsCreated || null,
    jobsRetained: project.metrics?.jobsRetained || null,
    tonnageImpact: project.metrics?.tonnageImpact || null,
    emissionsReduction: project.metrics?.emissionsReduction || null,
    safetyImpact: project.metrics?.safetyImpact || null,
    economicImpact: project.metrics?.economicImpact || null,
    communitiesBenefited: project.metrics?.communitiesBenefited || null,
  };
}

// Get all projects for current port
export async function getAllProjects(): Promise<Project[]> {
  const portId = getPortId();
  const projects = await prisma.demoProject.findMany({
    where: { portId },
    orderBy: [{ priority: "asc" }, { name: "asc" }],
  });
  return projects.map(toProject);
}

// Get project by ID
export async function getProjectById(id: string): Promise<Project | undefined> {
  const portId = getPortId();
  const project = await prisma.demoProject.findFirst({
    where: { id, portId },
  });
  return project ? toProject(project) : undefined;
}

// Get projects by status
export async function getProjectsByStatus(status: Project["status"]): Promise<Project[]> {
  const portId = getPortId();
  const projects = await prisma.demoProject.findMany({
    where: { portId, status },
    orderBy: [{ priority: "asc" }, { name: "asc" }],
  });
  return projects.map(toProject);
}

// Get projects by priority
export async function getProjectsByPriority(priority: Project["priority"]): Promise<Project[]> {
  const portId = getPortId();
  const projects = await prisma.demoProject.findMany({
    where: { portId, priority },
    orderBy: { name: "asc" },
  });
  return projects.map(toProject);
}

// Search projects
export interface ProjectSearchParams {
  keyword?: string;
  status?: Project["status"][];
  priority?: Project["priority"][];
  projectType?: string;
  minBudget?: number;
  maxBudget?: number;
  shovelReady?: boolean;
  limit?: number;
  offset?: number;
}

export async function searchProjects(
  params: ProjectSearchParams
): Promise<{ projects: Project[]; total: number }> {
  const portId = getPortId();
  const where: Prisma.DemoProjectWhereInput = { portId };

  if (params.keyword) {
    where.OR = [
      { name: { contains: params.keyword, mode: "insensitive" } },
      { description: { contains: params.keyword, mode: "insensitive" } },
    ];
  }

  if (params.status && params.status.length > 0) {
    where.status = { in: params.status };
  }

  if (params.priority && params.priority.length > 0) {
    where.priority = { in: params.priority };
  }

  if (params.projectType) {
    where.projectType = { equals: params.projectType, mode: "insensitive" };
  }

  if (params.minBudget !== undefined) {
    where.budget = { gte: params.minBudget };
  }

  if (params.maxBudget !== undefined) {
    where.budget = { ...where.budget as any, lte: params.maxBudget };
  }

  if (params.shovelReady !== undefined) {
    where.shovelReady = params.shovelReady;
  }

  const [projects, total] = await Promise.all([
    prisma.demoProject.findMany({
      where,
      take: params.limit || 50,
      skip: params.offset || 0,
      orderBy: [{ priority: "asc" }, { name: "asc" }],
    }),
    prisma.demoProject.count({ where }),
  ]);

  return {
    projects: projects.map(toProject),
    total,
  };
}

// Create project
export async function createProject(
  data: Omit<Project, "id"> & { id?: string },
  portProfileId: string
): Promise<Project> {
  const portId = getPortId();
  const createData = toPrismaCreate(data, portId, portProfileId);
  const project = await prisma.demoProject.create({
    data: createData,
  });
  return toProject(project);
}

// Update project
export async function updateProject(
  id: string,
  data: Partial<Omit<Project, "id">>
): Promise<Project | null> {
  const portId = getPortId();

  const existing = await prisma.demoProject.findFirst({
    where: { id, portId },
  });

  if (!existing) return null;

  const updateData: Prisma.DemoProjectUpdateInput = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.projectType !== undefined) updateData.projectType = data.projectType;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.budget !== undefined) updateData.budget = data.budget;
  if (data.location !== undefined) updateData.location = data.location || null;
  if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null;
  if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
  if (data.focusAreas !== undefined) updateData.focusAreas = data.focusAreas;
  if (data.notes !== undefined) updateData.notes = data.notes || null;
  if (data.fundingSource !== undefined) updateData.fundingSource = data.fundingSource || null;
  if (data.costShareSource !== undefined) updateData.costShareSource = data.costShareSource || null;

  // Readiness fields
  if (data.readiness) {
    if (data.readiness.nepaStatus !== undefined) updateData.nepaStatus = data.readiness.nepaStatus;
    if (data.readiness.nepaDocument !== undefined) updateData.nepaDocument = data.readiness.nepaDocument || null;
    if (data.readiness.nepaCompletionDate !== undefined) {
      updateData.nepaCompletionDate = data.readiness.nepaCompletionDate ? new Date(data.readiness.nepaCompletionDate) : null;
    }
    if (data.readiness.designCompletion !== undefined) updateData.designCompletion = data.readiness.designCompletion;
    if (data.readiness.designPhase !== undefined) updateData.designPhase = data.readiness.designPhase;
    if (data.readiness.permits !== undefined) updateData.permits = data.readiness.permits;
    if (data.readiness.rightOfWay !== undefined) updateData.rightOfWay = data.readiness.rightOfWay;
    if (data.readiness.procurementApproach !== undefined) updateData.procurementApproach = data.readiness.procurementApproach || null;
    if (data.readiness.constructionStartTarget !== undefined) {
      updateData.constructionStartTarget = data.readiness.constructionStartTarget ? new Date(data.readiness.constructionStartTarget) : null;
    }
    if (data.readiness.shovelReady !== undefined) updateData.shovelReady = data.readiness.shovelReady;
  }

  // Past performance fields
  if (data.pastPerformance) {
    if (data.pastPerformance.priorFederalAwards !== undefined) updateData.priorFederalAwards = data.pastPerformance.priorFederalAwards;
    if (data.pastPerformance.auditFindings !== undefined) updateData.auditFindings = data.pastPerformance.auditFindings;
    if (data.pastPerformance.onTimeCompletion !== undefined) updateData.onTimeCompletion = data.pastPerformance.onTimeCompletion;
  }

  // Metrics fields
  if (data.metrics) {
    if (data.metrics.jobsCreated !== undefined) updateData.jobsCreated = data.metrics.jobsCreated || null;
    if (data.metrics.jobsRetained !== undefined) updateData.jobsRetained = data.metrics.jobsRetained || null;
    if (data.metrics.tonnageImpact !== undefined) updateData.tonnageImpact = data.metrics.tonnageImpact || null;
    if (data.metrics.emissionsReduction !== undefined) updateData.emissionsReduction = data.metrics.emissionsReduction || null;
    if (data.metrics.safetyImpact !== undefined) updateData.safetyImpact = data.metrics.safetyImpact || null;
    if (data.metrics.economicImpact !== undefined) updateData.economicImpact = data.metrics.economicImpact || null;
    if (data.metrics.communitiesBenefited !== undefined) updateData.communitiesBenefited = data.metrics.communitiesBenefited || null;
  }

  const project = await prisma.demoProject.update({
    where: { id },
    data: updateData,
  });

  return toProject(project);
}

// Delete project
export async function deleteProject(id: string): Promise<boolean> {
  const portId = getPortId();

  const existing = await prisma.demoProject.findFirst({
    where: { id, portId },
  });

  if (!existing) return false;

  await prisma.demoProject.delete({
    where: { id },
  });

  return true;
}

// Get project statistics
export async function getProjectStats(): Promise<{
  total: number;
  totalBudget: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  shovelReadyCount: number;
}> {
  const portId = getPortId();

  const [statusCounts, priorityCounts, totalBudget, shovelReadyCount] = await Promise.all([
    prisma.demoProject.groupBy({
      by: ["status"],
      where: { portId },
      _count: true,
    }),
    prisma.demoProject.groupBy({
      by: ["priority"],
      where: { portId },
      _count: true,
    }),
    prisma.demoProject.aggregate({
      where: { portId },
      _sum: { budget: true },
    }),
    prisma.demoProject.count({
      where: { portId, shovelReady: true },
    }),
  ]);

  const byStatus: Record<string, number> = {};
  let total = 0;
  for (const r of statusCounts) {
    byStatus[r.status] = r._count;
    total += r._count;
  }

  const byPriority: Record<string, number> = {};
  for (const r of priorityCounts) {
    byPriority[r.priority] = r._count;
  }

  return {
    total,
    totalBudget: Number(totalBudget._sum.budget || 0),
    byStatus,
    byPriority,
    shovelReadyCount,
  };
}

// Get shovel-ready projects
export async function getShovelReadyProjects(): Promise<Project[]> {
  const portId = getPortId();
  const projects = await prisma.demoProject.findMany({
    where: { portId, shovelReady: true },
    orderBy: [{ priority: "asc" }, { name: "asc" }],
  });
  return projects.map(toProject);
}

// Batch upsert projects (for initialization)
export async function upsertProjects(
  projects: (Omit<Project, "id"> & { id?: string })[],
  portProfileId: string
): Promise<{ created: number; updated: number }> {
  const portId = getPortId();
  let created = 0;
  let updated = 0;

  for (const project of projects) {
    const createData = toPrismaCreate(project, portId, portProfileId);

    if (project.id) {
      const existing = await prisma.demoProject.findFirst({
        where: { id: project.id, portId },
      });

      if (existing) {
        await prisma.demoProject.update({
          where: { id: project.id },
          data: {
            ...createData,
            id: undefined,
            portId: undefined,
            portProfile: undefined,
          },
        });
        updated++;
        continue;
      }
    }

    await prisma.demoProject.create({ data: createData });
    created++;
  }

  return { created, updated };
}

// Clear all projects for current port
export async function clearProjects(): Promise<void> {
  const portId = getPortId();
  await prisma.demoProject.deleteMany({
    where: { portId },
  });
}
