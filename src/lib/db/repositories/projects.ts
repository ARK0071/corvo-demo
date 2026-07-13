import { prisma } from "../client";
import { Project as PrismaProject, Prisma } from "@/generated/prisma";
import { getTenantConfig } from "../tenant-config";
import { parseDate } from "../date-utils";
import type { Project, ProjectReadiness, ProjectPastPerformance, ProjectMetrics } from "@/data/projects";

const profileIdCache = new Map<string, string>();

async function getPortProfileId(): Promise<string> {
  const portId = getTenantConfig().portId;
  const cached = profileIdCache.get(portId);
  if (cached) return cached;

  const profile = await prisma.portProfile.findFirst({
    where: { slug: portId },
    select: { id: true },
  });
  if (!profile) throw new Error(`No PortProfile found for slug: ${portId}`);
  profileIdCache.set(portId, profile.id);
  return profile.id;
}

function toProject(project: PrismaProject): Project {
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

  const pastPerformance: ProjectPastPerformance | undefined = project.priorFederalAwards &&
    (project.priorFederalAwards as any[]).length > 0 ? {
    priorFederalAwards: project.priorFederalAwards as ProjectPastPerformance["priorFederalAwards"],
    auditFindings: project.auditFindings as ProjectPastPerformance["auditFindings"],
    onTimeCompletion: project.onTimeCompletion || 0,
  } : undefined;

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

function toPrismaCreate(
  project: Omit<Project, "id"> & { id?: string },
  portProfileId: string
): Prisma.ProjectCreateInput {
  return {
    id: project.id || undefined,
    portProfile: { connect: { id: portProfileId } },
    name: project.name,
    description: project.description || "",
    projectType: project.projectType,
    status: project.status || "planning",
    priority: project.priority || "medium",
    budget: project.budget || 0,
    location: project.location || null,
    startDate: parseDate(project.startDate),
    endDate: parseDate(project.endDate),
    focusAreas: project.focusAreas || [],
    notes: project.notes || null,
    fundingSource: project.fundingSource || null,
    costShareSource: project.costShareSource || null,
    nepaStatus: project.readiness?.nepaStatus || "not_started",
    nepaDocument: project.readiness?.nepaDocument || null,
    nepaCompletionDate: parseDate(project.readiness?.nepaCompletionDate),
    designCompletion: project.readiness?.designCompletion || 0,
    designPhase: project.readiness?.designPhase || "conceptual",
    permits: project.readiness?.permits || [],
    rightOfWay: project.readiness?.rightOfWay || "not_needed",
    procurementApproach: project.readiness?.procurementApproach || null,
    constructionStartTarget: parseDate(project.readiness?.constructionStartTarget),
    shovelReady: project.readiness?.shovelReady || false,
    priorFederalAwards: project.pastPerformance?.priorFederalAwards || [],
    auditFindings: project.pastPerformance?.auditFindings || "none",
    onTimeCompletion: project.pastPerformance?.onTimeCompletion || null,
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
  const portProfileId = await getPortProfileId();
  const projects = await prisma.project.findMany({
    where: { portProfileId },
    orderBy: [{ priority: "asc" }, { name: "asc" }],
  });
  return projects.map(toProject);
}

// Get project by ID
export async function getProjectById(id: string): Promise<Project | undefined> {
  const portProfileId = await getPortProfileId();
  const project = await prisma.project.findFirst({
    where: { id, portProfileId },
  });
  return project ? toProject(project) : undefined;
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
  const portProfileId = await getPortProfileId();
  const where: Prisma.ProjectWhereInput = { portProfileId };

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
    prisma.project.findMany({
      where,
      take: params.limit || 50,
      skip: params.offset || 0,
      orderBy: [{ priority: "asc" }, { name: "asc" }],
    }),
    prisma.project.count({ where }),
  ]);

  return {
    projects: projects.map(toProject),
    total,
  };
}

// Create project
export async function createProject(
  data: Omit<Project, "id"> & { id?: string },
  portProfileIdOrSlug: string
): Promise<Project> {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let portProfileId = portProfileIdOrSlug;
  if (!uuidRegex.test(portProfileIdOrSlug)) {
    const profile = await prisma.portProfile.findFirst({
      where: { slug: portProfileIdOrSlug },
      select: { id: true },
    });
    if (!profile) throw new Error(`No PortProfile found for slug: ${portProfileIdOrSlug}`);
    portProfileId = profile.id;
  }

  const createData = toPrismaCreate(data, portProfileId);
  const project = await prisma.project.create({ data: createData });
  return toProject(project);
}

// Update project
export async function updateProject(
  id: string,
  data: Partial<Omit<Project, "id">>
): Promise<Project | null> {
  const portProfileId = await getPortProfileId();

  const existing = await prisma.project.findFirst({
    where: { id, portProfileId },
  });

  if (!existing) return null;

  const updateData: Prisma.ProjectUpdateInput = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.projectType !== undefined) updateData.projectType = data.projectType;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.budget !== undefined) updateData.budget = data.budget;
  if (data.location !== undefined) updateData.location = data.location || null;
  if (data.startDate !== undefined) updateData.startDate = parseDate(data.startDate);
  if (data.endDate !== undefined) updateData.endDate = parseDate(data.endDate);
  if (data.focusAreas !== undefined) updateData.focusAreas = data.focusAreas;
  if (data.notes !== undefined) updateData.notes = data.notes || null;
  if (data.fundingSource !== undefined) updateData.fundingSource = data.fundingSource || null;
  if (data.costShareSource !== undefined) updateData.costShareSource = data.costShareSource || null;

  if (data.readiness) {
    if (data.readiness.nepaStatus !== undefined) updateData.nepaStatus = data.readiness.nepaStatus;
    if (data.readiness.nepaDocument !== undefined) updateData.nepaDocument = data.readiness.nepaDocument || null;
    if (data.readiness.nepaCompletionDate !== undefined) {
      updateData.nepaCompletionDate = parseDate(data.readiness.nepaCompletionDate);
    }
    if (data.readiness.designCompletion !== undefined) updateData.designCompletion = data.readiness.designCompletion;
    if (data.readiness.designPhase !== undefined) updateData.designPhase = data.readiness.designPhase;
    if (data.readiness.permits !== undefined) updateData.permits = data.readiness.permits;
    if (data.readiness.rightOfWay !== undefined) updateData.rightOfWay = data.readiness.rightOfWay;
    if (data.readiness.procurementApproach !== undefined) updateData.procurementApproach = data.readiness.procurementApproach || null;
    if (data.readiness.constructionStartTarget !== undefined) {
      updateData.constructionStartTarget = parseDate(data.readiness.constructionStartTarget);
    }
    if (data.readiness.shovelReady !== undefined) updateData.shovelReady = data.readiness.shovelReady;
  }

  if (data.pastPerformance) {
    if (data.pastPerformance.priorFederalAwards !== undefined) updateData.priorFederalAwards = data.pastPerformance.priorFederalAwards;
    if (data.pastPerformance.auditFindings !== undefined) updateData.auditFindings = data.pastPerformance.auditFindings;
    if (data.pastPerformance.onTimeCompletion !== undefined) updateData.onTimeCompletion = data.pastPerformance.onTimeCompletion;
  }

  if (data.metrics) {
    if (data.metrics.jobsCreated !== undefined) updateData.jobsCreated = data.metrics.jobsCreated || null;
    if (data.metrics.jobsRetained !== undefined) updateData.jobsRetained = data.metrics.jobsRetained || null;
    if (data.metrics.tonnageImpact !== undefined) updateData.tonnageImpact = data.metrics.tonnageImpact || null;
    if (data.metrics.emissionsReduction !== undefined) updateData.emissionsReduction = data.metrics.emissionsReduction || null;
    if (data.metrics.safetyImpact !== undefined) updateData.safetyImpact = data.metrics.safetyImpact || null;
    if (data.metrics.economicImpact !== undefined) updateData.economicImpact = data.metrics.economicImpact || null;
    if (data.metrics.communitiesBenefited !== undefined) updateData.communitiesBenefited = data.metrics.communitiesBenefited || null;
  }

  const project = await prisma.project.update({
    where: { id },
    data: updateData,
  });

  return toProject(project);
}

// Delete project
export async function deleteProject(id: string): Promise<boolean> {
  const portProfileId = await getPortProfileId();

  const existing = await prisma.project.findFirst({
    where: { id, portProfileId },
  });

  if (!existing) return false;

  await prisma.project.delete({ where: { id } });
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
  const portProfileId = await getPortProfileId();

  const [statusCounts, priorityCounts, totalBudget, shovelReadyCount] = await Promise.all([
    prisma.project.groupBy({
      by: ["status"],
      where: { portProfileId },
      _count: true,
    }),
    prisma.project.groupBy({
      by: ["priority"],
      where: { portProfileId },
      _count: true,
    }),
    prisma.project.aggregate({
      where: { portProfileId },
      _sum: { budget: true },
    }),
    prisma.project.count({
      where: { portProfileId, shovelReady: true },
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
