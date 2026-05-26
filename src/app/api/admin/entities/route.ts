import { NextResponse } from "next/server";
import { withRole } from "@/lib/auth/api-guard";
import { z } from "zod";
import {
  getAllProfiles,
  getProfile,
  registerProfile,
  unregisterProfile,
  isStaticProfile,
} from "@/data/profiles";
import { registerPort } from "@/lib/db/tenant-config";
import type { PortProfile } from "@/data/port-profile";

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
  const profiles = getAllProfiles();
  const entities = profiles.map(({ id, profile }) => ({
    id,
    name: profile.name,
    entityType: profile.entityType,
    classification: profile.classification,
    location: profile.location,
    isBuiltIn: isStaticProfile(id),
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

  // Register in profile system
  registerProfile(id, profile);

  // Register in tenant config (port system)
  registerPort({ id, name: profileData.name, slug: id });

  return NextResponse.json({ id, profile }, { status: 201 });
});

export const DELETE = withRole(["admin"], async (request) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
  }

  if (isStaticProfile(id)) {
    return NextResponse.json(
      { error: "Cannot delete built-in profiles" },
      { status: 403 }
    );
  }

  const removed = unregisterProfile(id);
  if (!removed) {
    return NextResponse.json({ error: "Entity not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
});
