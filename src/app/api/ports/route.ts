import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

/**
 * GET /api/ports — Returns all available ports from the database.
 * No static fallback — if DB is unavailable, returns an error.
 */
export async function GET() {
  try {
    const dbProfiles = await prisma.portProfile.findMany({
      select: { slug: true, name: true },
      orderBy: { name: "asc" },
    });

    const ports = dbProfiles.map((p: { slug: string; name: string }) => ({
      id: p.slug,
      name: p.name,
      slug: p.slug,
    }));

    return NextResponse.json({ ports });
  } catch (err) {
    console.error("[/api/ports] Database error:", err);
    return NextResponse.json(
      { error: "Failed to load ports from database" },
      { status: 503 }
    );
  }
}
