/**
 * POST /api/vendor-matching/score
 *
 * Server-side vendor scoring using OpenAI embeddings for semantic capability matching.
 * Accepts vendors + grant, returns GrantVendorMatch[] with semantic capability scores.
 *
 * Input:  { vendors: PortVendor[], grant: GrantProgram }
 * Output: { matches: GrantVendorMatch[] }
 */

import { NextResponse } from "next/server";
import type { PortVendor } from "@/data/port-vendors";
import type { GrantProgram } from "@/data/grants";
import { scoreVendorForGrantWithSemantics, scoreVendorForGrant } from "@/data/matches";
import { embedTexts } from "@/lib/vendorMatching/openai";
import {
  buildVendorCapabilityDoc,
  buildCompositeOpportunityDoc,
} from "@/lib/vendorMatching/vendorDocs";
import { computeSemanticCapabilityScore } from "@/lib/vendorMatching/similarity";
import { scoreMaritimeRelevance } from "@/lib/vendorMatching/maritimeRelevance";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const vendors: PortVendor[] = body.vendors;
    const grant: GrantProgram = body.grant;

    if (!vendors || !Array.isArray(vendors) || vendors.length === 0) {
      return NextResponse.json(
        { error: "vendors array is required and must not be empty" },
        { status: 400 }
      );
    }
    if (!grant || !grant.id) {
      return NextResponse.json(
        { error: "grant object with id is required" },
        { status: 400 }
      );
    }

    const hasApiKey = !!process.env.OPENAI_API_KEY;

    if (!hasApiKey) {
      console.warn(
        "[vendor-matching] OPENAI_API_KEY not set — falling back to keyword-based scoring"
      );
      const matches = vendors.map((v) => scoreVendorForGrant(v, grant));
      matches.sort((a, b) => b.overallScore - a.overallScore);
      return NextResponse.json({ matches });
    }

    // Build text documents for embedding
    const opportunityDoc = buildCompositeOpportunityDoc(grant);
    const vendorDocs = vendors.map((v) => buildVendorCapabilityDoc(v));

    console.log(
      `[vendor-matching] Scoring ${vendors.length} vendors against "${grant.shortName}"`
    );

    // Batch embed: opportunity doc first, then all vendor docs
    const allTexts = [opportunityDoc, ...vendorDocs];
    const allEmbeddings = await embedTexts(allTexts);

    const opportunityEmbedding = allEmbeddings[0];
    const vendorEmbeddings = allEmbeddings.slice(1);

    // Score each vendor
    const matches = vendors.map((vendor, i) => {
      const vendorEmbedding = vendorEmbeddings[i];
      const semanticScore = computeSemanticCapabilityScore(
        vendorEmbedding,
        opportunityEmbedding
      );
      const maritimeResult = scoreMaritimeRelevance(vendor);

      return scoreVendorForGrantWithSemantics(
        vendor,
        grant,
        semanticScore,
        maritimeResult
      );
    });

    matches.sort((a, b) => b.overallScore - a.overallScore);

    console.log(
      `[vendor-matching] Scored ${matches.length} vendors. Top score: ${matches[0]?.overallScore ?? 0}`
    );

    return NextResponse.json({ matches });
  } catch (err) {
    console.error("[vendor-matching] Error:", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
