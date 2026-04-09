import { NextResponse, type NextRequest } from "next/server";

/**
 * Defense-in-depth payload cap.
 *
 * Next.js (App Router) does not enforce a request body size limit by
 * default — every API route is free to `await request.json()` on
 * arbitrarily large input. Per-route caps live in src/lib/api-limits.ts,
 * but a single missed route would re-open the floodgates, so this
 * middleware enforces an absolute ceiling for every API request.
 *
 * Routes that legitimately need a larger budget (audit-package, file
 * upload, etc.) can either bypass `/api/` or be added to BYPASS_PREFIXES.
 *
 * The middleware only inspects Content-Length, which is enough to fast-
 * fail honest clients. A hostile client that lies about Content-Length
 * still gets stopped at the per-route stream-reader cap in api-limits.ts.
 */

// Hard ceiling — anything bigger than this is rejected outright.
const GLOBAL_MAX_BODY_BYTES = 2 * 1024 * 1024; // 2 MB

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Routes that may legitimately receive larger payloads (e.g. file
// uploads). Add prefixes here rather than disabling the middleware.
const BYPASS_PREFIXES: string[] = [
  // none today
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only gate API mutations — GETs do not have bodies that matter.
  if (!pathname.startsWith("/api/")) return NextResponse.next();
  if (!MUTATION_METHODS.has(request.method)) return NextResponse.next();
  if (BYPASS_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const cl = request.headers.get("content-length");
  if (cl) {
    const declared = Number(cl);
    if (Number.isFinite(declared) && declared > GLOBAL_MAX_BODY_BYTES) {
      return NextResponse.json(
        {
          error: `Request body exceeds the global ${GLOBAL_MAX_BODY_BYTES}-byte limit`,
        },
        { status: 413 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
