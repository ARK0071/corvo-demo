import { prisma } from "../client";
import { DemoGrantDraft as PrismaDraft, Prisma } from "@/generated/prisma";
import { getTenantConfig } from "../tenant-config";

// Get current port ID from tenant config
function getPortId(): string {
  return getTenantConfig().portId;
}

// Helper to resolve portProfileId from UUID or slug
async function resolvePortProfileId(portProfileIdOrSlug: string): Promise<string | null> {
  const portId = getPortId();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (uuidRegex.test(portProfileIdOrSlug)) {
    return portProfileIdOrSlug;
  }

  // Look up the port profile by portId
  const portProfile = await prisma.demoPortProfile.findFirst({
    where: { portId },
    select: { id: true },
  });

  if (!portProfile) {
    console.error(`[demo-grant-drafts] No port profile found for portId: ${portId}`);
    return null;
  }

  return portProfile.id;
}

// Draft status type
export type DraftStatus = "researching" | "drafting" | "reviewing" | "ready" | "submitted";

// Draft section type
export interface DraftSection {
  id: string;
  title: string;
  content: string;
  completeness: number; // 0-100
  lastEditedAt?: string;
  aiGenerated?: boolean;
  notes?: string;
}

// Attachment checklist item
export interface AttachmentItem {
  id: string;
  name: string;
  required: boolean;
  uploaded: boolean;
  fileName?: string;
  uploadedAt?: string;
}

// Research data type
export interface ResearchData {
  grantDetails?: any;
  nofoRequirements?: any;
  portProfile?: any;
  matchingProject?: any;
  competitiveIntel?: any;
  citations?: any[];
  researchedAt?: string;
}

// Application type
export interface GrantDraft {
  id: string;
  grantId: string;
  grantProgram: string;
  status: DraftStatus;
  researchData?: ResearchData;
  sections: DraftSection[];
  overallCompleteness: number;
  attachmentsChecklist: AttachmentItem[];
  generatedAt?: string;
  lastEditedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Convert Prisma model to application type
function toGrantDraft(draft: PrismaDraft): GrantDraft {
  return {
    id: draft.id,
    grantId: draft.grantId,
    grantProgram: draft.grantProgram,
    status: draft.status as DraftStatus,
    researchData: (draft.researchData as unknown as ResearchData) || undefined,
    sections: (draft.sections as unknown as DraftSection[]) || [],
    overallCompleteness: draft.overallCompleteness,
    attachmentsChecklist: (draft.attachmentsChecklist as unknown as AttachmentItem[]) || [],
    generatedAt: draft.generatedAt?.toISOString(),
    lastEditedAt: draft.lastEditedAt?.toISOString(),
    createdAt: draft.createdAt.toISOString(),
    updatedAt: draft.updatedAt.toISOString(),
  };
}

// Get all drafts for current port
export async function getAllDrafts(): Promise<GrantDraft[]> {
  const portId = getPortId();
  const drafts = await prisma.demoGrantDraft.findMany({
    where: { portId },
    orderBy: { updatedAt: "desc" },
  });
  return drafts.map(toGrantDraft);
}

// Get draft by ID
export async function getDraftById(id: string): Promise<GrantDraft | undefined> {
  const portId = getPortId();
  const draft = await prisma.demoGrantDraft.findFirst({
    where: { id, portId },
  });
  return draft ? toGrantDraft(draft) : undefined;
}

// Get draft by grant ID (there should only be one draft per grant per port)
export async function getDraftByGrantId(grantId: string): Promise<GrantDraft | undefined> {
  const portId = getPortId();
  const draft = await prisma.demoGrantDraft.findFirst({
    where: { grantId, portId },
  });
  return draft ? toGrantDraft(draft) : undefined;
}

// Get drafts by status
export async function getDraftsByStatus(status: DraftStatus): Promise<GrantDraft[]> {
  const portId = getPortId();
  const drafts = await prisma.demoGrantDraft.findMany({
    where: { portId, status },
    orderBy: { updatedAt: "desc" },
  });
  return drafts.map(toGrantDraft);
}

// Create a new draft
export async function createDraft(
  data: {
    grantId: string;
    grantProgram: string;
    status?: DraftStatus;
    researchData?: ResearchData;
    sections?: DraftSection[];
    attachmentsChecklist?: AttachmentItem[];
  },
  portProfileIdOrSlug: string
): Promise<GrantDraft> {
  const portId = getPortId();

  // Resolve portProfileId from slug if needed
  const portProfileId = await resolvePortProfileId(portProfileIdOrSlug);
  if (!portProfileId) {
    throw new Error(`Could not resolve port profile for: ${portProfileIdOrSlug}`);
  }

  // Calculate initial completeness
  const sections = data.sections || [];
  const overallCompleteness = sections.length > 0
    ? Math.round(sections.reduce((s, sec) => s + sec.completeness, 0) / sections.length)
    : 0;

  const draft = await prisma.demoGrantDraft.create({
    data: {
      portId,
      portProfile: { connect: { id: portProfileId } },
      grantId: data.grantId,
      grantProgram: data.grantProgram,
      status: data.status || "researching",
      researchData: (data.researchData as unknown as Prisma.InputJsonValue) || Prisma.JsonNull,
      sections: sections as unknown as Prisma.InputJsonValue,
      overallCompleteness,
      attachmentsChecklist: (data.attachmentsChecklist || []) as unknown as Prisma.InputJsonValue,
      generatedAt: sections.length > 0 ? new Date() : null,
    },
  });

  return toGrantDraft(draft);
}

// Update draft status
export async function updateDraftStatus(
  id: string,
  status: DraftStatus
): Promise<GrantDraft | null> {
  const portId = getPortId();
  const existing = await prisma.demoGrantDraft.findFirst({
    where: { id, portId },
  });
  if (!existing) return null;

  const draft = await prisma.demoGrantDraft.update({
    where: { id },
    data: { status },
  });
  return toGrantDraft(draft);
}

// Update research data
export async function updateResearchData(
  id: string,
  researchData: ResearchData
): Promise<GrantDraft | null> {
  const portId = getPortId();
  const existing = await prisma.demoGrantDraft.findFirst({
    where: { id, portId },
  });
  if (!existing) return null;

  const draft = await prisma.demoGrantDraft.update({
    where: { id },
    data: { researchData: researchData as unknown as Prisma.InputJsonValue },
  });
  return toGrantDraft(draft);
}

// Update draft sections
export async function updateSections(
  id: string,
  sections: DraftSection[]
): Promise<GrantDraft | null> {
  const portId = getPortId();
  const existing = await prisma.demoGrantDraft.findFirst({
    where: { id, portId },
  });
  if (!existing) return null;

  const overallCompleteness = sections.length > 0
    ? Math.round(sections.reduce((s, sec) => s + sec.completeness, 0) / sections.length)
    : 0;

  const draft = await prisma.demoGrantDraft.update({
    where: { id },
    data: {
      sections: sections as unknown as Prisma.InputJsonValue,
      overallCompleteness,
      lastEditedAt: new Date(),
      generatedAt: existing.generatedAt || new Date(),
    },
  });
  return toGrantDraft(draft);
}

// Update a single section
export async function updateSection(
  id: string,
  sectionId: string,
  updates: Partial<DraftSection>
): Promise<GrantDraft | null> {
  const portId = getPortId();
  const existing = await prisma.demoGrantDraft.findFirst({
    where: { id, portId },
  });
  if (!existing) return null;

  const sections = (existing.sections as unknown as DraftSection[]) || [];
  const sectionIndex = sections.findIndex((s) => s.id === sectionId);
  if (sectionIndex === -1) return null;

  sections[sectionIndex] = {
    ...sections[sectionIndex],
    ...updates,
    lastEditedAt: new Date().toISOString(),
  };

  return updateSections(id, sections);
}

// Update attachments checklist
export async function updateAttachments(
  id: string,
  attachmentsChecklist: AttachmentItem[]
): Promise<GrantDraft | null> {
  const portId = getPortId();
  const existing = await prisma.demoGrantDraft.findFirst({
    where: { id, portId },
  });
  if (!existing) return null;

  const draft = await prisma.demoGrantDraft.update({
    where: { id },
    data: {
      attachmentsChecklist: attachmentsChecklist as unknown as Prisma.InputJsonValue,
      lastEditedAt: new Date(),
    },
  });
  return toGrantDraft(draft);
}

// Mark an attachment as uploaded
export async function markAttachmentUploaded(
  id: string,
  attachmentId: string,
  fileName: string
): Promise<GrantDraft | null> {
  const portId = getPortId();
  const existing = await prisma.demoGrantDraft.findFirst({
    where: { id, portId },
  });
  if (!existing) return null;

  const attachments = (existing.attachmentsChecklist as unknown as AttachmentItem[]) || [];
  const attachmentIndex = attachments.findIndex((a) => a.id === attachmentId);
  if (attachmentIndex === -1) return null;

  attachments[attachmentIndex] = {
    ...attachments[attachmentIndex],
    uploaded: true,
    fileName,
    uploadedAt: new Date().toISOString(),
  };

  return updateAttachments(id, attachments);
}

// Generate or regenerate sections using AI
export async function setSectionsFromAI(
  id: string,
  sections: DraftSection[]
): Promise<GrantDraft | null> {
  const portId = getPortId();
  const existing = await prisma.demoGrantDraft.findFirst({
    where: { id, portId },
  });
  if (!existing) return null;

  // Mark sections as AI generated
  const markedSections = sections.map((s) => ({
    ...s,
    aiGenerated: true,
    lastEditedAt: new Date().toISOString(),
  }));

  const overallCompleteness = markedSections.length > 0
    ? Math.round(markedSections.reduce((s, sec) => s + sec.completeness, 0) / markedSections.length)
    : 0;

  const draft = await prisma.demoGrantDraft.update({
    where: { id },
    data: {
      sections: markedSections as unknown as Prisma.InputJsonValue,
      overallCompleteness,
      generatedAt: new Date(),
      lastEditedAt: new Date(),
      status: "drafting",
    },
  });
  return toGrantDraft(draft);
}

// Delete draft
export async function deleteDraft(id: string): Promise<boolean> {
  const portId = getPortId();
  const existing = await prisma.demoGrantDraft.findFirst({
    where: { id, portId },
  });
  if (!existing) return false;

  await prisma.demoGrantDraft.delete({ where: { id } });
  return true;
}

// Get draft statistics
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

// Clear all drafts for current port
export async function clearDrafts(): Promise<void> {
  const portId = getPortId();
  await prisma.demoGrantDraft.deleteMany({ where: { portId } });
}
