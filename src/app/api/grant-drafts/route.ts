import { NextRequest, NextResponse } from "next/server";
import { resolveSecureTenant } from "@/lib/db/tenant-config.server";
import { auth } from "@/lib/auth/auth";
import * as DemoGrantDrafts from "@/lib/db/repositories/demo-grant-drafts";
import type { DraftStatus, EditedBy } from "@/lib/grant-drafting/types";

function getEditedBy(session: { user: { id: string; name: string } } | null): EditedBy | undefined {
  if (!session?.user) return undefined;
  return { userId: session.user.id, userName: session.user.name };
}

// GET: List all drafts, get by ID/grantId, or get version history
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    await resolveSecureTenant(request.headers);

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");
    const grantId = searchParams.get("grantId");
    const status = searchParams.get("status") as DraftStatus | null;
    const versions = searchParams.get("versions");
    const versionNumber = searchParams.get("versionNumber");

    // Version history
    if (id && versions === "true") {
      const history = await DemoGrantDrafts.getVersionHistory(id);
      return NextResponse.json({ versions: history });
    }

    // Specific version
    if (id && versionNumber) {
      const version = await DemoGrantDrafts.getVersion(id, parseInt(versionNumber));
      if (!version) {
        return NextResponse.json({ error: "Version not found" }, { status: 404 });
      }
      return NextResponse.json(version);
    }

    // Single draft by ID
    if (id) {
      const draft = await DemoGrantDrafts.getDraftById(id);
      if (!draft) {
        return NextResponse.json({ error: "Draft not found" }, { status: 404 });
      }
      return NextResponse.json(draft);
    }

    // Draft by grantId
    if (grantId) {
      const draft = await DemoGrantDrafts.getDraftByGrantId(grantId);
      if (!draft) {
        return NextResponse.json({ error: "Draft not found" }, { status: 404 });
      }
      return NextResponse.json(draft);
    }

    // By status
    if (status) {
      const drafts = await DemoGrantDrafts.getDraftsByStatus(status);
      return NextResponse.json({ drafts, total: drafts.length });
    }

    // All drafts
    const drafts = await DemoGrantDrafts.getAllDrafts();
    return NextResponse.json({ drafts, total: drafts.length });
  } catch (error) {
    console.error("Grant drafts GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch drafts" },
      { status: 500 },
    );
  }
}

// POST: Create a new draft
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    await resolveSecureTenant(request.headers);
    const body = await request.json();

    const { portProfileId, grantId, grantProgram, ...rest } = body;

    if (!portProfileId || !grantId || !grantProgram) {
      return NextResponse.json(
        { error: "portProfileId, grantId, and grantProgram are required" },
        { status: 400 },
      );
    }

    const draft = await DemoGrantDrafts.createDraft(
      { grantId, grantProgram, ...rest },
      portProfileId,
      getEditedBy(session),
    );

    return NextResponse.json(draft, { status: 201 });
  } catch (error) {
    console.error("Grant drafts POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create draft" },
      { status: 500 },
    );
  }
}

// PUT: Update a draft
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    await resolveSecureTenant(request.headers);
    const body = await request.json();

    const { id, action, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const editedBy = getEditedBy(session);
    let result;

    switch (action) {
      case "updateStatus":
        if (!data.status) {
          return NextResponse.json({ error: "status is required" }, { status: 400 });
        }
        result = await DemoGrantDrafts.updateDraftStatus(id, data.status, editedBy);
        break;

      case "updateResearch":
        if (!data.researchData) {
          return NextResponse.json({ error: "researchData is required" }, { status: 400 });
        }
        result = await DemoGrantDrafts.updateResearchData(id, data.researchData, editedBy);
        break;

      case "updateUserGuidance":
        if (!data.userGuidance) {
          return NextResponse.json({ error: "userGuidance is required" }, { status: 400 });
        }
        result = await DemoGrantDrafts.updateUserGuidance(id, data.userGuidance, editedBy);
        break;

      case "updateSections":
        if (!data.sections) {
          return NextResponse.json({ error: "sections array is required" }, { status: 400 });
        }
        result = await DemoGrantDrafts.updateSections(id, data.sections, editedBy, data.editSummary);
        break;

      case "updateSection":
        if (!data.sectionId || !data.updates) {
          return NextResponse.json(
            { error: "sectionId and updates are required" },
            { status: 400 },
          );
        }
        result = await DemoGrantDrafts.updateSection(id, data.sectionId, data.updates, editedBy);
        break;

      case "updateAttachments":
        if (!data.attachmentsChecklist) {
          return NextResponse.json(
            { error: "attachmentsChecklist is required" },
            { status: 400 },
          );
        }
        result = await DemoGrantDrafts.updateAttachments(id, data.attachmentsChecklist, editedBy);
        break;

      case "setSectionsFromAI":
        if (!data.sections) {
          return NextResponse.json({ error: "sections array is required" }, { status: 400 });
        }
        result = await DemoGrantDrafts.setSectionsFromAI(id, data.sections, editedBy);
        break;

      default:
        return NextResponse.json(
          { error: "Invalid action. Valid: updateStatus, updateResearch, updateUserGuidance, updateSections, updateSection, updateAttachments, setSectionsFromAI" },
          { status: 400 },
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
      { status: 500 },
    );
  }
}

// DELETE: Delete a draft
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

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
      { status: 500 },
    );
  }
}
