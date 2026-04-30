import "server-only";

import { prisma } from "./client";

/**
 * Get user ID from request headers (set by "Acting as" picker)
 */
export function getUserIdFromRequest(headers: Headers): string | null {
  return headers.get("x-corvo-user-id") || null;
}

/**
 * Get current user from request headers. Returns null if no user header.
 */
export async function getCurrentUser(headers: Headers) {
  const userId = getUserIdFromRequest(headers);
  if (!userId) return null;

  return prisma.user.findUnique({ where: { id: userId } });
}

/**
 * Get port ID from request headers
 */
export function getPortIdFromRequest(headers: Headers): string {
  return headers.get("x-corvo-port-id") || "freeport";
}
