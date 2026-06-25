import { NextResponse } from "next/server";
import { withRole } from "@/lib/auth/api-guard";
import { z } from "zod";
import {
  getAllProfiles,
  getProfile,
  registerProfile,
  unregisterProfile,
  ensureProfilesLoaded,
} from "@/data/profiles";
import { registerPort, unregisterPort } from "@/lib/db/tenant-config";
import { prisma } from "@/lib/db/client";
import type { PortProfile } from "@/data/port-profile";
import { embedText, buildProfileEmbeddingText } from "@/lib/embeddings";
import * as fs from "fs";
import * as path from "path";

const createEntitySchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "ID must be lowercase alphanumeric with hyphens"),
  name: z.string().min(1),
  entityType: z.string().min(1),
  classification: z.string().min(1),
  location: z.object({
    city: z.string().min(1),
    state: z.string().min(1),
    stateCode: z.string().min(1).max(2),
    county: z.string().min(1),
    region: z.string().min(1),
  }),
  characteristics: z.object({
    cargoTypes: z.array(z.string()).default([]),
    annualTonnage: z.number().optional(),
    employeeCount: z.number().optional(),
    operatingBudget: z.number().optional(),
  }),
  priorities: z.array(z.string()).default([]),
  capabilities: z.array(z.string()).default([]),
  needs: z.array(z.string()).default([]),
  certifications: z.array(z.string()).default([]),
  environmentalGoals: z.array(z.string()).default([]),
  communityImpact: z.array(z.string()).default([]),
});

export const GET = withRole(["admin"], async () => {
  await ensureProfilesLoaded();

  // Merge in-memory profiles with DB-persisted entities
  const inMemory = getAllProfiles();
  const inMemoryIds = new Set(inMemory.map(({ id }) => id));

  // Load dynamic entities from DB
  const dbProfiles = await prisma.portProfile.findMany({
    select: { slug: true, name: true, entityType: true, classification: true, location: true },
    orderBy: { name: "asc" },
  });

  // Re-register DB profiles in memory (in case server restarted)
  for (const p of dbProfiles) {
    if (!inMemoryIds.has(p.slug)) {
      registerPort({ id: p.slug, name: p.name, slug: p.slug });
      registerProfile(p.slug, {
        name: p.name,
        entityType: p.entityType,
        classification: p.classification || "",
        location: (p.location as PortProfile["location"]) || { city: "", state: "", stateCode: "", county: "", region: "" },
        characteristics: { cargoTypes: [], annualTonnage: 0, employeeCount: 0, operatingBudget: 0 },
        priorities: [],
        capabilities: [],
        needs: [],
        certifications: [],
        environmentalGoals: [],
        communityImpact: [],
      });
    }
  }

  // Re-fetch after hydration
  const allProfiles = getAllProfiles();
  const entities = allProfiles.map(({ id, profile }) => ({
    id,
    name: profile.name,
    entityType: profile.entityType,
    classification: profile.classification,
    location: profile.location,
    isBuiltIn: false,
  }));
  return NextResponse.json({ entities });
});

export const POST = withRole(["admin"], async (request) => {
  const body = await request.json();
  const parsed = createEntitySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Check if ID already exists
  if (getProfile(parsed.data.id)) {
    return NextResponse.json(
      { error: "An entity with this ID already exists" },
      { status: 409 }
    );
  }

  const { id, ...profileData } = parsed.data;

  const profile: PortProfile = {
    name: profileData.name,
    entityType: profileData.entityType,
    classification: profileData.classification,
    location: profileData.location,
    characteristics: profileData.characteristics,
    priorities: profileData.priorities,
    capabilities: profileData.capabilities,
    needs: profileData.needs,
    certifications: profileData.certifications,
    environmentalGoals: profileData.environmentalGoals,
    communityImpact: profileData.communityImpact,
  };

  // Persist to database
  try {
    await prisma.portProfile.create({
      data: {
        slug: id,
        name: profileData.name,
        entityType: profileData.entityType,
        classification: profileData.classification,
        location: profileData.location as object,
        characteristics: profileData.characteristics as object,
        priorities: profileData.priorities,
        capabilities: profileData.capabilities,
        needs: profileData.needs,
        certifications: profileData.certifications,
        environmentalGoals: profileData.environmentalGoals,
        communityImpact: profileData.communityImpact,
      },
    });
  } catch (dbErr) {
    // slug unique constraint => already exists in DB
    if ((dbErr as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "An entity with this ID already exists in the database" }, { status: 409 });
    }
    console.error("[entities] DB persist error:", dbErr);
    // Continue — in-memory registration still works
  }

  // Register in-memory profile system
  registerProfile(id, profile);

  // Register in tenant config (port system)
  registerPort({ id, name: profileData.name, slug: id });

  // Generate profile embedding in background (non-blocking)
  if (process.env.OPENAI_API_KEY) {
    const embeddingsDir = path.join(process.cwd(), "src/data/embeddings/profiles", id);
    const profileText = buildProfileEmbeddingText(profile);
    if (profileText.trim()) {
      embedText(profileText)
        .then((vector) => {
          fs.mkdirSync(embeddingsDir, { recursive: true });
          fs.writeFileSync(
            path.join(embeddingsDir, "profile-embedding.json"),
            JSON.stringify({ profileId: id, text: profileText, vector }, null, 2)
          );
          console.log(`[entities] Generated profile embedding for ${id}`);
        })
        .catch((err) => {
          console.error(`[entities] Failed to generate profile embedding for ${id}:`, err);
        });
    }
  }

  return NextResponse.json({ id, profile }, { status: 201 });
});

export const DELETE = withRole(["admin"], async (request) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
  }

  const removed = unregisterProfile(id);
  unregisterPort(id);

  // Also remove from DB
  try {
    await prisma.portProfile.deleteMany({ where: { slug: id } });
  } catch {
    // Ignore DB errors — might not have been persisted
  }

  if (!removed) {
    return NextResponse.json({ error: "Entity not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
});
