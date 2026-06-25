/**
 * Seed production port_profiles table using raw pg (bypasses Prisma connection issues).
 * Run with: npx tsx src/scripts/seed-production-profiles.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import pg from "pg";

import { lawaProfile } from "../data/profiles/lawa";
import { louisianaGatewayPortProfile } from "../data/profiles/louisiana-gateway-port";
import { burnsEngineeringProfile } from "../data/profiles/burns-engineering";
import { cteProfile } from "../data/profiles/cte";
import type { PortProfile } from "../data/port-profile";

const PROFILES: Array<{ slug: string; profile: PortProfile }> = [
  { slug: "lawa", profile: lawaProfile },
  { slug: "louisiana-gateway", profile: louisianaGatewayPortProfile },
  { slug: "burns-engineering", profile: burnsEngineeringProfile },
  { slug: "cte", profile: cteProfile },
];

const PORT_ONLY: Array<{ slug: string; name: string; entityType: string }> = [
  { slug: "freeport-mock", name: "Port Freeport", entityType: "Special district government" },
  { slug: "polestar-defense", name: "Pole Star Defense", entityType: "Private company" },
];

async function main() {
  const pool = new pg.Pool({
    host: process.env.RDS_HOST,
    port: Number(process.env.RDS_PORT) || 5432,
    database: process.env.RDS_DATABASE,
    user: process.env.RDS_USER,
    password: process.env.RDS_PASSWORD,
    ssl: { rejectUnauthorized: false },
  });
  const client = await pool.connect();

  try {
    for (const { slug, profile } of PROFILES) {
      await client.query(
        `INSERT INTO port_profiles (id, slug, name, entity_type, classification, location, characteristics, priorities, capabilities, needs, certifications, environmental_goals, community_impact, created_at, updated_at)
         VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
         ON CONFLICT (slug) DO UPDATE SET
           name = EXCLUDED.name,
           entity_type = EXCLUDED.entity_type,
           classification = EXCLUDED.classification,
           location = EXCLUDED.location,
           characteristics = EXCLUDED.characteristics,
           priorities = EXCLUDED.priorities,
           capabilities = EXCLUDED.capabilities,
           needs = EXCLUDED.needs,
           certifications = EXCLUDED.certifications,
           environmental_goals = EXCLUDED.environmental_goals,
           community_impact = EXCLUDED.community_impact,
           updated_at = NOW()`,
        [
          slug,
          profile.name,
          profile.entityType,
          profile.classification || "",
          JSON.stringify(profile.location || {}),
          JSON.stringify(profile.characteristics || {}),
          JSON.stringify(profile.priorities || []),
          JSON.stringify(profile.capabilities || []),
          JSON.stringify(profile.needs || []),
          JSON.stringify(profile.certifications || []),
          JSON.stringify(profile.environmentalGoals || []),
          JSON.stringify(profile.communityImpact || []),
        ]
      );
      console.log(`  Seeded: ${slug} - ${profile.name}`);
    }

    for (const entry of PORT_ONLY) {
      await client.query(
        `INSERT INTO port_profiles (id, slug, name, entity_type, location, characteristics, priorities, capabilities, needs, certifications, environmental_goals, community_impact, created_at, updated_at)
         VALUES (uuid_generate_v4(), $1, $2, $3, '{}', '{}', '[]', '[]', '[]', '[]', '[]', '[]', NOW(), NOW())
         ON CONFLICT (slug) DO UPDATE SET
           name = EXCLUDED.name,
           entity_type = EXCLUDED.entity_type,
           updated_at = NOW()`,
        [entry.slug, entry.name, entry.entityType]
      );
      console.log(`  Seeded: ${entry.slug} - ${entry.name} (port-only)`);
    }

    const { rows } = await client.query("SELECT slug, name FROM port_profiles ORDER BY name");
    console.log("\nProduction port_profiles now contains:");
    for (const r of rows) {
      console.log(`  ${r.slug} - ${r.name}`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
