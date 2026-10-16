import { withAuth } from "@/lib/auth/api-guard";
import { resolvePortProfileId } from "@/lib/db/tenant-config.server";
import {
  createConversation,
  listConversations,
  saveMessages,
  loadConversation,
  updateConversationTitle,
  deleteConversation,
} from "@/lib/chat-persistence";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/porter-chat/conversations
 * List conversations or load a specific one (?id=xxx)
 */
export const GET = withAuth(async (request: NextRequest, { user }) => {
  const portProfileId = await resolvePortProfileId(request.headers);
  if (!portProfileId) {
    return NextResponse.json({ error: "No port profile." }, { status: 400 });
  }

  const url = new URL(request.url);
  const conversationId = url.searchParams.get("id");

  if (conversationId) {
    const conv = await loadConversation({
      conversationId,
      userId: user.id,
    });
    if (!conv) {
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 }
      );
    }
    return NextResponse.json(conv);
  }

  const limit = parseInt(url.searchParams.get("limit") ?? "50");
  const conversations = await listConversations({
    userId: user.id,
    portProfileId,
    limit,
  });
  return NextResponse.json({ conversations });
});

/**
 * POST /api/porter-chat/conversations
 * Create a new conversation or save messages to an existing one.
 *
 * Body: { action: "create", title?, pageContext? }
 *    or { action: "save", conversationId, messages: [...] }
 *    or { action: "rename", conversationId, title }
 *    or { action: "delete", conversationId }
 */
export const POST = withAuth(async (request: NextRequest, { user }) => {
  const portProfileId = await resolvePortProfileId(request.headers);
  if (!portProfileId) {
    return NextResponse.json({ error: "No port profile." }, { status: 400 });
  }

  const body = await request.json();
  const { action } = body;

  switch (action) {
    case "create": {
      const conv = await createConversation({
        userId: user.id,
        portProfileId,
        title: body.title,
        pageContext: body.pageContext,
      });
      return NextResponse.json(conv);
    }

    case "save": {
      if (!body.conversationId || !Array.isArray(body.messages)) {
        return NextResponse.json(
          { error: "conversationId and messages required." },
          { status: 400 }
        );
      }
      const result = await saveMessages({
        conversationId: body.conversationId,
        userId: user.id,
        messages: body.messages,
      });
      return NextResponse.json(result);
    }

    case "rename": {
      if (!body.conversationId || !body.title) {
        return NextResponse.json(
          { error: "conversationId and title required." },
          { status: 400 }
        );
      }
      const ok = await updateConversationTitle({
        conversationId: body.conversationId,
        userId: user.id,
        title: body.title,
      });
      return NextResponse.json({ success: ok });
    }

    case "delete": {
      if (!body.conversationId) {
        return NextResponse.json(
          { error: "conversationId required." },
          { status: 400 }
        );
      }
      const ok = await deleteConversation({
        conversationId: body.conversationId,
        userId: user.id,
      });
      return NextResponse.json({ success: ok });
    }

    default:
      return NextResponse.json(
        { error: `Unknown action: ${action}` },
        { status: 400 }
      );
  }
});
