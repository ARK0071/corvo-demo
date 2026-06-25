/**
 * Migration script to consolidate entity profiles in DEMO tables.
 *
 * All data lives in demo_port_profiles, demo_projects, demo_pipeline_grants, etc.
 *
 * Steps:
 *   1. Rename "louisiana-gateway" profile to "Louisiana Gateway Port"
 *   2. Delete "louisiana-gateway-port" profile (if exists)
 *   3. Delete "freeport-demo" profile and cascade its data
 *   4. Move projects from "port-freeport" (port_id: freeport) to "freeport-mock"
 *   5. Move pipeline grants from "port-freeport" to "freeport-mock"
 *   6. Move awards (+ budget categories, expenses, etc.) from "port-freeport" to "freeport-mock"
 *   7. Rename "freeport-mock" profile name to "Port Freeport"
 *
 * Run: npx tsx src/scripts/migrate-consolidate-profiles.ts
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

async function migrate() {
  const client = await pool.connect();

  try {
    console.log("=== Profile Consolidation Migration (demo tables) ===\n");

    // ─── 1. Rename "louisiana-gateway" to "Louisiana Gateway Port" ───
    console.log("1. Renaming 'louisiana-gateway' to 'Louisiana Gateway Port'...");
    const lgRes = await client.query(
      `UPDATE demo_port_profiles SET name = 'Louisiana Gateway Port' WHERE slug = 'louisiana-gateway' RETURNING id, name`
    );
    console.log(lgRes.rowCount ? `   ✓ Updated: ${lgRes.rows[0].name}` : "   - Not found");

    // ─── 2. Delete "louisiana-gateway-port" if it exists ───
    console.log("\n2. Deleting 'louisiana-gateway-port' profile...");
    const lgpRes = await client.query(
      `SELECT id FROM demo_port_profiles WHERE slug = 'louisiana-gateway-port'`
    );
    if (lgpRes.rows.length > 0) {
      const lgpId = lgpRes.rows[0].id;
      // Delete cascade children first
      for (const table of ["demo_projects", "demo_pipeline_grants", "demo_grant_drafts", "demo_awards"]) {
        await client.query(`DELETE FROM ${table} WHERE port_profile_id = $1`, [lgpId]);
      }
      await client.query(`DELETE FROM demo_port_profiles WHERE id = $1`, [lgpId]);
      console.log("   ✓ Deleted");
    } else {
      console.log("   - Not found in DB");
    }

    // ─── 3. Delete "freeport-demo" and cascade ───
    console.log("\n3. Deleting 'freeport-demo' profile and all associated data...");
    const fdRes = await client.query(
      `SELECT id, port_id FROM demo_port_profiles WHERE slug = 'freeport-demo'`
    );
    if (fdRes.rows.length > 0) {
      const fdId = fdRes.rows[0].id;
      const fdPortId = fdRes.rows[0].port_id;

      // Delete data referencing awards first (deep cascade)
      const awardIds = await client.query(
        `SELECT id FROM demo_awards WHERE port_profile_id = $1`, [fdId]
      );
      for (const award of awardIds.rows) {
        for (const child of [
          "demo_corrective_action_plans", "demo_audit_findings",
          "demo_compliance_checklist_items", "demo_compliance_checklists",
          "demo_subrecipient_reports", "demo_subrecipients",
          "demo_closeout_checklists", "demo_scheduled_reports",
          "demo_budget_modifications", "demo_drawdown_requests",
          "demo_expenses", "demo_match_ledger", "demo_budget_categories",
        ]) {
          try {
            await client.query(`DELETE FROM ${child} WHERE award_id = $1`, [award.id]);
          } catch { /* table might not have award_id */ }
        }
      }

      // Delete main tables
      for (const table of ["demo_awards", "demo_grant_drafts", "demo_pipeline_grants", "demo_projects"]) {
        const r = await client.query(`DELETE FROM ${table} WHERE port_profile_id = $1`, [fdId]);
        console.log(`   ${table}: deleted ${r.rowCount} row(s)`);
      }

      // Delete by port_id for tables that use port_id instead
      for (const table of ["demo_discovered_grants"]) {
        try {
          const r = await client.query(`DELETE FROM ${table} WHERE port_id = $1`, [fdPortId]);
          console.log(`   ${table}: deleted ${r.rowCount} row(s)`);
        } catch { /* ignore */ }
      }

      await client.query(`DELETE FROM demo_port_profiles WHERE id = $1`, [fdId]);
      console.log("   ✓ Deleted freeport-demo profile");
    } else {
      console.log("   - Not found in DB");
    }

    // ─── 4. Resolve profile IDs ───
    console.log("\n4. Resolving Port Freeport profile IDs...");

    const portFreeport = await client.query(
      `SELECT id, slug, name, entity_type, port_id FROM demo_port_profiles WHERE slug = 'port-freeport'`
    );
    const freeportMock = await client.query(
      `SELECT id, slug, name, entity_type, port_id FROM demo_port_profiles WHERE slug = 'freeport-mock'`
    );

    const src = portFreeport.rows[0];
    const dst = freeportMock.rows[0];

    if (src) console.log(`   source:  ${src.slug} | ${src.name} | ${src.entity_type} | port_id: ${src.port_id} | id: ${src.id}`);
    else console.log("   source:  port-freeport NOT FOUND");

    if (dst) console.log(`   dest:    ${dst.slug} | ${dst.name} | ${dst.entity_type} | port_id: ${dst.port_id} | id: ${dst.id}`);
    else console.log("   dest:    freeport-mock NOT FOUND");

    if (!dst) {
      console.error("\n❌ freeport-mock profile not found! Aborting.");
      return;
    }

    // ─── 5. Move projects from port-freeport to freeport-mock ───
    if (src) {
      console.log(`\n5. Moving data from '${src.slug}' → '${dst.slug}'...`);

      // Move projects
      let r = await client.query(
        `UPDATE demo_projects SET port_profile_id = $1, port_id = $2 WHERE port_profile_id = $3`,
        [dst.id, dst.port_id, src.id]
      );
      console.log(`   demo_projects: moved ${r.rowCount} row(s)`);

      // Move pipeline grants
      r = await client.query(
        `UPDATE demo_pipeline_grants SET port_profile_id = $1, port_id = $2 WHERE port_profile_id = $3`,
        [dst.id, dst.port_id, src.id]
      );
      console.log(`   demo_pipeline_grants: moved ${r.rowCount} row(s)`);

      // Move grant drafts
      r = await client.query(
        `UPDATE demo_grant_drafts SET port_profile_id = $1, port_id = $2 WHERE port_profile_id = $3`,
        [dst.id, dst.port_id, src.id]
      );
      console.log(`   demo_grant_drafts: moved ${r.rowCount} row(s)`);

      // Move awards and all their children (budget_categories, expenses, etc. reference award_id, not port_profile_id directly)
      // But awards also have port_id and port_profile_id
      r = await client.query(
        `UPDATE demo_awards SET port_profile_id = $1, port_id = $2 WHERE port_profile_id = $3`,
        [dst.id, dst.port_id, src.id]
      );
      console.log(`   demo_awards: moved ${r.rowCount} row(s)`);

      // Update port_id on award children (they track port_id independently)
      for (const childTable of [
        "demo_budget_categories", "demo_match_ledger", "demo_expenses",
        "demo_drawdown_requests", "demo_budget_modifications",
        "demo_scheduled_reports", "demo_closeout_checklists",
        "demo_subrecipients", "demo_subrecipient_reports",
        "demo_compliance_checklists", "demo_compliance_checklist_items",
        "demo_audit_findings", "demo_corrective_action_plans",
      ]) {
        try {
          r = await client.query(
            `UPDATE ${childTable} SET port_id = $1 WHERE port_id = $2`,
            [dst.port_id, src.port_id]
          );
          if (r.rowCount && r.rowCount > 0) {
            console.log(`   ${childTable}: updated port_id on ${r.rowCount} row(s)`);
          }
        } catch {
          // Table might not exist or not have port_id
        }
      }

      // Move discovered_grants by port_id
      r = await client.query(
        `UPDATE demo_discovered_grants SET port_id = $1 WHERE port_id = $2`,
        [dst.port_id, src.port_id]
      );
      if (r.rowCount && r.rowCount > 0) {
        console.log(`   demo_discovered_grants: moved ${r.rowCount} row(s)`);
      }
    } else {
      console.log("\n5. No 'port-freeport' profile found — skipping move.");
    }

    // ─── 6. Rename freeport-mock to "Port Freeport" ───
    console.log("\n6. Renaming freeport-mock to 'Port Freeport'...");
    const renameRes = await client.query(
      `UPDATE demo_port_profiles SET name = 'Port Freeport' WHERE slug = 'freeport-mock' RETURNING name`
    );
    console.log(renameRes.rowCount ? `   ✓ Renamed to: ${renameRes.rows[0].name}` : "   - Not found");

    // ─── Summary ───
    console.log("\n=== Summary ===");
    const remaining = await client.query(
      `SELECT slug, name, port_id, entity_type FROM demo_port_profiles ORDER BY slug`
    );
    console.log("\nAll remaining demo profiles:");
    for (const p of remaining.rows) {
      console.log(`  ${p.slug} | ${p.name} | port_id: ${p.port_id} | ${p.entity_type}`);
    }

    // Verify freeport-mock data
    if (dst) {
      const counts = await client.query(`
        SELECT
          (SELECT COUNT(*) FROM demo_projects WHERE port_profile_id = $1) as projects,
          (SELECT COUNT(*) FROM demo_pipeline_grants WHERE port_profile_id = $1) as pipeline_grants,
          (SELECT COUNT(*) FROM demo_awards WHERE port_profile_id = $1) as awards
      `, [dst.id]);
      const c = counts.rows[0];
      console.log(`\nfreeport-mock data after migration:`);
      console.log(`  Projects:        ${c.projects}`);
      console.log(`  Pipeline Grants: ${c.pipeline_grants}`);
      console.log(`  Awards:          ${c.awards}`);
    }

    console.log("\n⚠ The 'port-freeport' profile is still in the DB (empty).");
    console.log("  Delete it manually after verifying data moved correctly.");

  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);
