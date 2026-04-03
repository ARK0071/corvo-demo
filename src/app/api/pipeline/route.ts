import { NextRequest, NextResponse } from "next/server";
import { setTenantConfigFromHeaders } from "@/lib/db/tenant-config";
import * as DemoPipeline from "@/lib/db/repositories/demo-pipeline";
import type { PipelineStage } from "@/data/grant-pipeline";

// GET: List all pipeline grants or by stage
export async function GET(request: NextRequest) {
  try {
    setTenantConfigFromHeaders(request.headers);

    const searchParams = request.nextUrl.searchParams;
    const stage = searchParams.get("stage") as PipelineStage | null;
    const grantId = searchParams.get("grantId");

    // If grantId provided, check if in pipeline
    if (grantId) {
      const grant = await DemoPipeline.getPipelineGrantById(grantId);
      return NextResponse.json({ grant, inPipeline: !!grant });
    }

    // If stage filter provided
    if (stage) {
      const grants = await DemoPipeline.getGrantsByStage(stage);
      return NextResponse.json({ grants, total: grants.length });
    }

    // Otherwise return all pipeline grants
    const grants = await DemoPipeline.getAllPipelineGrants();
    return NextResponse.json({ grants, total: grants.length });
  } catch (error) {
    console.error("Pipeline GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch pipeline" },
      { status: 500 }
    );
  }
}

// POST: Add grant to pipeline
export async function POST(request: NextRequest) {
  try {
    setTenantConfigFromHeaders(request.headers);
    const body = await request.json();

    const { grantId, portProfileId, notes, stage } = body;

    if (!grantId || !portProfileId) {
      return NextResponse.json(
        { error: "grantId and portProfileId are required" },
        { status: 400 }
      );
    }

    const pipelineGrant = await DemoPipeline.addToPipeline(grantId, portProfileId, {
      notes,
      stage,
    });
    return NextResponse.json(pipelineGrant, { status: 201 });
  } catch (error) {
    console.error("Pipeline POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add to pipeline" },
      { status: 500 }
    );
  }
}

// PUT: Update pipeline grant (move stage, update notes/scores)
export async function PUT(request: NextRequest) {
  try {
    setTenantConfigFromHeaders(request.headers);
    const body = await request.json();

    const { grantId, action, ...data } = body;

    if (!grantId) {
      return NextResponse.json({ error: "grantId is required" }, { status: 400 });
    }

    let result;

    switch (action) {
      case "move":
        if (!data.stage) {
          return NextResponse.json({ error: "stage is required for move action" }, { status: 400 });
        }
        result = await DemoPipeline.moveGrantToStage(grantId, data.stage);
        break;

      case "notes":
        result = await DemoPipeline.updateGrantNotes(grantId, data.notes || "");
        break;

      case "scores":
        result = await DemoPipeline.updateGrantScores(grantId, data.scores || {});
        break;

      default:
        return NextResponse.json(
          { error: "Invalid action. Use: move, notes, or scores" },
          { status: 400 }
        );
    }

    if (!result) {
      return NextResponse.json({ error: "Grant not found in pipeline" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Pipeline PUT error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update pipeline" },
      { status: 500 }
    );
  }
}

// DELETE: Remove grant from pipeline
export async function DELETE(request: NextRequest) {
  try {
    setTenantConfigFromHeaders(request.headers);
    const searchParams = request.nextUrl.searchParams;
    const grantId = searchParams.get("grantId");

    if (!grantId) {
      return NextResponse.json({ error: "grantId is required" }, { status: 400 });
    }

    const deleted = await DemoPipeline.removeFromPipeline(grantId);
    if (!deleted) {
      return NextResponse.json({ error: "Grant not found in pipeline" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Pipeline DELETE error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to remove from pipeline" },
      { status: 500 }
    );
  }
}
