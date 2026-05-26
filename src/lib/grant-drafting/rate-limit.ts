/**
 * Simple in-memory rate limiter for grant drafting API endpoints.
 * Limits per-user generation calls to prevent runaway costs.
 */

import type { RateLimitResult } from "./types";

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

// Per-user rate limit: max N calls per hour
const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_GENERATIONS_PER_HOUR = 10;
const MAX_RESEARCH_PER_HOUR = 20;
const MAX_SECTION_REGEN_PER_HOUR = 30;

const buckets = new Map<string, RateLimitEntry>();

function checkLimit(key: string, maxCalls: number): RateLimitResult {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: maxCalls - 1, resetAt: new Date(now + WINDOW_MS) };
  }

  if (entry.count >= maxCalls) {
    return { allowed: false, remaining: 0, resetAt: new Date(entry.windowStart + WINDOW_MS) };
  }

  entry.count++;
  return { allowed: true, remaining: maxCalls - entry.count, resetAt: new Date(entry.windowStart + WINDOW_MS) };
}

export function checkGenerationRateLimit(userId: string): RateLimitResult {
  return checkLimit(`gen:${userId}`, MAX_GENERATIONS_PER_HOUR);
}

export function checkResearchRateLimit(userId: string): RateLimitResult {
  return checkLimit(`research:${userId}`, MAX_RESEARCH_PER_HOUR);
}

export function checkSectionRegenRateLimit(userId: string): RateLimitResult {
  return checkLimit(`regen:${userId}`, MAX_SECTION_REGEN_PER_HOUR);
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of buckets.entries()) {
    if (now - entry.windowStart > WINDOW_MS * 2) {
      buckets.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean every 5 minutes
