/**
 * Pipeline Phase Task Templates
 *
 * Defines the default tasks and subtasks that are auto-generated
 * for each pipeline phase when a grant enters the pipeline.
 */

export type PipelinePhase =
  | "eligible"
  | "drafting"
  | "applied"
  | "under_review"
  | "awarded"
  | "reporting"
  | "closeout";

export const PIPELINE_PHASES: PipelinePhase[] = [
  "eligible",
  "drafting",
  "applied",
  "under_review",
  "awarded",
  "reporting",
  "closeout",
];

export const PHASE_LABELS: Record<PipelinePhase, string> = {
  eligible: "Eligible",
  drafting: "Drafting",
  applied: "Applied",
  under_review: "Under Review",
  awarded: "Awarded",
  reporting: "Reporting",
  closeout: "Closeout",
};

// Display columns merge "applied" and "under_review" into one column
export type DisplayColumn = "eligible" | "drafting" | "applied_review" | "awarded" | "reporting" | "closeout";

export const DISPLAY_COLUMNS: DisplayColumn[] = [
  "eligible",
  "drafting",
  "applied_review",
  "awarded",
  "reporting",
  "closeout",
];

export const DISPLAY_COLUMN_LABELS: Record<DisplayColumn, string> = {
  eligible: "Eligible",
  drafting: "Drafting",
  applied_review: "Applied / Review",
  awarded: "Awarded",
  reporting: "Reporting",
  closeout: "Closeout",
};

// Map display columns to the data phases they contain
export const DISPLAY_COLUMN_PHASES: Record<DisplayColumn, PipelinePhase[]> = {
  eligible: ["eligible"],
  drafting: ["drafting"],
  applied_review: ["applied", "under_review"],
  awarded: ["awarded"],
  reporting: ["reporting"],
  closeout: ["closeout"],
};

// Map a data phase to its display column
export function phaseToDisplayColumn(phase: PipelinePhase): DisplayColumn {
  if (phase === "applied" || phase === "under_review") return "applied_review";
  return phase as DisplayColumn;
}

export const PHASE_COLORS: Record<PipelinePhase, string> = {
  eligible: "bg-blue-500",
  drafting: "bg-indigo-500",
  applied: "bg-purple-500",
  under_review: "bg-amber-500",
  awarded: "bg-green-500",
  reporting: "bg-teal-500",
  closeout: "bg-slate-500",
};

export const PHASE_LIGHT_COLORS: Record<PipelinePhase, string> = {
  eligible: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  drafting: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  applied: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  under_review: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  awarded: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  reporting: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  closeout: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300",
};

interface SubtaskTemplate {
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
}

interface PhaseTaskTemplate {
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  subtasks: SubtaskTemplate[];
}

export const PHASE_TASK_TEMPLATES: Record<PipelinePhase, PhaseTaskTemplate> = {
  eligible: {
    title: "Eligibility Review",
    description: "Review grant eligibility requirements and gather initial documentation",
    priority: "high",
    subtasks: [
      {
        title: "Review eligibility criteria",
        description: "Verify that the organization meets all eligibility requirements",
        priority: "high",
      },
      {
        title: "Gather required certifications",
        description: "Collect SAM registration, UEI, and other required certifications",
        priority: "medium",
      },
      {
        title: "Assess capacity & match requirements",
        description: "Evaluate cost-sharing/match requirements and organizational capacity",
        priority: "medium",
      },
    ],
  },
  drafting: {
    title: "Application Drafting",
    description: "Draft and prepare the grant application package",
    priority: "high",
    subtasks: [
      {
        title: "Grant requirement gathering",
        description: "Compile all NOFO requirements, forms, and submission guidelines",
        priority: "high",
      },
      {
        title: "Narrative outline",
        description: "Create outline for the project narrative and statement of work",
        priority: "high",
      },
      {
        title: "Budget development",
        description: "Develop detailed budget and budget narrative",
        priority: "high",
      },
      {
        title: "Draft narrative sections",
        description: "Write project narrative, need statement, and evaluation plan",
        priority: "medium",
      },
      {
        title: "Review & sign-offs",
        description: "Internal review, edits, and obtain required signatures",
        priority: "high",
      },
    ],
  },
  applied: {
    title: "Application Submitted",
    description: "Track the submitted application and follow up as needed",
    priority: "medium",
    subtasks: [
      {
        title: "Confirm submission receipt",
        description: "Verify application was received and obtain confirmation number",
        priority: "high",
      },
      {
        title: "Archive application package",
        description: "Save copies of all submitted documents for records",
        priority: "low",
      },
    ],
  },
  under_review: {
    title: "Application Under Review",
    description: "Monitor application status and respond to reviewer requests",
    priority: "medium",
    subtasks: [
      {
        title: "Monitor review status",
        description: "Check for status updates and any requests for information",
        priority: "medium",
      },
      {
        title: "Respond to reviewer questions",
        description: "Address any clarification requests from the funding agency",
        priority: "high",
      },
    ],
  },
  awarded: {
    title: "Award Setup",
    description: "Set up award management systems and begin performance period",
    priority: "high",
    subtasks: [
      {
        title: "Execute grant agreement",
        description: "Review and sign the grant agreement/terms and conditions",
        priority: "urgent",
      },
      {
        title: "Set up financial tracking",
        description: "Configure budget tracking, drawdown schedules, and accounting codes",
        priority: "high",
      },
      {
        title: "Establish compliance framework",
        description: "Set up compliance monitoring for Buy America, DBE, Davis-Bacon, etc.",
        priority: "high",
      },
      {
        title: "Kick-off meeting",
        description: "Schedule and conduct project kick-off with stakeholders",
        priority: "medium",
      },
    ],
  },
  reporting: {
    title: "Ongoing Reporting",
    description: "Complete required reports and track expenditures",
    priority: "high",
    subtasks: [
      {
        title: "Log expenses & drawdowns",
        description: "Record expenditures and process reimbursement requests",
        priority: "high",
      },
      {
        title: "Prepare SF-425 financial report",
        description: "Complete Federal Financial Report (SF-425)",
        priority: "high",
      },
      {
        title: "Prepare progress/performance report",
        description: "Complete quarterly or annual progress reports",
        priority: "high",
      },
      {
        title: "Subrecipient monitoring",
        description: "Monitor subrecipient compliance and collect reports",
        priority: "medium",
      },
      {
        title: "FFATA/FSRS reporting",
        description: "Complete required federal transparency reporting",
        priority: "medium",
      },
    ],
  },
  closeout: {
    title: "Grant Closeout",
    description: "Complete final reports and close out the grant",
    priority: "high",
    subtasks: [
      {
        title: "Final financial report",
        description: "Submit final SF-425 and reconcile all expenditures",
        priority: "urgent",
      },
      {
        title: "Final performance report",
        description: "Complete and submit the final progress/performance report",
        priority: "high",
      },
      {
        title: "Equipment & inventory disposition",
        description: "Account for and dispose of equipment per grant terms",
        priority: "medium",
      },
      {
        title: "Records retention setup",
        description: "Organize records for the required retention period",
        priority: "medium",
      },
    ],
  },
};

// Assignee color palette - used to visually distinguish team members in the Gantt chart
export const ASSIGNEE_COLORS = [
  { bg: "bg-blue-500", light: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300", hex: "#3b82f6" },
  { bg: "bg-emerald-500", light: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300", hex: "#10b981" },
  { bg: "bg-purple-500", light: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300", hex: "#8b5cf6" },
  { bg: "bg-orange-500", light: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300", hex: "#f97316" },
  { bg: "bg-pink-500", light: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300", hex: "#ec4899" },
  { bg: "bg-cyan-500", light: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300", hex: "#06b6d4" },
  { bg: "bg-amber-500", light: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300", hex: "#f59e0b" },
  { bg: "bg-rose-500", light: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300", hex: "#f43f5e" },
  { bg: "bg-lime-500", light: "bg-lime-100 text-lime-800 dark:bg-lime-900/40 dark:text-lime-300", hex: "#84cc16" },
  { bg: "bg-violet-500", light: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300", hex: "#8b5cf6" },
];

export function getAssigneeColor(index: number) {
  return ASSIGNEE_COLORS[index % ASSIGNEE_COLORS.length];
}

export const UNASSIGNED_COLOR = {
  bg: "bg-gray-400",
  light: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  hex: "#9ca3af",
};
