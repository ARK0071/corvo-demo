/**
 * Debug script to inspect all port profiles and their associated data.
 * Run: npx tsx src/scripts/debug-profiles.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import pg from "pg";

const pool = new pg.Pool({
  host: process.env.RDS_HOST,
  port: parseInt(process.env.RDS_PORT || "5432"),
  database: process.env.RDS_DATABASE,
  user: process.env.RDS_USER,
  password: process.env.RDS_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

async function debug() {
  const client = await pool.connect();
  try {
    console.log("=== PORT PROFILES (production table) ===");
    const profiles = await client.query(
      `SELECT id, slug, name, entity_type, classification FROM port_profiles ORDER BY slug`
    );
    for (const p of profiles.rows) {
      console.log(`  ${p.slug} | ${p.name} | ${p.entity_type} | ${p.classification || "(none)"} | id: ${p.id}`);
    }

    console.log("\n=== DEMO PORT PROFILES ===");
    const demoProfiles = await client.query(
      `SELECT id, port_id, slug, name, entity_type, classification FROM demo_port_profiles ORDER BY slug`
    );
    for (const p of demoProfiles.rows) {
      console.log(`  ${p.slug} | ${p.name} | port_id: ${p.port_id} | ${p.entity_type} | id: ${p.id}`);
    }

    console.log("\n=== PROJECTS per profile (production) ===");
    const projects = await client.query(
      `SELECT pp.slug, pp.name as profile_name, COUNT(p.id) as project_count
       FROM port_profiles pp
       LEFT JOIN projects p ON p.port_profile_id = pp.id
       GROUP BY pp.slug, pp.name
       HAVING COUNT(p.id) > 0
       ORDER BY pp.slug`
    );
    for (const p of projects.rows) {
      console.log(`  ${p.slug} (${p.profile_name}): ${p.project_count} projects`);
    }

    console.log("\n=== DEMO PROJECTS per profile ===");
    const demoProjects = await client.query(
      `SELECT dpp.slug, dpp.name as profile_name, dpp.port_id, COUNT(dp.id) as project_count
       FROM demo_port_profiles dpp
       LEFT JOIN demo_projects dp ON dp.port_profile_id = dpp.id
       GROUP BY dpp.slug, dpp.name, dpp.port_id
       HAVING COUNT(dp.id) > 0
       ORDER BY dpp.slug`
    );
    for (const p of demoProjects.rows) {
      console.log(`  ${p.slug} (${p.profile_name}, port_id: ${p.port_id}): ${p.project_count} demo projects`);
    }

    console.log("\n=== PIPELINE GRANTS per profile (production) ===");
    const pipelineGrants = await client.query(
      `SELECT pp.slug, pp.name as profile_name, COUNT(pg.id) as grant_count
       FROM port_profiles pp
       LEFT JOIN pipeline_grants pg ON pg.port_profile_id = pp.id
       GROUP BY pp.slug, pp.name
       HAVING COUNT(pg.id) > 0
       ORDER BY pp.slug`
    );
    for (const p of pipelineGrants.rows) {
      console.log(`  ${p.slug} (${p.profile_name}): ${p.grant_count} pipeline grants`);
    }

    console.log("\n=== DEMO PIPELINE GRANTS per profile ===");
    const demoPipelineGrants = await client.query(
      `SELECT dpp.slug, dpp.name as profile_name, dpp.port_id, COUNT(dpg.id) as grant_count
       FROM demo_port_profiles dpp
       LEFT JOIN demo_pipeline_grants dpg ON dpg.port_profile_id = dpp.id
       GROUP BY dpp.slug, dpp.name, dpp.port_id
       HAVING COUNT(dpg.id) > 0
       ORDER BY dpp.slug`
    );
    for (const p of demoPipelineGrants.rows) {
      console.log(`  ${p.slug} (${p.profile_name}, port_id: ${p.port_id}): ${p.grant_count} demo pipeline grants`);
    }

    console.log("\n=== AWARDS per profile (production) ===");
    const awards = await client.query(
      `SELECT pp.slug, pp.name as profile_name, COUNT(a.id) as award_count
       FROM port_profiles pp
       LEFT JOIN awards a ON a.port_profile_id = pp.id
       GROUP BY pp.slug, pp.name
       HAVING COUNT(a.id) > 0
       ORDER BY pp.slug`
    );
    for (const p of awards.rows) {
      console.log(`  ${p.slug} (${p.profile_name}): ${p.award_count} awards`);
    }

    console.log("\n=== DEMO AWARDS per profile ===");
    const demoAwards = await client.query(
      `SELECT dpp.slug, dpp.name as profile_name, dpp.port_id, COUNT(da.id) as award_count
       FROM demo_port_profiles dpp
       LEFT JOIN demo_awards da ON da.port_profile_id = dpp.id
       GROUP BY dpp.slug, dpp.name, dpp.port_id
       HAVING COUNT(da.id) > 0
       ORDER BY dpp.slug`
    );
    for (const p of demoAwards.rows) {
      console.log(`  ${p.slug} (${p.profile_name}, port_id: ${p.port_id}): ${p.award_count} demo awards`);
    }

    console.log("\n=== TASKS per profile (production) ===");
    const tasks = await client.query(
      `SELECT pp.slug, pp.name as profile_name, COUNT(t.id) as task_count
       FROM port_profiles pp
       LEFT JOIN tasks t ON t.port_profile_id = pp.id
       GROUP BY pp.slug, pp.name
       HAVING COUNT(t.id) > 0
       ORDER BY pp.slug`
    );
    for (const p of tasks.rows) {
      console.log(`  ${p.slug} (${p.profile_name}): ${p.task_count} tasks`);
    }

    // List all projects for profiles matching "freeport" or "port-freeport"
    console.log("\n=== PROJECT DETAILS for freeport-related profiles ===");
    const freeportProjects = await client.query(
      `SELECT pp.slug, pp.name as profile_name, p.name as project_name, p.id as project_id
       FROM projects p
       JOIN port_profiles pp ON pp.id = p.port_profile_id
       WHERE pp.slug IN ('freeport', 'port-freeport', 'freeport-mock')
       ORDER BY pp.slug, p.name`
    );
    for (const p of freeportProjects.rows) {
      console.log(`  [${p.slug}] ${p.project_name}`);
    }

    console.log("\n=== DEMO PROJECT DETAILS for freeport-related profiles ===");
    const freeportDemoProjects = await client.query(
      `SELECT dpp.slug, dpp.port_id, dpp.name as profile_name, dp.name as project_name
       FROM demo_projects dp
       JOIN demo_port_profiles dpp ON dpp.id = dp.port_profile_id
       WHERE dpp.port_id IN ('freeport', 'freeport-mock', 'freeport-demo')
          OR dpp.slug IN ('freeport', 'port-freeport', 'freeport-mock')
       ORDER BY dpp.slug, dp.name`
    );
    for (const p of freeportDemoProjects.rows) {
      console.log(`  [${p.slug} / port_id: ${p.port_id}] ${p.project_name}`);
    }

  } finally {
    client.release();
    await pool.end();
  }
}

debug().catch(console.error);
