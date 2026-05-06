import "server-only";

import { prisma } from "./client";
import { auth } from "@/lib/auth/auth";

/**
 * Get the authenticated user from the NextAuth session.
 */
export async function getAuthenticatedUser() {
  const session = await auth();
  if (!session?.user?.id) return null;

  return prisma.user.findUnique({
    where: { id: session.user.id },
  });
}

/**
 * Get user ID from NextAuth session.
 */
export async function getAuthUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id || null;
}

/**
 * Get port ID from NextAuth session (user's assigned port).
 */
export async function getAuthPortId(): Promise<string> {
  const session = await auth();
  return session?.user?.portId || "freeport";
}

/**
 * Get user role from NextAuth session.
 */
export async function getAuthRole(): Promise<string | null> {
  const session = await auth();
  return session?.user?.role || null;
}

// ---------------------------------------------------------------------------
// Backward-compatible functions (used during migration)
// ---------------------------------------------------------------------------

/**
 * @deprecated Use getAuthUserId() instead. Reads from session first, falls back to header.
 */
export function getUserIdFromRequest(headers: Headers): string | null {
  return headers.get("x-corvo-user-id") || null;
}

/**
 * @deprecated Use getAuthenticatedUser() instead.
 */
export async function getCurrentUser(headers: Headers) {
  const userId = getUserIdFromRequest(headers);
  if (!userId) return null;

  return prisma.user.findUnique({ where: { id: userId } });
}

/**
 * @deprecated Use getAuthPortId() instead.
 */
export function getPortIdFromRequest(headers: Headers): string {
  return headers.get("x-corvo-port-id") || "freeport";
}
