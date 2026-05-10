import { auth } from "@/lib/auth/auth";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/api/auth",
  "/login",
  "/unauthorized",
  "/_next",
  "/favicon.ico",
  "/globe.svg",
  "/next.svg",
];

const ADMIN_PATHS = ["/admin", "/api/admin"];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Skip public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // No session — redirect pages to login, return 401 for API
  if (!req.auth) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check if user account is active
  if (!req.auth.user?.active) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Account deactivated" },
        { status: 403 }
      );
    }
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  // Admin routes — check role
  if (ADMIN_PATHS.some((p) => pathname.startsWith(p))) {
    if (req.auth.user?.role !== "admin") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Admin access required" },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
