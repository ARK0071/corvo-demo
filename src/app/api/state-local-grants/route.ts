import { NextRequest, NextResponse } from "next/server";
import { ensureProfilesLoaded } from "@/data/profiles";
import { prisma } from "@/lib/db/client";
import type { DiscoveredGrant } from "@/lib/grants-gov";

export const dynamic = "force-dynamic";

/**
 * GET /api/state-local-grants?profileId=port-freeport
 * Loads persisted state/local grants from the database for the given profile.
 */
export async function GET(req: NextRequest) {
  await ensureProfilesLoaded();

  const profileId = req.nextUrl.searchParams.get("profileId")?.trim() ?? "";
  if (!profileId) {
    return NextResponse.json({ error: "Missing profileId", grants: [] }, { status: 400 });
  }

  try {
    const profile = await prisma.portProfile.findFirst({
      where: { slug: profileId },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json({ grants: [] });
    }

    const rows = await prisma.stateLocalGrant.findMany({
      where: { portProfileId: profile.id },
      orderBy: { searchedAt: "desc" },
    });

    const grants: DiscoveredGrant[] = rows.map((r) => ({
      id: `sl-${r.grantKey}`,
      opportunityNumber: "",
      title: r.title,
      agency: r.agency,
      agencyCode: "",
      description: r.description || "",
      awardFloor: Number(r.awardFloor),
      awardCeiling: Number(r.awardCeiling),
      totalFunding: Number(r.totalFunding),
      closeDate: r.closeDate ? r.closeDate.toISOString().split("T")[0] : "",
      postDate: r.postDate ? r.postDate.toISOString().split("T")[0] : "",
      status: r.status,
      applicationUrl: r.applicationUrl || "",
      eligibility: (r.eligibility as string[]) || [],
      fundingCategories: (r.fundingCategories as string[]) || [],
      fundingInstruments: [],
      costSharing: r.costSharing,
      alnNumbers: [],
      source: r.source,
    }));

    return NextResponse.json({
      grants,
      lastSearchedAt: rows.length > 0 ? rows[0].searchedAt.toISOString() : null,
    });
  } catch (error) {
    console.error("[state-local-grants] DB error:", error);
    return NextResponse.json({ grants: [] });
  }
}
