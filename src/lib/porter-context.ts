/**
 * Request-scoped context for Porter AI tool executions.
 *
 * Uses AsyncLocalStorage so tools called during streamText()
 * can access the authenticated user and tenant without threading
 * parameters through every function.
 */

import { AsyncLocalStorage } from "async_hooks";

export interface PorterToolContext {
  userId: string;
  portId: string;
  portProfileId?: string;
  userRole: string;
}

const storage = new AsyncLocalStorage<PorterToolContext>();

/**
 * Run an async function with Porter context available to all tools.
 */
export function runWithPorterContext<T>(
  ctx: PorterToolContext,
  fn: () => Promise<T>
): Promise<T> {
  return storage.run(ctx, fn);
}

/**
 * Get the current Porter context from within a tool execution.
 * Throws if called outside of a Porter request context.
 */
export function getPorterContext(): PorterToolContext {
  const ctx = storage.getStore();
  if (!ctx) {
    throw new Error(
      "[porter] getPorterContext() called outside of runWithPorterContext()"
    );
  }
  return ctx;
}

/**
 * Get context or return null if not in a Porter request.
 */
export function getPorterContextOrNull(): PorterToolContext | null {
  return storage.getStore() ?? null;
}
