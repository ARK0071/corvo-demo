import { NextRequest, NextResponse } from "next/server";
import { auth } from "./auth";

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "AuthError";
  }
}

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  portId: string;
  title: string;
  active: boolean;
  subrecipientId?: string | null;
}

type AuthenticatedHandler = (
  request: NextRequest,
  context: { user: AuthUser; params?: Record<string, string> }
) => Promise<NextResponse | Response>;

/**
 * Wrap an API route handler with authentication.
 * Middleware already blocks unauthenticated requests, but this provides
 * typed access to the user and a safety net for direct API calls.
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (
    request: NextRequest,
    context?: { params?: Promise<Record<string, string>> }
  ) => {
    try {
      const session = await auth();

      if (!session?.user?.id) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }

      if (!session.user.active) {
        return NextResponse.json(
          { error: "Account deactivated" },
          { status: 403 }
        );
      }

      const user: AuthUser = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
        portId: session.user.portId,
        title: session.user.title,
        active: session.user.active,
        subrecipientId: session.user.subrecipientId,
      };

      const params = context?.params ? await context.params : undefined;
      return handler(request, { user, params });
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.statusCode }
        );
      }
      throw error;
    }
  };
}

/**
 * Wrap an API route handler with role-based authorization.
 */
export function withRole(roles: string[], handler: AuthenticatedHandler) {
  return withAuth(async (request, context) => {
    if (!roles.includes(context.user.role)) {
      return NextResponse.json(
        { error: `Requires one of: ${roles.join(", ")}` },
        { status: 403 }
      );
    }
    return handler(request, context);
  });
}

/**
 * Wrap an API route handler with subrecipient authentication.
 * Ensures the user has role "subrecipient" and a linked subrecipientId.
 */
export function withSubrecipientAuth(handler: AuthenticatedHandler) {
  return withAuth(async (request, context) => {
    if (context.user.role !== "subrecipient") {
      return NextResponse.json(
        { error: "Subrecipient access required" },
        { status: 403 }
      );
    }
    if (!context.user.subrecipientId) {
      return NextResponse.json(
        { error: "No subrecipient linked to this account" },
        { status: 403 }
      );
    }
    return handler(request, context);
  });
}
