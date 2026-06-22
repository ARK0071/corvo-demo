import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import {
  generateDraftStreaming,
  checkGenerationRateLimit,
  type GenerateDraftRequest,
  type DraftStreamEvent,
  type ResearchEntityProfile,
  type GrantRequirementsResearch,
  type EnrichedForm,
  type UserGuidance,
} from "@/lib/grant-drafting";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  // ─── Auth ───
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ─── Rate Limit ───
  const rateLimit = checkGenerationRateLimit(session.user.id);
  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({
        error: "Rate limit exceeded. Try again later.",
        remaining: rateLimit.remaining,
        resetAt: rateLimit.resetAt.toISOString(),
      }),
      { status: 429, headers: { "Content-Type": "application/json" } },
    );
  }

  // ─── API Key ───
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const body = await req.json();

    // Validate required fields
    if (!body.entityProfile) {
      return new Response(
        JSON.stringify({ error: "Entity profile is required. Complete the research phase first." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const entityProfile: ResearchEntityProfile = body.entityProfile;
    const portName = body.portName || entityProfile.name;

    // Build sections from request or generate defaults
    const reqSections = body.grantRequirements?.sections;
    const hasSections = Array.isArray(reqSections) && reqSections.length > 0;

    const applicationSections = hasSections
      ? reqSections.map((s: { id?: string; title: string; description: string; maxWords?: number; weight?: number; evaluationCriteria?: string[]; requiredElements?: string[] }) => ({
          title: s.title,
          description: s.description,
          maxWords: s.maxWords || 5000,
          weight: s.weight || Math.round(100 / reqSections.length),
          evaluationCriteria: s.evaluationCriteria || [],
          requiredElements: s.requiredElements || [],
        }))
      : [
          { title: "Project Narrative", description: "Describe the proposed project, its goals, and how it addresses the program objectives.", maxWords: 5000, weight: 30, evaluationCriteria: ["Project merit", "Alignment with program goals"], requiredElements: [] },
          { title: "Statement of Need", description: "Explain why this project is needed, including data on current conditions and deficiencies.", maxWords: 3000, weight: 20, evaluationCriteria: ["Demonstrated need", "Supporting data"], requiredElements: [] },
          { title: "Project Budget & Cost Effectiveness", description: "Provide a detailed budget and demonstrate cost effectiveness of the proposed project.", maxWords: 2000, weight: 20, evaluationCriteria: ["Budget reasonableness", "Cost effectiveness"], requiredElements: [] },
          { title: "Organizational Capability", description: "Demonstrate the applicant's capacity to successfully manage and complete the project.", maxWords: 2000, weight: 15, evaluationCriteria: ["Past performance", "Staff qualifications", "Management plan"], requiredElements: [] },
          { title: "Project Schedule & Milestones", description: "Provide a realistic project timeline with key milestones and deliverables.", maxWords: 1500, weight: 15, evaluationCriteria: ["Feasibility of timeline", "Clear milestones"], requiredElements: [] },
        ];

    const grantRequirements: GrantRequirementsResearch = {
      applicationSections,
      costShareRequired: body.grantRequirements?.costShareRequired ?? false,
      costSharePercentage: body.grantRequirements?.costShareMinimum || body.grantRequirements?.costSharePercentage || 0,
      maxAward: body.grantRequirements?.maxAward || 0,
      eligibleApplicants: body.grantRequirements?.eligibleApplicants || [],
      submissionDeadline: body.grantRequirements?.submissionDeadline || body.grantRequirements?.applicationDeadline || "",
      source: body.grantRequirements?.source || "ai-estimated",
    };

    const forms: EnrichedForm[] = (body.grantRequirements?.requiredAttachments || body.forms || []).map(
      (f: { id?: string; number?: string; name: string; description?: string; notes?: string; required?: boolean; url?: string; family?: string; commonlyRequired?: boolean; requiredLevel?: string }) => ({
        id: f.id || (f.name || "").toLowerCase().replace(/[^a-z0-9]/g, "-"),
        number: f.number || "",
        name: f.name,
        description: f.description || f.notes || "",
        url: f.url || "",
        family: f.family || "",
        commonlyRequired: f.commonlyRequired ?? true,
        requiredLevel: f.requiredLevel || "required",
        notes: f.notes || f.description || "",
        required: f.required !== false,
      }),
    );

    const userGuidance: UserGuidance | undefined = body.userGuidance || undefined;

    // Flatten web sources for citation in draft generation
    const webSources: { title: string; url: string }[] = body.webSources || [];

    const genRequest: GenerateDraftRequest = {
      grantId: body.grantId || "unknown",
      grantTitle: body.grantTitle || body.grantRequirements?.programName || "Grant Application",
      entityProfile,
      grantRequirements,
      forms,
      grantDetails: body.grantDetails || null,
      userGuidance,
      portName,
      webSources,
    };

    // ─── Check if client wants streaming ───
    const wantsStreaming = req.headers.get("accept")?.includes("text/event-stream");

    if (wantsStreaming) {
      // SSE streaming response
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const sendEvent = (event: DraftStreamEvent) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          };

          let completedCount = 0;
          const totalCount = genRequest.grantRequirements.applicationSections.length;

          const heartbeatInterval = setInterval(() => {
            sendEvent({ type: "heartbeat", completedCount, totalCount });
          }, 10_000);

          const originalSendEvent = (event: DraftStreamEvent) => {
            if (event.type === "section_complete") completedCount++;
            sendEvent(event);
          };

          try {
            await generateDraftStreaming(genRequest, originalSendEvent);
          } catch (error) {
            sendEvent({
              type: "error",
              message: error instanceof Error ? error.message : "Generation failed",
            });
          } finally {
            clearInterval(heartbeatInterval);
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "X-RateLimit-Remaining": String(rateLimit.remaining),
        },
      });
    }

    // ─── Non-streaming response ───
    const { generateDraft } = await import("@/lib/grant-drafting");
    const response = await generateDraft(genRequest);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-RateLimit-Remaining": String(rateLimit.remaining),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    console.error("Grant draft error:", error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
