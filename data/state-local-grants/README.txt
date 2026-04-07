State / local grant CSVs (demo)

Place one CSV per client profile. Filename must match the profile id exactly:

  port-freeport.csv
  louisiana-gateway-port.csv
  port-of-los-angeles.csv
  lawa.csv

Profile ids are defined in src/data/profiles/index.ts (AVAILABLE_PROFILES).

Expected columns (header row; extra columns are ignored):

  title, grant_id, source_url, source_domain, discovery_tier, agency,
  funding_amount_min, funding_amount_max, match_required,
  open_date, close_date, status, level, domain_tags, eligible_entities,
  summary, confidence_score, scraped_date, notes

Dates may be ISO or common US forms (e.g. 6/1/2026). Empty cells are OK.
