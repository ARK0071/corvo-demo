import { NextRequest, NextResponse } from "next/server";
import { resolveSecureTenant } from "@/lib/db/tenant-config.server";
import { auth } from "@/lib/auth/auth";
import * as Pipeline from "@/lib/db/repositories/pipeline";
import * as Grants from "@/lib/db/repositories/grants";
import { prisma } from "@/lib/db/client";
import type { PipelineStage } from "@/data/grant-pipeline";
import type { DiscoveredGrant } from "@/lib/grants-gov";
import { PHASE_TASK_TEMPLATES, PIPELINE_PHASES } from "@/lib/pipeline-tasks";
import type { PipelinePhase } from "@/lib/pipeline-tasks";

/**
 * Resolve the portProfileId (UUID) for the current user.
 *
 * Tries multiple strategies:
 *   1. If the value is already a UUID, use it directly.
 *   2. Exact slug match in port_profiles.
 *   3. Slug LIKE match (prefix-based fallback).
 */
async function resolvePortProfileId(
  ...candidates: (string | null | undefined)[]
): Promise<string | null> {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  for (const value of candidates) {
    if (!value) continue;

    // Already a UUID
    if (uuidRegex.test(value)) return value;

    // Exact slug match
    const exact = await prisma.portProfile.findUnique({
      where: { slug: value },
      select: { id: true },
    });
    if (exact) return exact.id;
  }

  // Fuzzy: try slug LIKE any candidate (prefix-based fallback)
  for (const value of candidates) {
    if (!value || uuidRegex.test(value)) continue;

    const like = await prisma.portProfile.findFirst({
      where: { slug: { startsWith: value } },
      select: { id: true },
    });
    if (like) return like.id;
  }

  return null;
}

/**
 * Get the best identifiers for the current request:
 * session portId, header slug, header portId, and the tenant config values.
 */
async function getPortCandidates(
  request: NextRequest
): Promise<{ candidates: string[]; tenant: Awaited<ReturnType<typeof resolveSecureTenant>> }> {
  const tenant = await resolveSecureTenant(request.headers);
  const session = await auth();

  const candidates: string[] = [];
  const isAdmin = session?.user?.role === "admin";
  // Header values from tenant context (reflect admin's entity selection)
  const headerSlug = request.headers.get("x-corvo-port-slug");
  const headerPortId = request.headers.get("x-corvo-port-id");
  if (isAdmin) {
    // Admins: headers take priority (they reflect the selected entity)
    if (headerSlug) candidates.push(headerSlug);
    if (headerPortId) candidates.push(headerPortId);
    if (session?.user?.portId) candidates.push(session.user.portId);
  } else {
    // Non-admins: session portId is most authoritative
    if (session?.user?.portId) candidates.push(session.user.portId);
    if (headerSlug) candidates.push(headerSlug);
    if (headerPortId) candidates.push(headerPortId);
  }
  // Tenant config fallback
  if (tenant.portSlug) candidates.push(tenant.portSlug);
  if (tenant.portId) candidates.push(tenant.portId);

  return { candidates, tenant };
}

/**
 * Normalize production PipelineGrant for client consumption.
 * The client uses `id` as the Grants.gov opportunity ID, but the production
 * DB stores it as `grantId` (with `id` being the row UUID).
 */
function toClientGrant(grant: Pipeline.PipelineGrant) {
  return {
    ...grant,
    pipelineId: grant.id, // Original DB UUID for task linking
    id: grant.grantId, // Client expects id = opportunity ID
  };
}

// GET: List all pipeline grants or by stage
export async function GET(request: NextRequest) {
  try {
    const { candidates } = await getPortCandidates(request);

    const portProfileId = await resolvePortProfileId(...candidates);
    if (!portProfileId) {
      return NextResponse.json(
        { error: `No port profile found. Tried: ${candidates.join(", ")}` },
        { status: 404 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const stage = searchParams.get("stage") as PipelineStage | null;
    const grantId = searchParams.get("grantId");

    // If grantId provided, check if in pipeline
    if (grantId) {
      const grant = await Pipeline.getPipelineGrantByGrantId(
        grantId,
        portProfileId
      );
      return NextResponse.json({
        grant: grant ? toClientGrant(grant) : null,
        inPipeline: !!grant,
      });
    }

    // If stage filter provided
    if (stage) {
      const grants = await Pipeline.getGrantsByStage(portProfileId, stage);
      return NextResponse.json({
        grants: grants.map(toClientGrant),
        total: grants.length,
      });
    }

    // Otherwise return all pipeline grants
    const grants = await Pipeline.getAllPipelineGrants(portProfileId);
    return NextResponse.json({
      grants: grants.map(toClientGrant),
      total: grants.length,
    });
  } catch (error) {
    console.error("Pipeline GET error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch pipeline",
      },
      { status: 500 }
    );
  }
}

// POST: Add grant to pipeline
export async function POST(request: NextRequest) {
  try {
    const { candidates } = await getPortCandidates(request);
    const body = await request.json();

    const { grantId, portProfileId: clientProfileId, notes, stage, grant } = body;

    if (!grantId) {
      return NextResponse.json(
        { error: "grantId is required" },
        { status: 400 }
      );
    }

    // Resolve portProfileId — try the client-sent value first, then session/header candidates
    const allCandidates = clientProfileId
      ? [clientProfileId, ...candidates]
      : candidates;
    const portProfileId = await resolvePortProfileId(...allCandidates);
    if (!portProfileId) {
      return NextResponse.json(
        { error: `Could not resolve port profile. Tried: ${allCandidates.join(", ")}` },
        { status: 404 }
      );
    }

    // If grant data is provided, store it in the database first
    // This ensures the foreign key constraint is satisfied
    if (grant) {
      const grantData: DiscoveredGrant = {
        id: grantId,
        opportunityNumber: grant.opportunityNumber || "",
        title: grant.title || "",
        agency: grant.agency || "",
        agencyCode: grant.agencyCode || "",
        description: grant.description || "",
        awardFloor: grant.awardFloor || 0,
        awardCeiling: grant.awardCeiling || 0,
        totalFunding: grant.totalFunding || 0,
        closeDate: grant.closeDate || "",
        postDate: grant.postDate || "",
        status: grant.status || "posted",
        applicationUrl: grant.applicationUrl || "",
        eligibility: grant.eligibility || [],
        fundingCategories: grant.fundingCategories || [],
        fundingInstruments: grant.fundingInstruments || [],
        costSharing: grant.costSharing || false,
        alnNumbers: grant.alnNumbers || [],
        contactName: grant.contactName,
        contactEmail: grant.contactEmail,
        contactPhone: grant.contactPhone,
      };
      await Grants.upsertGrant(grantData);
    }

    const pipelineGrant = await Pipeline.addToPipeline(
      grantId,
      portProfileId
    );

    // Auto-generate pipeline phase tasks
    const existingTaskCount = await prisma.task.count({
      where: { pipelineGrantId: pipelineGrant.id, parentTaskId: null },
    });
    if (existingTaskCount === 0) {
      const session = await auth();
      const userId = session?.user?.id;
      for (let i = 0; i < PIPELINE_PHASES.length; i++) {
        const phase: PipelinePhase = PIPELINE_PHASES[i];
        const template = PHASE_TASK_TEMPLATES[phase];
        if (!template) continue;

        const parentTask = await prisma.task.create({
          data: {
            portProfileId,
            pipelineGrantId: pipelineGrant.id,
            title: template.title,
            description: template.description,
            status: "not_started",
            priority: template.priority,
            phase,
            source: "template",
            sortOrder: i,
            createdBy: userId || null,
          },
        });

        for (let j = 0; j < template.subtasks.length; j++) {
          const sub = template.subtasks[j];
          await prisma.task.create({
            data: {
              portProfileId,
              pipelineGrantId: pipelineGrant.id,
              title: sub.title,
              description: sub.description,
              status: "not_started",
              priority: sub.priority,
              phase,
              parentTaskId: parentTask.id,
              source: "template",
              sortOrder: j,
              createdBy: userId || null,
            },
          });
        }
      }
    }

    return NextResponse.json(toClientGrant(pipelineGrant), { status: 201 });
  } catch (error) {
    console.error("Pipeline POST error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to add to pipeline",
      },
      { status: 500 }
    );
  }
}

// PUT: Update pipeline grant (move stage, update notes/scores)
export async function PUT(request: NextRequest) {
  try {
    const { candidates } = await getPortCandidates(request);
    const body = await request.json();

    const { grantId, action, ...data } = body;

    if (!grantId) {
      return NextResponse.json(
        { error: "grantId is required" },
        { status: 400 }
      );
    }

    const portProfileId = await resolvePortProfileId(...candidates);
    if (!portProfileId) {
      return NextResponse.json(
        { error: `No port profile found. Tried: ${candidates.join(", ")}` },
        { status: 404 }
      );
    }

    let result;

    switch (action) {
      case "move":
        if (!data.stage) {
          return NextResponse.json(
            { error: "stage is required for move action" },
            { status: 400 }
          );
        }
        result = await Pipeline.moveGrantToStage(
          grantId,
          portProfileId,
          data.stage
        );
        break;

      case "notes":
        result = await Pipeline.updateGrantNotes(
          grantId,
          portProfileId,
          data.notes || ""
        );
        break;

      case "scores":
        result = await Pipeline.updateGrantScores(
          grantId,
          portProfileId,
          data.scores || {}
        );
        break;

      default:
        return NextResponse.json(
          { error: "Invalid action. Use: move, notes, or scores" },
          { status: 400 }
        );
    }

    if (!result) {
      return NextResponse.json(
        { error: "Grant not found in pipeline" },
        { status: 404 }
      );
    }

    return NextResponse.json(toClientGrant(result));
  } catch (error) {
    console.error("Pipeline PUT error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update pipeline",
      },
      { status: 500 }
    );
  }
}

// DELETE: Remove grant from pipeline
export async function DELETE(request: NextRequest) {
  try {
    const { candidates } = await getPortCandidates(request);
    const searchParams = request.nextUrl.searchParams;
    const grantId = searchParams.get("grantId");

    if (!grantId) {
      return NextResponse.json(
        { error: "grantId is required" },
        { status: 400 }
      );
    }

    const portProfileId = await resolvePortProfileId(...candidates);
    if (!portProfileId) {
      return NextResponse.json(
        { error: `No port profile found. Tried: ${candidates.join(", ")}` },
        { status: 404 }
      );
    }

    const deleted = await Pipeline.removeFromPipeline(grantId, portProfileId);
    if (!deleted) {
      return NextResponse.json(
        { error: "Grant not found in pipeline" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Pipeline DELETE error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to remove from pipeline",
      },
      { status: 500 }
    );
  }
}
