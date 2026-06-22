/**
 * Shared types for the Grant Drafting pipeline.
 *
 * Used across: API routes, repositories, builder, and UI components.
 * Single source of truth — no `any` usage.
 */

// ─── Draft Status & Lifecycle ───

export type DraftStatus = "researching" | "drafting" | "reviewing" | "ready" | "submitted";

// ─── User Guidance (user-provided outline for the narrative) ───

export interface UserGuidance {
  coreFundingNeed: string;
  internalJustification: string;
  impactJustification: string;
  budgetPriorities: string;
  strategicEmphasis: string;
  additionalNotes: string;
}

export const EMPTY_USER_GUIDANCE: UserGuidance = {
  coreFundingNeed: "",
  internalJustification: "",
  impactJustification: "",
  budgetPriorities: "",
  strategicEmphasis: "",
  additionalNotes: "",
};

// ─── Draft Sections ───

export interface SectionConfidenceDetail {
  criterionName: string;
  score: number; // 0-100
  feedback: string;
}

export interface DraftSection {
  sectionId: string;
  title: string;
  content: string;
  confidence: "high" | "medium" | "low";
  confidenceReason: string;
  confidenceDetails?: SectionConfidenceDetail[];
  gapAnnotations: string[];
  wordCount: number;
  maxWords: number;
  weight: number;
  lastEditedAt?: string;
  lastEditedBy?: EditedBy;
  aiGenerated?: boolean;
}

export interface EditedBy {
  userId: string;
  userName: string;
}

// ─── Attachments ───

export interface AttachmentStatus {
  id: string;
  name: string;
  description: string;
  required: boolean;
  status: "on_file" | "needs_preparation" | "missing";
  notes: string;
}

// ─── Entity Profile (structured applicant data) ───

export interface EntityLocation {
  city: string;
  state: string;
  stateCode: string;
  county: string;
  region: string;
  congressionalDistrict: string;
}

export interface EntityFinancials {
  annualRevenue: number;
  operatingBudget: number;
  capitalBudget: number;
  bondRating: string;
  matchFundingCapacity?: number;
  totalAssets: number;
}

export interface EntityOperations {
  annualTonnage: number;
  annualTEUs: number;
  vesselCalls: number;
  employeeCount: number;
  directJobs: number;
  cargoTypes: string[];
}

export interface EntityInfrastructure {
  keyFacilities?: string[];
  terminalFacilities?: string[];
  channelDepth?: number;
  channelWidth?: number;
  berths?: number;
  railConnections?: string[];
  acreage: number;
}

export interface EntityEconomicImpact {
  regionalEconomicImpact: number;
  directJobs?: number;
  totalJobs: number;
  tradeValue: number;
  annualTaxRevenue?: number;
}

export interface EntityProject {
  name: string;
  description: string;
  totalCost: number;
  status: string;
  partnerAgencies?: string[];
}

export interface EntityGrantAward {
  program: string;
  awardYear: number;
  awardAmount: number;
  projectName: string;
  agency?: string;
  status?: string;
}

export interface EntityDisadvantagedCommunity {
  description: string;
  povertyRate: number;
  pm25Percentile: number;
  justiceFortyTracker: boolean;
  censusTract?: string;
}

export interface EntityClimateResilience {
  floodZone: string;
  hurricaneExposure: string;
  emissionsBaseline: string;
  emissionsReductionTarget: string;
  existingMitigations: string[];
  plannedMitigations: string[];
}

export interface ResearchEntityProfile {
  name: string;
  legalName: string;
  entityType: string;
  classification: string;
  uei?: string;
  ein?: string;
  location: EntityLocation;
  leadership?: {
    executiveDirector: string;
    cfo: string;
    boardChair: string;
    grantsPOC?: string;
  };
  financials: EntityFinancials;
  operations: EntityOperations;
  infrastructure: EntityInfrastructure;
  economicImpact: EntityEconomicImpact;
  currentProjects: EntityProject[];
  pastGrantAwards: EntityGrantAward[];
  certifications: string[];
  strategicPriorities: string[];
  environmentalGoals: string[];
  communityImpact?: string[];
  disadvantagedCommunityData?: EntityDisadvantagedCommunity;
  climateResilienceData?: EntityClimateResilience;
}

// ─── Grant Requirements (from NOFO or AI-estimated) ───

export interface GrantApplicationSection {
  title: string;
  description: string;
  maxWords: number;
  weight: number;
  evaluationCriteria: string[];
  requiredElements?: string[];
}

export interface GrantRequirementsResearch {
  applicationSections: GrantApplicationSection[];
  costShareRequired: boolean;
  costSharePercentage: number;
  maxAward: number;
  eligibleApplicants: string[];
  submissionDeadline: string;
  source: "nofo-extracted" | "ai-estimated";
}

// ─── Enriched Forms ───

export interface EnrichedForm {
  id: string;
  number: string;
  name: string;
  description: string;
  url: string;
  family: string;
  commonlyRequired: boolean;
  requiredLevel: "required" | "if-applicable" | "post-award";
  notes: string;
  required: boolean;
}

// ─── Grant Details (from Grants.gov) ───

export interface ResearchGrantDetails {
  agency: string;
  awardCeiling: number;
  awardFloor: number;
  totalFunding: number;
  closeDate: string;
  costSharing: boolean;
  eligibility: string[];
  applicationUrl?: string;
  contactName?: string;
  contactEmail?: string;
}

// ─── Web Sources ───

export interface WebSource {
  title: string;
  url: string;
}

// ─── NOFO Validation ───

export interface NofoValidation {
  isMatch: boolean;
  confidence: string;
  detectedProgram: string;
  detectedFiscalYear: string;
  reason: string;
}

// ─── Research Metadata ───

export interface ResearchMetadata {
  researchedAt: string;
  grantsGovAvailable: boolean;
  claudeWebSearchUsed?: boolean;
  webResultsFound: number;
  nofoAutoFetched: boolean;
  nofoPdfUrl: string | null;
  nofoPdfPages: number;
  nofoValidation: NofoValidation | null;
  acfrAutoFetched: boolean;
  acfrPdfUrl: string | null;
  acfrPdfPages: number;
}

// ─── Research Summary ───

export interface ResearchSummary {
  entityDataQuality: "high" | "medium" | "low";
  grantDataQuality: "high" | "medium" | "low";
  keyFindings: string[];
  dataGaps: string[];
}

// ─── Complete Research Data (output of /api/research-grant) ───

export interface ResearchData {
  entityProfile: ResearchEntityProfile;
  grantRequirements: GrantRequirementsResearch;
  forms: EnrichedForm[];
  researchSummary: ResearchSummary;
  grantDetails: ResearchGrantDetails | null;
  webSources: {
    entitySources: WebSource[];
    grantSources: WebSource[];
  };
  metadata: ResearchMetadata;
}

// ─── Draft Response (output of /api/build-grant-application) ───

export interface DraftResponse {
  sections: DraftSection[];
  overallCompleteness: number;
  attachmentsChecklist: AttachmentStatus[];
  generatedAt: string;
  grantProgram: string;
  applicantName: string;
}

// ─── Version History ───

export interface DraftVersion {
  id: string;
  versionNumber: number;
  sections: DraftSection[];
  overallCompleteness: number;
  editedBy: EditedBy;
  editSummary: string;
  createdAt: string;
}

// ─── Saved Draft (full draft with DB metadata) ───

export interface SavedDraft {
  id: string;
  grantId: string;
  grantProgram: string;
  status: DraftStatus;
  researchData?: ResearchData;
  userGuidance?: UserGuidance;
  sections: DraftSection[];
  overallCompleteness: number;
  attachmentsChecklist: AttachmentStatus[];
  generatedAt?: string;
  lastEditedAt?: string;
  lastEditedBy?: EditedBy;
  createdBy?: EditedBy;
  createdAt: string;
  updatedAt: string;
}

// ─── Streaming Events (for SSE during generation) ───

export type DraftStreamEvent =
  | { type: "section_start"; sectionId: string; title: string; index: number; total: number }
  | { type: "section_complete"; section: DraftSection }
  | { type: "scoring_start" }
  | { type: "scoring_complete"; sections: DraftSection[] }
  | { type: "attachments"; attachments: AttachmentStatus[] }
  | { type: "complete"; response: DraftResponse }
  | { type: "error"; message: string }
  | { type: "heartbeat"; completedCount: number; totalCount: number };

// ─── Generation Request ───

export interface GenerateDraftRequest {
  grantId: string;
  grantTitle: string;
  entityProfile: ResearchEntityProfile;
  grantRequirements: GrantRequirementsResearch;
  forms: EnrichedForm[];
  grantDetails?: ResearchGrantDetails | null;
  userGuidance?: UserGuidance;
  portName?: string;
  webSources?: WebSource[];
}

// ─── Section Regeneration Request ───

export interface RegenerateSectionRequest {
  draftId: string;
  sectionId: string;
  entityProfile: ResearchEntityProfile;
  grantRequirements: GrantRequirementsResearch;
  grantDetails?: ResearchGrantDetails | null;
  userGuidance?: UserGuidance;
  otherSections: DraftSection[];
  portName?: string;
  additionalInstructions?: string;
  webSources?: WebSource[];
}

// ─── Rate Limiting ───

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

// ─── Merge helpers ───

/**
 * Safely merge a value, distinguishing between "not provided" (undefined/null)
 * and "explicitly zero/empty". Only falls back to the fallback when the
 * primary is null or undefined — NOT when it's 0 or "".
 */
export function mergeValue<T>(primary: T | null | undefined, fallback: T): T {
  return primary !== null && primary !== undefined ? primary : fallback;
}

/**
 * Merge an array, preferring the primary if it has items.
 */
export function mergeArray<T>(primary: T[] | null | undefined, fallback: T[]): T[] {
  return primary && primary.length > 0 ? primary : fallback;
}
