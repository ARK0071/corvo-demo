/**
 * Shared payload size + field length guards for API routes.
 *
 * Why a separate helper:
 *   - Next.js does not enforce a request-body cap by default. A single
 *     `await request.json()` will happily buffer megabytes of attacker
 *     input into memory before the route ever sees it.
 *   - Per-route ad-hoc validation drifts. Centralizing the limits here
 *     keeps them consistent and lets us tune them in one place.
 *
 * Usage in a route:
 *
 *     const body = await readJsonBody<MyShape>(request, { maxBytes: 64_000 });
 *     const title = boundedString(body.title, "title", 200);
 *
 * Both helpers throw `ApiLimitError`; the route's catch block should map
 * that to a 413 (payload too large) or 400 (validation failure).
 */

export class ApiLimitError extends Error {
  constructor(message: string, public status: 400 | 413) {
    super(message);
    this.name = "ApiLimitError";
  }
}

// Default max body size for JSON routes. Audit-ready free-text fields
// (notes, descriptions) are capped much lower per-field, so 64KB is a
// generous overall envelope.
export const DEFAULT_MAX_JSON_BYTES = 64 * 1024;

/**
 * Read and JSON-parse a request body, refusing payloads above maxBytes.
 *
 * Reads via the body stream so we can stop early instead of buffering
 * the whole thing only to reject it after the fact.
 */
export async function readJsonBody<T = unknown>(
  request: Request,
  opts: { maxBytes?: number } = {}
): Promise<T> {
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_JSON_BYTES;

  // Trust Content-Length only as a fast-fail hint — the body could be
  // chunked or lie. We still enforce maxBytes during the read.
  const cl = request.headers.get("content-length");
  if (cl) {
    const declared = Number(cl);
    if (Number.isFinite(declared) && declared > maxBytes) {
      throw new ApiLimitError(
        `Request body exceeds ${maxBytes} bytes`,
        413
      );
    }
  }

  const body = request.body;
  if (!body) {
    // Some test clients deliver an empty body — treat as {}
    return {} as T;
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        throw new ApiLimitError(
          `Request body exceeds ${maxBytes} bytes`,
          413
        );
      }
      chunks.push(value);
    }
  } finally {
    try { reader.releaseLock(); } catch { /* ignore */ }
  }

  if (total === 0) return {} as T;

  // Concat into a single buffer and decode
  const combined = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    combined.set(c, offset);
    offset += c.byteLength;
  }
  const text = new TextDecoder("utf-8", { fatal: false }).decode(combined);

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiLimitError("Request body is not valid JSON", 400);
  }
}

/**
 * Coerce a value into a trimmed, length-capped string. Throws on oversize.
 *
 * `required: false` returns `undefined` for null/undefined/empty input
 * instead of throwing — useful for optional fields. The default is to
 * require the field.
 */
export function boundedString(
  value: unknown,
  fieldName: string,
  maxLen: number,
  opts: { required?: boolean } = {}
): string | undefined {
  const required = opts.required ?? true;
  if (value === null || value === undefined) {
    if (required) throw new ApiLimitError(`${fieldName} is required`, 400);
    return undefined;
  }
  const s = String(value).trim();
  if (s.length === 0) {
    if (required) throw new ApiLimitError(`${fieldName} is required`, 400);
    return undefined;
  }
  if (s.length > maxLen) {
    throw new ApiLimitError(
      `${fieldName} exceeds maximum length of ${maxLen} characters`,
      400
    );
  }
  return s;
}

/**
 * Map an ApiLimitError into a Response-ready { status, body } pair.
 * Returns null for non-ApiLimitError so the caller can rethrow.
 */
export function apiLimitErrorResponse(error: unknown): {
  status: number;
  body: { error: string };
} | null {
  if (error instanceof ApiLimitError) {
    return { status: error.status, body: { error: error.message } };
  }
  return null;
}
