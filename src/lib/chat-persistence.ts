/**
 * Chat persistence service for Porter AI.
 *
 * Saves and loads conversation transcripts to ChatConversation / ChatMessage tables.
 * Separate from workflow state (LangGraph checkpointer in Phase 2).
 */

import { prisma } from "@/lib/db/client";

export interface SavedMessage {
  role: "user" | "assistant" | "system";
  content: string;
  toolCalls?: unknown;
}

/**
 * Create a new conversation.
 */
export async function createConversation(params: {
  userId: string;
  portProfileId: string;
  title?: string;
  pageContext?: string;
}): Promise<{ id: string; title: string } | null> {
  if (!prisma) return null;

  const conv = await prisma.chatConversation.create({
    data: {
      userId: params.userId,
      portProfileId: params.portProfileId,
      title: params.title ?? "New conversation",
      pageContext: params.pageContext,
    },
    select: { id: true, title: true },
  });

  return conv;
}

/**
 * List conversations for a user, most recent first.
 */
export async function listConversations(params: {
  userId: string;
  portProfileId: string;
  limit?: number;
}): Promise<
  Array<{
    id: string;
    title: string;
    pageContext: string | null;
    updatedAt: string;
    messageCount: number;
  }>
> {
  if (!prisma) return [];

  const convs = await prisma.chatConversation.findMany({
    where: {
      userId: params.userId,
      portProfileId: params.portProfileId,
    },
    orderBy: { updatedAt: "desc" },
    take: params.limit ?? 50,
    select: {
      id: true,
      title: true,
      pageContext: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  });

  return convs.map((c: any) => ({
    id: c.id,
    title: c.title,
    pageContext: c.pageContext,
    updatedAt: c.updatedAt?.toISOString(),
    messageCount: c._count?.messages ?? 0,
  }));
}

/**
 * Load a conversation with its messages.
 */
export async function loadConversation(params: {
  conversationId: string;
  userId: string;
}): Promise<{
  id: string;
  title: string;
  messages: SavedMessage[];
} | null> {
  if (!prisma) return null;

  const conv = await prisma.chatConversation.findFirst({
    where: {
      id: params.conversationId,
      userId: params.userId,
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          role: true,
          content: true,
          toolCalls: true,
        },
      },
    },
  });

  if (!conv) return null;

  return {
    id: conv.id,
    title: conv.title,
    messages: conv.messages.map((m: any) => ({
      role: m.role as SavedMessage["role"],
      content: m.content,
      toolCalls: m.toolCalls ?? undefined,
    })),
  };
}

/**
 * Append messages to a conversation. Creates the conversation if it doesn't exist.
 */
export async function saveMessages(params: {
  conversationId: string;
  userId: string;
  messages: SavedMessage[];
}): Promise<{ saved: number }> {
  if (!prisma || params.messages.length === 0) return { saved: 0 };

  const data = params.messages.map((m) => ({
    conversationId: params.conversationId,
    userId: m.role === "user" ? params.userId : null,
    role: m.role,
    content: m.content,
    toolCalls: m.toolCalls ?? undefined,
  }));

  const result = await prisma.chatMessage.createMany({ data });

  // Touch the conversation's updatedAt
  await prisma.chatConversation.update({
    where: { id: params.conversationId },
    data: { updatedAt: new Date() },
  });

  return { saved: result.count };
}

/**
 * Update conversation title (e.g., auto-generated from first message).
 */
export async function updateConversationTitle(params: {
  conversationId: string;
  userId: string;
  title: string;
}): Promise<boolean> {
  if (!prisma) return false;

  const result = await prisma.chatConversation.updateMany({
    where: {
      id: params.conversationId,
      userId: params.userId,
    },
    data: { title: params.title },
  });

  return result.count > 0;
}

/**
 * Delete a conversation and all its messages.
 */
export async function deleteConversation(params: {
  conversationId: string;
  userId: string;
}): Promise<boolean> {
  if (!prisma) return false;

  const result = await prisma.chatConversation.deleteMany({
    where: {
      id: params.conversationId,
      userId: params.userId,
    },
  });

  return result.count > 0;
}
