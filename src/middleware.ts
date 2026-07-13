import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/api/auth",
  "/login",
  "/unauthorized",
  "/_next",
  "/favicon.ico",
  "/globe.svg",
  "/next.svg",
];

const SESSION_COOKIE_NAMES = [
  "__Secure-authjs.session-token",
  "authjs.session-token",
];

// Paths subrecipient users ARE allowed to access
const SUB_ALLOWED_PATHS = [
  "/sub",
  "/api/sub",
  "/api/attachments",
  "/api/auth",
  "/settings",
  "/api/users",
];

// Paths that are prime-only (subrecipients should NOT access)
const PRIME_ONLY_PATHS = [
  "/grants",
  "/reporting",
  "/admin",
  "/dashboard",
  "/drafting",
  "/awards",
  "/grant-match",
  "/porter-dashboard",
  "/competitive-intel",
  "/newsroom",
  "/calendar",
  "/api/pipeline",
  "/api/tasks",
  "/api/admin",
  "/api/grants",
  "/api/awards",
  "/api/chat",
  "/api/grant-match-chat",
];

function hasSessionCookie(request: NextRequest): boolean {
  return SESSION_COOKIE_NAMES.some((name) => request.cookies.has(name));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (!hasSessionCookie(request)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based routing is enforced at the API/page level since middleware
  // cannot read session data without a DB call. The withSubrecipientAuth
  // guard and page-level checks handle subrecipient route restriction.

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
