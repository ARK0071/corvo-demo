import { prisma } from "../client";
import { Prisma } from "@/generated/prisma";
import type { DemoGrantDraft as PrismaDraft, DemoGrantDraftVersion as PrismaVersion } from "@/generated/prisma";
import { getTenantConfig } from "../tenant-config";
import type {
  DraftStatus,
  DraftSection,
  AttachmentStatus,
  ResearchData,
  UserGuidance,
  EditedBy,
  SavedDraft,
  DraftVersion,
} from "@/lib/grant-drafting/types";

// Re-export types for consumers
export type { DraftStatus, DraftSection, AttachmentStatus, ResearchData, UserGuidance, EditedBy, SavedDraft, DraftVersion };

// ─── Helpers ───

function getPortId(): string {
  return getTenantConfig().portId;
}

async function resolvePortProfileId(portProfileIdOrSlug: string): Promise<string | null> {
  const portId = getPortId();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (uuidRegex.test(portProfileIdOrSlug)) {
    return portProfileIdOrSlug;
  }

  let portProfile = await prisma.demoPortProfile.findFirst({
    where: { portId },
    select: { id: true },
  });

  if (!portProfile) {
    try {
      const tenantConfig = getTenantConfig();
      portProfile = await prisma.demoPortProfile.create({
        data: {
          portId,
          slug: tenantConfig.portSlug || portId,
          name: portProfileIdOrSlug || portId,
          entityType: "port",
          location: {},
          characteristics: {},
          priorities: [],
          capabilities: [],
          needs: [],
          certifications: [],
          environmentalGoals: [],
          communityImpact: [],
        },
        select: { id: true },
      });
    } catch (createError) {
      console.error(`[demo-grant-drafts] Failed to create port profile:`, createError);
      return null;
    }
  }

  return portProfile.id;
}

function toSavedDraft(draft: PrismaDraft): SavedDraft {
  return {
    id: draft.id,
    grantId: draft.grantId,
    grantProgram: draft.grantProgram,
    status: draft.status as DraftStatus,
    researchData: (draft.researchData as unknown as ResearchData) || undefined,
    userGuidance: (draft.userGuidance as unknown as UserGuidance) || undefined,
    sections: (draft.sections as unknown as DraftSection[]) || [],
    overallCompleteness: draft.overallCompleteness,
    attachmentsChecklist: (draft.attachmentsChecklist as unknown as AttachmentStatus[]) || [],
    generatedAt: draft.generatedAt?.toISOString(),
    lastEditedAt: draft.lastEditedAt?.toISOString(),
    lastEditedBy: draft.lastEditedById
      ? { userId: draft.lastEditedById, userName: draft.lastEditedByName || "" }
      : undefined,
    createdBy: draft.createdById
      ? { userId: draft.createdById, userName: draft.createdByName || "" }
      : undefined,
    createdAt: draft.createdAt.toISOString(),
    updatedAt: draft.updatedAt.toISOString(),
  };
}

function toDraftVersion(v: PrismaVersion): DraftVersion {
  return {
    id: v.id,
    versionNumber: v.versionNumber,
    sections: (v.sections as unknown as DraftSection[]) || [],
    overallCompleteness: v.overallCompleteness,
    editedBy: {
      userId: v.editedById || "",
      userName: v.editedByName || "",
    },
    editSummary: v.editSummary,
    createdAt: v.createdAt.toISOString(),
  };
}

function calculateCompleteness(sections: DraftSection[]): number {
  if (sections.length === 0) return 0;
  const totalWeight = sections.reduce((sum, s) => sum + s.weight, 0);
  if (totalWeight === 0) return 0;
  const weighted = sections.reduce((sum, s) => {
    const c = s.confidence === "high" ? 1.0 : s.confidence === "medium" ? 0.7 : 0.4;
    return sum + c * s.weight;
  }, 0);
  return Math.round((weighted / totalWeight) * 100);
}

// ─── CRUD Operations ───

export async function getAllDrafts(): Promise<SavedDraft[]> {
  const portId = getPortId();
  const drafts = await prisma.demoGrantDraft.findMany({
    where: { portId },
    orderBy: { updatedAt: "desc" },
  });
  return drafts.map(toSavedDraft);
}

export async function getDraftById(id: string): Promise<SavedDraft | undefined> {
  const portId = getPortId();
  const draft = await prisma.demoGrantDraft.findFirst({
    where: { id, portId },
  });
  return draft ? toSavedDraft(draft) : undefined;
}

export async function getDraftByGrantId(grantId: string): Promise<SavedDraft | undefined> {
  const portId = getPortId();
  const draft = await prisma.demoGrantDraft.findFirst({
    where: { grantId, portId },
  });
  return draft ? toSavedDraft(draft) : undefined;
}

export async function getDraftsByStatus(status: DraftStatus): Promise<SavedDraft[]> {
  const portId = getPortId();
  const drafts = await prisma.demoGrantDraft.findMany({
    where: { portId, status },
    orderBy: { updatedAt: "desc" },
  });
  return drafts.map(toSavedDraft);
}

export async function createDraft(
  data: {
    grantId: string;
    grantProgram: string;
    status?: DraftStatus;
    researchData?: ResearchData;
    userGuidance?: UserGuidance;
    sections?: DraftSection[];
    attachmentsChecklist?: AttachmentStatus[];
  },
  portProfileIdOrSlug: string,
  createdBy?: EditedBy,
): Promise<SavedDraft> {
  const portId = getPortId();

  const portProfileId = await resolvePortProfileId(portProfileIdOrSlug);
  if (!portProfileId) {
    throw new Error(`Could not resolve port profile for: ${portProfileIdOrSlug}`);
  }

  const sections = data.sections || [];
  const overallCompleteness = calculateCompleteness(sections);

  const draft = await prisma.demoGrantDraft.create({
    data: {
      portId,
      portProfile: { connect: { id: portProfileId } },
      grantId: data.grantId,
      grantProgram: data.grantProgram,
      status: data.status || "researching",
      researchData: (data.researchData as unknown as Prisma.InputJsonValue) || Prisma.JsonNull,
      userGuidance: (data.userGuidance as unknown as Prisma.InputJsonValue) || Prisma.JsonNull,
      sections: sections as unknown as Prisma.InputJsonValue,
      overallCompleteness,
      attachmentsChecklist: (data.attachmentsChecklist || []) as unknown as Prisma.InputJsonValue,
      generatedAt: sections.length > 0 ? new Date() : null,
      createdById: createdBy?.userId || null,
      createdByName: createdBy?.userName || null,
    },
  });

  return toSavedDraft(draft);
}

// ─── Updates ───

export async function updateDraftStatus(
  id: string,
  status: DraftStatus,
  editedBy?: EditedBy,
): Promise<SavedDraft | null> {
  const portId = getPortId();
  const existing = await prisma.demoGrantDraft.findFirst({ where: { id, portId } });
  if (!existing) return null;

  const draft = await prisma.demoGrantDraft.update({
    where: { id },
    data: {
      status,
      lastEditedById: editedBy?.userId,
      lastEditedByName: editedBy?.userName,
    },
  });
  return toSavedDraft(draft);
}

export async function updateResearchData(
  id: string,
  researchData: ResearchData,
  editedBy?: EditedBy,
): Promise<SavedDraft | null> {
  const portId = getPortId();
  const existing = await prisma.demoGrantDraft.findFirst({ where: { id, portId } });
  if (!existing) return null;

  const draft = await prisma.demoGrantDraft.update({
    where: { id },
    data: {
      researchData: researchData as unknown as Prisma.InputJsonValue,
      lastEditedById: editedBy?.userId,
      lastEditedByName: editedBy?.userName,
    },
  });
  return toSavedDraft(draft);
}

export async function updateUserGuidance(
  id: string,
  userGuidance: UserGuidance,
  editedBy?: EditedBy,
): Promise<SavedDraft | null> {
  const portId = getPortId();
  const existing = await prisma.demoGrantDraft.findFirst({ where: { id, portId } });
  if (!existing) return null;

  const draft = await prisma.demoGrantDraft.update({
    where: { id },
    data: {
      userGuidance: userGuidance as unknown as Prisma.InputJsonValue,
      lastEditedById: editedBy?.userId,
      lastEditedByName: editedBy?.userName,
    },
  });
  return toSavedDraft(draft);
}

export async function updateSections(
  id: string,
  sections: DraftSection[],
  editedBy?: EditedBy,
  editSummary?: string,
): Promise<SavedDraft | null> {
  const portId = getPortId();
  const existing = await prisma.demoGrantDraft.findFirst({ where: { id, portId } });
  if (!existing) return null;

  const overallCompleteness = calculateCompleteness(sections);

  // Create version snapshot before updating
  await createVersionSnapshot(id, existing, editedBy, editSummary || "Sections updated");

  const draft = await prisma.demoGrantDraft.update({
    where: { id },
    data: {
      sections: sections as unknown as Prisma.InputJsonValue,
      overallCompleteness,
      lastEditedAt: new Date(),
      lastEditedById: editedBy?.userId,
      lastEditedByName: editedBy?.userName,
      generatedAt: existing.generatedAt || new Date(),
    },
  });
  return toSavedDraft(draft);
}

export async function updateSection(
  id: string,
  sectionId: string,
  updates: Partial<DraftSection>,
  editedBy?: EditedBy,
): Promise<SavedDraft | null> {
  const portId = getPortId();
  const existing = await prisma.demoGrantDraft.findFirst({ where: { id, portId } });
  if (!existing) return null;

  const sections = (existing.sections as unknown as DraftSection[]) || [];
  const sectionIndex = sections.findIndex(s => s.sectionId === sectionId);
  if (sectionIndex === -1) return null;

  sections[sectionIndex] = {
    ...sections[sectionIndex],
    ...updates,
    lastEditedAt: new Date().toISOString(),
    lastEditedBy: editedBy,
  };

  return updateSections(id, sections, editedBy, `Updated section: ${sections[sectionIndex].title}`);
}

export async function updateAttachments(
  id: string,
  attachmentsChecklist: AttachmentStatus[],
  editedBy?: EditedBy,
): Promise<SavedDraft | null> {
  const portId = getPortId();
  const existing = await prisma.demoGrantDraft.findFirst({ where: { id, portId } });
  if (!existing) return null;

  const draft = await prisma.demoGrantDraft.update({
    where: { id },
    data: {
      attachmentsChecklist: attachmentsChecklist as unknown as Prisma.InputJsonValue,
      lastEditedAt: new Date(),
      lastEditedById: editedBy?.userId,
      lastEditedByName: editedBy?.userName,
    },
  });
  return toSavedDraft(draft);
}

export async function setSectionsFromAI(
  id: string,
  sections: DraftSection[],
  editedBy?: EditedBy,
): Promise<SavedDraft | null> {
  const portId = getPortId();
  const existing = await prisma.demoGrantDraft.findFirst({ where: { id, portId } });
  if (!existing) return null;

  const markedSections = sections.map(s => ({
    ...s,
    aiGenerated: true,
    lastEditedAt: new Date().toISOString(),
    lastEditedBy: editedBy,
  }));

  const overallCompleteness = calculateCompleteness(markedSections);

  // Create version snapshot
  await createVersionSnapshot(id, existing, editedBy, "AI-generated draft");

  const draft = await prisma.demoGrantDraft.update({
    where: { id },
    data: {
      sections: markedSections as unknown as Prisma.InputJsonValue,
      overallCompleteness,
      generatedAt: new Date(),
      lastEditedAt: new Date(),
      lastEditedById: editedBy?.userId,
      lastEditedByName: editedBy?.userName,
      status: "drafting",
    },
  });
  return toSavedDraft(draft);
}

// ─── Version History ───

async function createVersionSnapshot(
  draftId: string,
  existing: PrismaDraft,
  editedBy?: EditedBy,
  editSummary?: string,
): Promise<void> {
  const existingSections = existing.sections as unknown as DraftSection[];
  // Only create a version if there are actual sections to snapshot
  if (!existingSections || !Array.isArray(existingSections) || existingSections.length === 0) return;
  // Skip if all sections are empty
  if (existingSections.every(s => !s.content || s.content.trim().length === 0)) return;

  // Get next version number
  const lastVersion = await prisma.demoGrantDraftVersion.findFirst({
    where: { draftId },
    orderBy: { versionNumber: "desc" },
    select: { versionNumber: true },
  });
  const nextVersion = (lastVersion?.versionNumber || 0) + 1;

  await prisma.demoGrantDraftVersion.create({
    data: {
      draftId,
      versionNumber: nextVersion,
      sections: existingSections as unknown as Prisma.InputJsonValue,
      overallCompleteness: existing.overallCompleteness,
      editedById: editedBy?.userId || existing.lastEditedById || null,
      editedByName: editedBy?.userName || existing.lastEditedByName || null,
      editSummary: editSummary || "",
    },
  });
}

export async function getVersionHistory(draftId: string): Promise<DraftVersion[]> {
  const portId = getPortId();
  // Verify draft belongs to this port
  const draft = await prisma.demoGrantDraft.findFirst({ where: { id: draftId, portId } });
  if (!draft) return [];

  const versions = await prisma.demoGrantDraftVersion.findMany({
    where: { draftId },
    orderBy: { versionNumber: "desc" },
  });
  return versions.map(toDraftVersion);
}

export async function getVersion(draftId: string, versionNumber: number): Promise<DraftVersion | null> {
  const portId = getPortId();
  const draft = await prisma.demoGrantDraft.findFirst({ where: { id: draftId, portId } });
  if (!draft) return null;

  const version = await prisma.demoGrantDraftVersion.findUnique({
    where: { draftId_versionNumber: { draftId, versionNumber } },
  });
  return version ? toDraftVersion(version) : null;
}

// ─── Delete & Stats ───

export async function deleteDraft(id: string): Promise<boolean> {
  const portId = getPortId();
  const existing = await prisma.demoGrantDraft.findFirst({ where: { id, portId } });
  if (!existing) return false;

  // Cascade will delete versions
  await prisma.demoGrantDraft.delete({ where: { id } });
  return true;
}

export async function getDraftStats(): Promise<{
  total: number;
  byStatus: Record<DraftStatus, number>;
  avgCompleteness: number;
}> {
  const portId = getPortId();
  const drafts = await prisma.demoGrantDraft.findMany({
    where: { portId },
    select: { status: true, overallCompleteness: true },
  });

  const byStatus: Record<DraftStatus, number> = {
    researching: 0,
    drafting: 0,
    reviewing: 0,
    ready: 0,
    submitted: 0,
  };

  let totalCompleteness = 0;
  for (const d of drafts) {
    byStatus[d.status as DraftStatus]++;
    totalCompleteness += d.overallCompleteness;
  }

  return {
    total: drafts.length,
    byStatus,
    avgCompleteness: drafts.length > 0 ? Math.round(totalCompleteness / drafts.length) : 0,
  };
}

export async function clearDrafts(): Promise<void> {
  const portId = getPortId();
  await prisma.demoGrantDraft.deleteMany({ where: { portId } });
}
