--------------------------------------------------------------------------------
-- Operational registry: DfE 16–18 destination measures → school_1618_destinations.
-- Idempotent: ON CONFLICT (slug) DO UPDATE.
--------------------------------------------------------------------------------

INSERT INTO data_source_refresh_log (
  slug,
  domain,
  title,
  source_urls,
  review_after,
  notes,
  script_hint,
  lineage
)
VALUES (
  'dfe_1618_destinations_ingest',
  '1618_destinations',
  'DfE 16–18 destination measures — school_1618_destinations loader',
  $json$[
    {
      "label": "16–18 destination measures — publication hub",
      "url": "https://explore-education-statistics.service.gov.uk/find-statistics/16-18-destination-measures"
    },
    {
      "label": "All files ZIP (institution CSV inside data/) — DESTINATIONS_RELEASE_ZIP",
      "url": "https://content.explore-education-statistics.service.gov.uk/api/releases/785c3016-6174-49c1-960b-b39788066682/files"
    },
    {
      "label": "Institution-level destinations (example time_period 202223)",
      "path_in_zip": "data/ees_ks5_inst_202223.csv"
    },
    {
      "label": "URN scope: DISTINCT TRIM(school_code) FROM schools; intersect CSV school_urn. Loader prefers Level 3 Total headline Percentage row."
    }
  ]$json$::jsonb,
  '2027-06-01',
  $$When DfE publishes a new leavers year, add a new ZIP URL + filename pattern in load_school_1618_destinations_dfe.py (or extend discover_inst_csvs). Rerun loader; has_results_destinations refreshes after ingest.$$,
  'server/scripts/load_school_1618_destinations_dfe.py',
  $lineage${
    "publisher": "Department for Education, 16–18 destination measures (Explore Education Statistics)",
    "trust_summary": "Figures are official DfE sustained-destination percentages for students who completed 16–18 study (see methodology for the leavers year). This is not the same as Oxford/Cambridge offer counts (not published per school in this open file).",
    "db_table": "school_1618_destinations",
    "api_endpoint": "GET /api/schools/:id/destinations-1618",
    "api_to_db": "Destinations1618Panel + useDestinations1618 → schools route → destinations1618.service.js → school_1618_destinations only.",
    "loader_constants": {
      "DESTINATIONS_RELEASE_ZIP": "785c3016-6174-49c1-960b-b39788066682"
    }
  }$lineage$::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  domain        = EXCLUDED.domain,
  title         = EXCLUDED.title,
  source_urls   = EXCLUDED.source_urls,
  review_after  = EXCLUDED.review_after,
  notes         = EXCLUDED.notes,
  script_hint   = EXCLUDED.script_hint,
  lineage       = EXCLUDED.lineage,
  updated_at    = NOW();
