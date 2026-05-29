import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { AVAILABLE_PORTS, registerPort } from "@/lib/db/tenant-config";

/**
 * GET /api/ports — Returns all available ports from the database.
 * Falls back to static ports only if DB is unavailable.
 * Public endpoint (no auth required) since the port list is needed before login.
 */
export async function GET() {
  try {
    const dbProfiles = await prisma.portProfile.findMany({
      select: { slug: true, name: true },
      orderBy: { name: "asc" },
    });

    if (dbProfiles.length > 0) {
      // Register DB ports in-memory so server-side code can find them
      const knownIds = new Set(Array.from(AVAILABLE_PORTS).map((p) => p.id));
      for (const p of dbProfiles) {
        if (!knownIds.has(p.slug)) {
          registerPort({ id: p.slug, name: p.name, slug: p.slug });
        }
      }

      // Return DB profiles as the port list
      const ports = dbProfiles.map((p: { slug: string; name: string }) => ({
        id: p.slug,
        name: p.name,
        slug: p.slug,
      }));

      return NextResponse.json({ ports });
    }
  } catch {
    // DB unavailable — fall through to static ports
  }

  // Fallback: return static ports
  const ports = Array.from(AVAILABLE_PORTS).map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
  }));

  return NextResponse.json({ ports });
}
