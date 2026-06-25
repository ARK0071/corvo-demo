/**
 * Import projects from CSV file into the database.
 *
 * Usage:
 *   npx tsx src/scripts/import-projects.ts --port <port-slug> --file <csv-path> [--env demo|test|production]
 *
 * Example:
 *   npx tsx src/scripts/import-projects.ts --port port-freeport --file ./data/projects.csv --env demo
 *
 * CSV columns (case-insensitive, flexible matching):
 *   name, description, projectType/project_type/type, status, priority, budget,
 *   location, startDate/start_date, endDate/end_date, focusAreas/focus_areas,
 *   notes, fundingSource/funding_source, nepaStatus/nepa_status, designCompletion/design_completion,
 *   designPhase/design_phase, shovelReady/shovel_ready, jobsCreated/jobs_created, etc.
 */

// Load environment variables from .env file
import "dotenv/config";

import { prisma } from "@/lib/db/client";
import { AVAILABLE_PORTS } from "@/lib/db/tenant-config";
import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse/sync";

/**
 * Resolve port slug to short portId
 * e.g., "port-freeport" -> "freeport", "freeport" -> "freeport"
 */
function resolvePortId(portSlugOrId: string): string {
  // Try to find by slug first
  const bySlug = AVAILABLE_PORTS.find((p) => p.slug === portSlugOrId);
  if (bySlug) return bySlug.id;

  // Try to find by id
  const byId = AVAILABLE_PORTS.find((p) => p.id === portSlugOrId);
  if (byId) return byId.id;

  // Return as-is if not found (for custom ports)
  return portSlugOrId;
}

interface CSVRow {
  [key: string]: string | undefined;
}

interface ProjectData {
  name: string;
  description: string;
  projectType: string;
  status: string;
  priority: string;
  budget: number;
  location?: string;
  startDate?: Date;
  endDate?: Date;
  focusAreas: string[];
  notes?: string;
  fundingSource?: string;
  costShareSource?: string;
  nepaStatus: string;
  nepaDocument?: string;
  nepaCompletionDate?: Date;
  designCompletion: number;
  designPhase: string;
  permits: string[];
  rightOfWay: string;
  procurementApproach?: string;
  constructionStartTarget?: Date;
  shovelReady: boolean;
  priorFederalAwards: string[];
  auditFindings: string;
  onTimeCompletion?: number;
  jobsCreated?: number;
  jobsRetained?: number;
  tonnageImpact?: number;
  emissionsReduction?: string;
  safetyImpact?: string;
  economicImpact?: string;
  communitiesBenefited?: string;
}

// Normalize column name to camelCase
function normalizeColumnName(col: string): string {
  return col
    .toLowerCase()
    .replace(/[_\s]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^./, (c) => c.toLowerCase());
}

// Get value from row with flexible column name matching
function getValue(row: CSVRow, ...keys: string[]): string | undefined {
  for (const key of keys) {
    // Try exact match
    if (row[key] !== undefined) return row[key];
    // Try lowercase
    if (row[key.toLowerCase()] !== undefined) return row[key.toLowerCase()];
    // Try with underscores
    const snakeCase = key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
    if (row[snakeCase] !== undefined) return row[snakeCase];
  }
  return undefined;
}

// Parse date string
function parseDate(dateStr: string | undefined): Date | undefined {
  if (!dateStr || dateStr.trim() === "") return undefined;
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? undefined : parsed;
}

// Parse number
function parseNumber(numStr: string | undefined): number | undefined {
  if (!numStr || numStr.trim() === "") return undefined;
  const cleaned = numStr.replace(/[$,]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? undefined : parsed;
}

// Parse boolean
function parseBoolean(boolStr: string | undefined): boolean {
  if (!boolStr) return false;
  const lower = boolStr.toLowerCase().trim();
  return ["true", "yes", "1", "y"].includes(lower);
}

// Parse JSON array or comma-separated string
function parseArray(arrStr: string | undefined): string[] {
  if (!arrStr || arrStr.trim() === "") return [];
  try {
    const parsed = JSON.parse(arrStr);
    return Array.isArray(parsed) ? parsed : [String(parsed)];
  } catch {
    // Treat as comma-separated
    return arrStr.split(",").map((s) => s.trim()).filter(Boolean);
  }
}

// Parse CSV row into ProjectData
function parseProjectRow(row: CSVRow): ProjectData {
  return {
    name: getValue(row, "name", "projectName", "title") || "Unnamed Project",
    description: getValue(row, "description", "desc", "summary") || "",
    projectType: getValue(row, "projectType", "project_type", "type") || "infrastructure",
    status: getValue(row, "status") || "planning",
    priority: getValue(row, "priority") || "medium",
    budget: parseNumber(getValue(row, "budget", "totalBudget", "cost")) || 0,
    location: getValue(row, "location", "projectLocation"),
    startDate: parseDate(getValue(row, "startDate", "start_date", "startdate")),
    endDate: parseDate(getValue(row, "endDate", "end_date", "enddate")),
    focusAreas: parseArray(getValue(row, "focusAreas", "focus_areas", "areas")),
    notes: getValue(row, "notes", "note", "comments"),
    fundingSource: getValue(row, "fundingSource", "funding_source", "funding"),
    costShareSource: getValue(row, "costShareSource", "cost_share_source", "costShare"),
    nepaStatus: getValue(row, "nepaStatus", "nepa_status", "nepa") || "not_started",
    nepaDocument: getValue(row, "nepaDocument", "nepa_document"),
    nepaCompletionDate: parseDate(getValue(row, "nepaCompletionDate", "nepa_completion_date")),
    designCompletion: parseNumber(getValue(row, "designCompletion", "design_completion", "designPct")) || 0,
    designPhase: getValue(row, "designPhase", "design_phase") || "conceptual",
    permits: parseArray(getValue(row, "permits")),
    rightOfWay: getValue(row, "rightOfWay", "right_of_way", "row") || "not_needed",
    procurementApproach: getValue(row, "procurementApproach", "procurement_approach", "procurement"),
    constructionStartTarget: parseDate(getValue(row, "constructionStartTarget", "construction_start_target", "constructionStart")),
    shovelReady: parseBoolean(getValue(row, "shovelReady", "shovel_ready")),
    priorFederalAwards: parseArray(getValue(row, "priorFederalAwards", "prior_federal_awards", "priorAwards")),
    auditFindings: getValue(row, "auditFindings", "audit_findings") || "none",
    onTimeCompletion: parseNumber(getValue(row, "onTimeCompletion", "on_time_completion")),
    jobsCreated: parseNumber(getValue(row, "jobsCreated", "jobs_created", "jobs")),
    jobsRetained: parseNumber(getValue(row, "jobsRetained", "jobs_retained")),
    tonnageImpact: parseNumber(getValue(row, "tonnageImpact", "tonnage_impact", "tonnage")),
    emissionsReduction: getValue(row, "emissionsReduction", "emissions_reduction", "emissions"),
    safetyImpact: getValue(row, "safetyImpact", "safety_impact", "safety"),
    economicImpact: getValue(row, "economicImpact", "economic_impact"),
    communitiesBenefited: getValue(row, "communitiesBenefited", "communities_benefited", "communities"),
  };
}

async function getOrCreatePortProfile(
  portId: string,
  portSlug: string,
  environment: "demo" | "test" | "production"
): Promise<string> {
  if (environment === "demo") {
    // For demo, use portId (short form) as the identifier
    const existing = await prisma.demoPortProfile.findFirst({
      where: { portId },
    });

    if (existing) {
      console.log(`Found existing demo port profile: ${existing.name} (${existing.id})`);
      return existing.id;
    }

    // Create new demo port profile
    const portInfo = AVAILABLE_PORTS.find((p) => p.id === portId);
    const created = await prisma.demoPortProfile.create({
      data: {
        portId,
        slug: portSlug,
        name: portInfo?.name || portSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        entityType: "Port Authority",
        classification: "Seaport",
      },
    });
    console.log(`Created new demo port profile: ${created.name} (${created.id})`);
    return created.id;
  } else if (environment === "test") {
    const existing = await prisma.testPortProfile.findFirst({
      where: { slug: portSlug },
    });

    if (existing) {
      console.log(`Found existing test port profile: ${existing.name} (${existing.id})`);
      return existing.id;
    }

    const created = await prisma.testPortProfile.create({
      data: {
        slug: portSlug,
        name: portSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        entityType: "Port Authority",
        classification: "Seaport",
      },
    });
    console.log(`Created new test port profile: ${created.name} (${created.id})`);
    return created.id;
  } else {
    // Production
    const existing = await prisma.portProfile.findFirst({
      where: { slug: portSlug },
    });

    if (existing) {
      console.log(`Found existing port profile: ${existing.name} (${existing.id})`);
      return existing.id;
    }

    const created = await prisma.portProfile.create({
      data: {
        slug: portSlug,
        name: portSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        entityType: "Port Authority",
        classification: "Seaport",
      },
    });
    console.log(`Created new port profile: ${created.name} (${created.id})`);
    return created.id;
  }
}

async function importProjects(
  portSlugOrId: string,
  csvPath: string,
  environment: "demo" | "test" | "production"
): Promise<void> {
  // Resolve the port slug to short portId for database storage
  const portId = resolvePortId(portSlugOrId);
  const portSlug = AVAILABLE_PORTS.find((p) => p.id === portId)?.slug || portSlugOrId;

  console.log(`\nImporting projects for port: ${portSlugOrId}`);
  console.log(`  Resolved portId: ${portId}`);
  console.log(`  Resolved portSlug: ${portSlug}`);
  console.log(`Environment: ${environment}`);
  console.log(`CSV file: ${csvPath}\n`);

  // Read and parse CSV
  const absolutePath = path.resolve(csvPath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`CSV file not found: ${absolutePath}`);
  }

  const csvContent = fs.readFileSync(absolutePath, "utf-8");
  const rows = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CSVRow[];

  console.log(`Found ${rows.length} rows in CSV\n`);

  if (rows.length === 0) {
    console.log("No projects to import.");
    return;
  }

  // Get or create port profile
  const portProfileId = await getOrCreatePortProfile(portId, portSlug, environment);

  // Import projects
  let created = 0;
  let updated = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      const project = parseProjectRow(row);

      if (environment === "demo") {
        // Check if project exists by name
        const existing = await prisma.demoProject.findFirst({
          where: {
            portId, // Use resolved short portId
            portProfileId,
            name: project.name,
          },
        });

        if (existing) {
          await prisma.demoProject.update({
            where: { id: existing.id },
            data: {
              ...project,
              focusAreas: project.focusAreas,
              permits: project.permits,
              priorFederalAwards: project.priorFederalAwards,
            },
          });
          updated++;
          console.log(`  Updated: ${project.name}`);
        } else {
          await prisma.demoProject.create({
            data: {
              portId, // Use resolved short portId
              portProfileId,
              ...project,
              focusAreas: project.focusAreas,
              permits: project.permits,
              priorFederalAwards: project.priorFederalAwards,
            },
          });
          created++;
          console.log(`  Created: ${project.name}`);
        }
      } else if (environment === "test") {
        const existing = await prisma.testProject.findFirst({
          where: {
            portProfileId,
            name: project.name,
          },
        });

        if (existing) {
          await prisma.testProject.update({
            where: { id: existing.id },
            data: {
              ...project,
              focusAreas: project.focusAreas,
              permits: project.permits,
              priorFederalAwards: project.priorFederalAwards,
            },
          });
          updated++;
          console.log(`  Updated: ${project.name}`);
        } else {
          await prisma.testProject.create({
            data: {
              portProfileId,
              ...project,
              focusAreas: project.focusAreas,
              permits: project.permits,
              priorFederalAwards: project.priorFederalAwards,
            },
          });
          created++;
          console.log(`  Created: ${project.name}`);
        }
      } else {
        // Production
        const existing = await prisma.project.findFirst({
          where: {
            portProfileId,
            name: project.name,
          },
        });

        if (existing) {
          await prisma.project.update({
            where: { id: existing.id },
            data: {
              ...project,
              focusAreas: project.focusAreas,
              permits: project.permits,
              priorFederalAwards: project.priorFederalAwards,
            },
          });
          updated++;
          console.log(`  Updated: ${project.name}`);
        } else {
          await prisma.project.create({
            data: {
              portProfileId,
              ...project,
              focusAreas: project.focusAreas,
              permits: project.permits,
              priorFederalAwards: project.priorFederalAwards,
            },
          });
          created++;
          console.log(`  Created: ${project.name}`);
        }
      }
    } catch (error) {
      errors++;
      console.error(`  Error importing row:`, error);
    }
  }

  console.log(`\nImport complete:`);
  console.log(`  Created: ${created}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Errors: ${errors}`);
}

// Parse command line arguments
function parseArgs(): { port: string; file: string; env: "demo" | "test" | "production" } {
  const args = process.argv.slice(2);
  let port = "";
  let file = "";
  let env: "demo" | "test" | "production" = "demo";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--port" && args[i + 1]) {
      port = args[i + 1];
      i++;
    } else if (args[i] === "--file" && args[i + 1]) {
      file = args[i + 1];
      i++;
    } else if (args[i] === "--env" && args[i + 1]) {
      const envArg = args[i + 1].toLowerCase();
      if (envArg === "demo" || envArg === "test" || envArg === "production") {
        env = envArg;
      }
      i++;
    }
  }

  if (!port || !file) {
    console.log(`
Usage: npx tsx src/scripts/import-projects.ts --port <port-slug> --file <csv-path> [--env demo|test|production]

Arguments:
  --port <port-slug>   Port identifier (e.g., port-freeport, louisiana-gateway)
  --file <csv-path>    Path to CSV file containing projects
  --env <environment>  Target environment: demo (default), test, or production

Example:
  npx tsx src/scripts/import-projects.ts --port port-freeport --file ./data/projects.csv --env demo
`);
    process.exit(1);
  }

  return { port, file, env };
}

// Main
async function main() {
  const { port, file, env } = parseArgs();

  try {
    await importProjects(port, file, env);
  } catch (error) {
    console.error("Import failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();