/**
 * Fix portId values in demo tables.
 *
 * This script migrates records that have the slug (e.g., "port-freeport")
 * stored in the portId field to use the short id (e.g., "freeport").
 *
 * Usage:
 *   npx tsx src/scripts/fix-port-ids.ts
 */

import "dotenv/config";
import { prisma } from "@/lib/db/client";
import { AVAILABLE_PORTS } from "@/lib/db/tenant-config";

// Build a mapping from slug to short id
const slugToId: Record<string, string> = {};
for (const port of AVAILABLE_PORTS) {
  slugToId[port.slug] = port.id;
}

async function fixPortIds(): Promise<void> {
  console.log("\nFixing portId values in demo tables...\n");
  console.log("Port mapping:", slugToId);

  // Fix DemoPortProfile records
  console.log("\n--- DemoPortProfile ---");
  const portProfiles = await prisma.demoPortProfile.findMany();
  let profilesFixed = 0;
  let profilesDeleted = 0;
  for (const profile of portProfiles) {
    const correctId = slugToId[profile.portId];
    if (correctId && correctId !== profile.portId) {
      // Check if a record with the correct portId already exists
      const existingCorrect = await prisma.demoPortProfile.findFirst({
        where: { portId: correctId, slug: profile.slug },
      });
      if (existingCorrect) {
        // A correct record exists, we need to migrate projects and delete the old one
        console.log(`  Migrating projects from profile ${profile.id} to ${existingCorrect.id}`);
        await prisma.demoProject.updateMany({
          where: { portProfileId: profile.id },
          data: { portProfileId: existingCorrect.id },
        });
        console.log(`  Deleting duplicate profile: ${profile.portId}`);
        await prisma.demoPortProfile.delete({ where: { id: profile.id } });
        profilesDeleted++;
      } else {
        console.log(`  Fixing profile "${profile.name}": ${profile.portId} -> ${correctId}`);
        await prisma.demoPortProfile.update({
          where: { id: profile.id },
          data: { portId: correctId },
        });
        profilesFixed++;
      }
    }
  }
  console.log(`  Fixed ${profilesFixed} port profile(s), deleted ${profilesDeleted} duplicate(s)`);

  // Fix DemoProject records
  console.log("\n--- DemoProject ---");
  const projects = await prisma.demoProject.findMany();
  let projectsFixed = 0;
  for (const project of projects) {
    const correctId = slugToId[project.portId];
    if (correctId && correctId !== project.portId) {
      console.log(`  Fixing project "${project.name}": ${project.portId} -> ${correctId}`);
      await prisma.demoProject.update({
        where: { id: project.id },
        data: { portId: correctId },
      });
      projectsFixed++;
    }
  }
  console.log(`  Fixed ${projectsFixed} project(s)`);

  // Fix DemoDiscoveredGrant records if they exist
  console.log("\n--- DemoDiscoveredGrant ---");
  try {
    const grants = await prisma.demoDiscoveredGrant.findMany();
    let grantsFixed = 0;
    for (const grant of grants) {
      const correctId = slugToId[grant.portId];
      if (correctId && correctId !== grant.portId) {
        console.log(`  Fixing grant "${grant.title}": ${grant.portId} -> ${correctId}`);
        await prisma.demoDiscoveredGrant.update({
          where: { id: grant.id },
          data: { portId: correctId },
        });
        grantsFixed++;
      }
    }
    console.log(`  Fixed ${grantsFixed} grant(s)`);
  } catch {
    console.log("  (table does not exist or is empty)");
  }

  // Fix DemoPipelineGrant records if they exist
  console.log("\n--- DemoPipelineGrant ---");
  try {
    const pipelineGrants = await prisma.demoPipelineGrant.findMany();
    let pipelineFixed = 0;
    for (const pg of pipelineGrants) {
      const correctId = slugToId[pg.portId];
      if (correctId && correctId !== pg.portId) {
        console.log(`  Fixing pipeline grant: ${pg.portId} -> ${correctId}`);
        await prisma.demoPipelineGrant.update({
          where: { id: pg.id },
          data: { portId: correctId },
        });
        pipelineFixed++;
      }
    }
    console.log(`  Fixed ${pipelineFixed} pipeline grant(s)`);
  } catch {
    console.log("  (table does not exist or is empty)");
  }

  // Fix DemoPortVendor records if they exist
  console.log("\n--- DemoPortVendor ---");
  try {
    const vendors = await prisma.demoPortVendor.findMany();
    let vendorsFixed = 0;
    for (const vendor of vendors) {
      const correctId = slugToId[vendor.portId];
      if (correctId && correctId !== vendor.portId) {
        console.log(`  Fixing vendor "${vendor.name}": ${vendor.portId} -> ${correctId}`);
        await prisma.demoPortVendor.update({
          where: { id: vendor.id },
          data: { portId: correctId },
        });
        vendorsFixed++;
      }
    }
    console.log(`  Fixed ${vendorsFixed} vendor(s)`);
  } catch {
    console.log("  (table does not exist or is empty)");
  }

  console.log("\nDone!");
}

async function main() {
  try {
    await fixPortIds();
  } catch (error) {
    console.error("Fix failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();