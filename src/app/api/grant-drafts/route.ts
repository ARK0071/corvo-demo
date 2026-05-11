import { NextRequest, NextResponse } from "next/server";
import { resolveSecureTenant } from "@/lib/db/tenant-config.server";
import * as DemoGrantDrafts from "@/lib/db/repositories/demo-grant-drafts";
import type { DraftStatus } from "@/lib/db/repositories/demo-grant-drafts";

// GET: List all drafts or get by ID/grantId
export async function GET(request: NextRequest) {
  try {
    await resolveSecureTenant(request.headers);

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");
    const grantId = searchParams.get("grantId");
    const status = searchParams.get("status") as DraftStatus | null;

    // If ID provided, return single draft
    if (id) {
      const draft = await DemoGrantDrafts.getDraftById(id);
      if (!draft) {
        return NextResponse.json({ error: "Draft not found" }, { status: 404 });
      }
      return NextResponse.json(draft);
    }

    // If grantId provided, return draft for that grant
    if (grantId) {
      const draft = await DemoGrantDrafts.getDraftByGrantId(grantId);
      if (!draft) {
        return NextResponse.json({ error: "Draft not found" }, { status: 404 });
      }
      return NextResponse.json(draft);
    }

    // If status filter provided
    if (status) {
      const drafts = await DemoGrantDrafts.getDraftsByStatus(status);
      return NextResponse.json({ drafts, total: drafts.length });
    }

    // Otherwise return all drafts
    const drafts = await DemoGrantDrafts.getAllDrafts();
    return NextResponse.json({ drafts, total: drafts.length });
  } catch (error) {
    console.error("Grant drafts GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch drafts" },
      { status: 500 }
    );
  }
}

// POST: Create a new draft
export async function POST(request: NextRequest) {
  try {
    await resolveSecureTenant(request.headers);
    const body = await request.json();

    const { portProfileId, grantId, grantProgram, ...rest } = body;

    if (!portProfileId || !grantId || !grantProgram) {
      return NextResponse.json(
        { error: "portProfileId, grantId, and grantProgram are required" },
        { status: 400 }
      );
    }

    const draft = await DemoGrantDrafts.createDraft(
      { grantId, grantProgram, ...rest },
      portProfileId
    );

    return NextResponse.json(draft, { status: 201 });
  } catch (error) {
    console.error("Grant drafts POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create draft" },
      { status: 500 }
    );
  }
}

// PUT: Update a draft (status, sections, research data, etc.)
export async function PUT(request: NextRequest) {
  try {
    await resolveSecureTenant(request.headers);
    const body = await request.json();

    const { id, action, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    let result;

    switch (action) {
      case "updateStatus":
        if (!data.status) {
          return NextResponse.json({ error: "status is required" }, { status: 400 });
        }
        result = await DemoGrantDrafts.updateDraftStatus(id, data.status);
        break;

      case "updateResearch":
        if (!data.researchData) {
          return NextResponse.json({ error: "researchData is required" }, { status: 400 });
        }
        result = await DemoGrantDrafts.updateResearchData(id, data.researchData);
        break;

      case "updateSections":
        if (!data.sections) {
          return NextResponse.json({ error: "sections array is required" }, { status: 400 });
        }
        result = await DemoGrantDrafts.updateSections(id, data.sections);
        break;

      case "updateSection":
        if (!data.sectionId || !data.updates) {
          return NextResponse.json(
            { error: "sectionId and updates are required" },
            { status: 400 }
          );
        }
        result = await DemoGrantDrafts.updateSection(id, data.sectionId, data.updates);
        break;

      case "updateAttachments":
        if (!data.attachmentsChecklist) {
          return NextResponse.json(
            { error: "attachmentsChecklist is required" },
            { status: 400 }
          );
        }
        result = await DemoGrantDrafts.updateAttachments(id, data.attachmentsChecklist);
        break;

      case "setSectionsFromAI":
        if (!data.sections) {
          return NextResponse.json({ error: "sections array is required" }, { status: 400 });
        }
        result = await DemoGrantDrafts.setSectionsFromAI(id, data.sections);
        break;

      default:
        return NextResponse.json(
          { error: "Invalid action. Valid actions: updateStatus, updateResearch, updateSections, updateSection, updateAttachments, setSectionsFromAI" },
          { status: 400 }
        );
    }

    if (!result) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Grant drafts PUT error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update draft" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a draft
export async function DELETE(request: NextRequest) {
  try {
    await resolveSecureTenant(request.headers);
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const deleted = await DemoGrantDrafts.deleteDraft(id);
    if (!deleted) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Grant drafts DELETE error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete draft" },
      { status: 500 }
    );
  }
}
