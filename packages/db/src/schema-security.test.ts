import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const schemaTargets = [
  {
    label: "schema.sql",
    sql: readSql("schema.sql")
  },
  {
    label: "0001_initial_ai_control.sql",
    sql: readSql("migrations/0001_initial_ai_control.sql")
  }
];
const catalogCheck = readSql("verification/rls-catalog-check.sql").toLowerCase();
const providerSimRuntimeCheck = readSql(
  "verification/provider-sim-runtime-check.sql"
).toLowerCase();
const repositorySource = readFileSync(
  resolve(process.cwd(), "src/ai-control-repository.ts"),
  "utf8"
);

const ownerScopedTables = [
  "provider_capability_versions",
  "generation_run_events",
  "scene_specs",
  "validation_reports",
  "cost_ledger_entries",
  "rights_manifest_entries",
  "export_manifests"
];

const ledgerTables = [
  "generation_run_events",
  "validation_reports",
  "cost_ledger_entries",
  "rights_manifest_entries"
];

describe.each(schemaTargets)("Supabase schema security harness: $label", ({ sql }) => {
  const statements = toStatements(sql);
  const normalized = statements.join(" ");

  it("defines all production-readiness persistence tables", () => {
    for (const table of ownerScopedTables) {
      expect(
        statements.some((statement) => statement.startsWith(`create table if not exists ${table}`))
      ).toBe(true);
    }
  });

  it("enables RLS and table-specific owner policies on production-readiness tables", () => {
    for (const table of ownerScopedTables) {
      expect(statements).toContain(`alter table ${table} enable row level security`);

      const policy = statements.find((statement) =>
        statement.startsWith(`create policy ${table}_owner_all on ${table}`)
      );

      expect(policy).toBeDefined();
      expect(policy).toContain("using (owns_project(project_id))");
      expect(policy).toContain("with check (owns_project(project_id))");
    }
  });

  it("keeps validation, cost, and rights ledgers out of broad update/delete grants", () => {
    expect(normalized).toContain(
      "revoke all on all tables in schema public from anon, authenticated"
    );

    const broadGrants = statements.filter(
      (statement) =>
        statement.startsWith("grant") &&
        (/\bupdate\b/.test(statement) || /\bdelete\b/.test(statement))
    );

    for (const table of ledgerTables) {
      expect(
        broadGrants.some((statement) => grantMentionsTable(statement, table))
      ).toBe(false);
    }
  });

  it("keeps validation, cost, and rights ledgers append-oriented for authenticated users", () => {
    const ledgerGrant = statements.find(
      (statement) =>
        statement.startsWith("grant select, insert on") &&
        ledgerTables.every((table) => grantMentionsTable(statement, table))
    );

    expect(ledgerGrant).toBeDefined();
    expect(ledgerGrant).not.toMatch(/\bupdate\b/);
    expect(ledgerGrant).not.toMatch(/\bdelete\b/);
  });

  it("does not include destructive migration statements", () => {
    expect(normalized).not.toMatch(/\bdrop\s+table\b/);
    expect(normalized).not.toMatch(/\btruncate\s+table\b/);
    expect(normalized).not.toMatch(/\bdelete\s+from\b/);
  });

  it("keeps Clerk JWT subject as the project owner trust boundary", () => {
    expect(normalized).toContain("request.jwt.claims");
    expect(normalized).toContain("->> 'sub'");
    expect(normalized).toContain("owner_id = requesting_user_id()");
  });

  it("wraps adviser decision audit and generation queueing in one RPC", () => {
    expect(normalized).toContain(
      "create or replace function record_ai_decision_and_queue_generation_run"
    );
    expect(normalized).toContain("returns generation_runs");
    expect(normalized).toContain("security invoker");
    expect(normalized).toContain("p_decision not in ('accepted', 'edited')");
    expect(normalized).toContain("p_trigger_source <> 'approved-suggestion'");
    expect(normalized).toContain("p_status <> 'queued'");
    expect(normalized).toContain("p_trigger_mode = 'off'");
    expect(normalized).toContain("p_retry_count <> 0");
    expect(normalized).toContain("p_started_at is not null or p_completed_at is not null");
    expect(normalized).toContain("provider_key = p_provider_key");
    expect(normalized).toContain("model_key = p_model_key");
    expect(normalized).toContain("lifecycle_status = 'active'");
    expect(normalized).toContain("commercial_use_allowed = true");
    expect(normalized).toContain("verified_expires_at >= now()");
    expect(normalized).toContain("scene_id = p_scene_id");
    expect(normalized).toContain("requesting_user_id()");
    expect(normalized).toContain("update ai_suggestions");
    expect(normalized).toContain("insert into generation_runs");
    expect(normalized).toContain("on conflict do nothing");
    expect(normalized).toContain("grant execute on function record_ai_decision_and_queue_generation_run");
  });

  it("pins provider catalog lifecycle keys before generation runs can be queued", () => {
    expect(normalized).toContain("provider_capability_id text not null");
    expect(normalized).toContain("provider_key text not null");
    expect(normalized).toContain("model_key text not null");
    expect(normalized).toContain(
      "lifecycle_status text not null default 'active' check (lifecycle_status in ('active', 'stale', 'deprecated', 'disabled'))"
    );
    expect(normalized).toContain("terms_risk text not null default 'medium'");
    expect(normalized).toContain("verified_expires_at timestamptz not null");
    expect(normalized).toContain("primary key (project_id, id)");
    expect(normalized).toContain("unique (project_id, provider_key, model_key, pricing_version)");
    expect(normalized).toContain("generation_runs_provider_capability_fk");
    expect(normalized).toContain("references provider_capability_versions(project_id, id)");
  });

  it("defines generation run events as an append-only project-scoped ledger", () => {
    expect(normalized).toContain("create table if not exists generation_run_events");
    expect(normalized).toContain("event_type text not null check");
    expect(normalized).toContain("claim_token text");
    expect(normalized).toContain("foreign key (project_id, generation_run_id)");
    expect(normalized).toContain("references generation_runs(project_id, id)");
    expect(normalized).toContain("generation_run_events_claim_token_once_idx");
    expect(normalized).toContain("generation_run_events_queued_once_idx");
    expect(normalized).toContain("prevent_generation_run_event_mutation");
    expect(normalized).toContain("before update or delete on generation_run_events");
  });

  it("keeps persisted evidence tied to same-project runs and assets", () => {
    expect(normalized).toContain("unique (project_id, id)");
    expect(normalized).toContain(
      "foreign key (project_id, generation_run_id) references generation_runs(project_id, id)"
    );
    expect(normalized).toContain(
      "foreign key (project_id, asset_id) references assets(project_id, id)"
    );
    expect(normalized).toContain(
      "foreign key (project_id, license_evidence_asset_id) references assets(project_id, id)"
    );
    expect(normalized).toContain(
      "foreign key (project_id, consent_evidence_asset_id) references assets(project_id, id)"
    );
  });

  it("adds worker lease columns and atomic claim RPC for generation runs", () => {
    expect(normalized).toContain("lease_owner text");
    expect(normalized).toContain("lease_expires_at timestamptz");
    expect(normalized).toContain("claim_token text");
    expect(normalized).toContain("claimed_at timestamptz");
    expect(normalized).toContain("create or replace function claim_generation_run");
    expect(normalized).toContain("security invoker");
    expect(normalized).toContain("p_lease_expires_at <= p_claimed_at");
    expect(normalized).toContain("lease_owner = p_actor_id");
    expect(normalized).toContain("claim_token = p_claim_token");
    expect(normalized).toContain("lease_expires_at > p_claimed_at");
    expect(normalized).toContain("status in ('queued', 'running')");
    expect(normalized).toContain("lease_expires_at is null or lease_expires_at <= p_claimed_at");
    expect(normalized).toContain("insert into generation_run_events");
    expect(normalized).toContain("grant execute on function claim_generation_run");
  });

  it("wraps provider-sim completion and terminal evidence in one RPC", () => {
    expect(normalized).toContain("create or replace function complete_provider_simulated_run");
    expect(normalized).toContain("returns generation_runs");
    expect(normalized).toContain("security invoker");
    expect(normalized).toContain("p_status not in ('succeeded', 'failed')");
    expect(normalized).toContain("status = 'running'");
    expect(normalized).toContain("lease_owner = p_actor_id");
    expect(normalized).toContain("claim_token = p_claim_token");
    expect(normalized).toContain("lease_expires_at > p_completed_at");
    expect(normalized).toContain("insert into assets");
    expect(normalized).toContain("insert into generation_run_events");
    expect(normalized).toContain("insert into validation_reports");
    expect(normalized).toContain("insert into cost_ledger_entries");
    expect(normalized).toContain("insert into rights_manifest_entries");
    expect(normalized).toContain("insert into export_manifests");
    expect(normalized).toContain("generated_content_label");
    expect(normalized).toContain("provenance_summary");
    expect(normalized).toContain("render_artifact");
    expect(normalized).toContain("c2pa_attachment");
    expect(normalized).toContain("render_artifact_checksum");
    expect(normalized).toContain("source_manifest_hash");
    expect(normalized).toContain("c2pa_manifest_hash");
    expect(normalized).toContain("export_manifests_ready_render_artifact_check");
    expect(normalized).toContain("export_manifests_attached_c2pa_check");
    expect(normalized).toContain("on conflict do nothing");
    expect(normalized).toContain("on conflict (project_id, id) do update");
    expect(normalized).toContain("p_status = 'succeeded'");
    expect(normalized).toContain("p_export_manifest is not null");
    expect(normalized).toContain("raise exception");
    expect(normalized).toContain("grant execute on function complete_provider_simulated_run");
  });

  it("prevents duplicate approved generation runs for the same suggestion", () => {
    expect(normalized).toContain(
      "create unique index if not exists generation_runs_approved_suggestion_once_idx"
    );
    expect(normalized).toContain(
      "where suggestion_id is not null and trigger_source = 'approved-suggestion'"
    );
  });
});

describe("Supabase live catalog verification script", () => {
  it("checks catalog RLS, policies, and ledger grants for all readiness tables", () => {
    for (const table of ownerScopedTables) {
      expect(catalogCheck).toContain(table);
    }

    expect(catalogCheck).toContain("pg_policies");
    expect(catalogCheck).toContain("relrowsecurity");
    expect(catalogCheck).toContain("information_schema.role_table_grants");
    expect(catalogCheck).toContain("privilege_type in ('update', 'delete')");
    expect(catalogCheck).toContain("record_ai_decision_and_queue_generation_run");
    expect(catalogCheck).toContain("pg_proc.prosecdef = true");
    expect(catalogCheck).toContain("generation_runs_approved_suggestion_once_idx");
    expect(catalogCheck).toContain("generation_run_events");
    expect(catalogCheck).toContain("generation_run_events_claim_token_once_idx");
    expect(catalogCheck).toContain("generation_run_events_queued_once_idx");
    expect(catalogCheck).toContain("claim_generation_run");
    expect(catalogCheck).toContain("complete_provider_simulated_run");
    expect(catalogCheck).toContain("lease_expires_at > p_completed_at");
    expect(catalogCheck).toContain("insert into export_manifests");
    expect(catalogCheck).toContain("missing_export_manifest_evidence_columns");
    expect(catalogCheck).toContain("missing_export_manifest_evidence_constraints");
    expect(catalogCheck).toContain("export_manifests_ready_render_artifact_check");
    expect(catalogCheck).toContain("export_manifests_attached_c2pa_check");
    expect(catalogCheck).toContain("render_artifact_checksum");
    expect(catalogCheck).toContain("source_manifest_hash");
    expect(catalogCheck).toContain("c2pa_manifest_hash");
    expect(catalogCheck).toContain("prevent_generation_run_event_mutation");
    expect(catalogCheck).toContain("pg_index.indisunique = true");
    expect(catalogCheck).toContain("provider_key");
    expect(catalogCheck).toContain("model_key");
    expect(catalogCheck).toContain("lifecycle_status");
    expect(catalogCheck).toContain("verified_expires_at");
    expect(catalogCheck).toContain("generation_runs_provider_capability_fk");
    expect(catalogCheck).toContain("missing_project_evidence_fk");
    expect(catalogCheck).toContain("validation_reports");
    expect(catalogCheck).toContain("cost_ledger_entries");
    expect(catalogCheck).toContain("rights_manifest_entries");
    expect(catalogCheck).toContain("generation_run_id");
    expect(catalogCheck).toContain("asset_id");
    expect(catalogCheck).toContain("license_evidence_asset_id");
    expect(catalogCheck).toContain("consent_evidence_asset_id");
    expect(catalogCheck).toContain("lifecycle_status = ''active''");
    expect(catalogCheck).toContain("verified_expires_at >= now()");
    expect(catalogCheck).toContain("commercial_use_allowed = true");
    expect(catalogCheck).toContain("raise exception");
  });
});

describe("Supabase provider-sim runtime verification script", () => {
  it("exercises authenticated RLS, idempotency, lease rejection, and failed completion cases", () => {
    expect(providerSimRuntimeCheck).toContain("set local role authenticated");
    expect(providerSimRuntimeCheck).toContain("request.jwt.claims");
    expect(providerSimRuntimeCheck).toContain("record_ai_decision_and_queue_generation_run");
    expect(providerSimRuntimeCheck).toContain("claim_generation_run");
    expect(providerSimRuntimeCheck).toContain("complete_provider_simulated_run");
    expect(providerSimRuntimeCheck).toContain("c2pa_status', 'attached'");
    expect(providerSimRuntimeCheck).toContain("aethon-local-sha256-attestation-v1");
    expect(providerSimRuntimeCheck).toContain("local-provider-sim");
    expect(providerSimRuntimeCheck).toContain("render_artifact_checksum = repeat('a', 64)");
    expect(providerSimRuntimeCheck).toContain("runtime worker retried the same claim token");
    expect(providerSimRuntimeCheck).toContain("different worker completion was accepted unexpectedly");
    expect(providerSimRuntimeCheck).toContain("stale lease completion was accepted unexpectedly");
    expect(providerSimRuntimeCheck).toContain("completion rpc retry returned unexpected terminal state");
    expect(providerSimRuntimeCheck).toContain("failed provider-sim completion should not write export manifests");
    expect(providerSimRuntimeCheck).toContain("rls leaked runtime generation runs to a non-owner user");
    expect(providerSimRuntimeCheck).toContain("alter table generation_run_events disable trigger");
    expect(providerSimRuntimeCheck).toContain("delete from projects");
  });
});

describe("Supabase schema drift guard", () => {
  it("keeps schema.sql and the initial migration in sync", () => {
    expect(normalizeSqlForDrift(readSql("schema.sql"))).toBe(
      normalizeSqlForDrift(readSql("migrations/0001_initial_ai_control.sql"))
    );
  });
});

describe("AI control repository evidence mapper", () => {
  it("preserves provider-sim run, asset, and export evidence instead of writing empty placeholders", () => {
    expect(repositorySource).toContain("getGenerationRunEvidence");
    expect(repositorySource).toContain("saveAsset");
    expect(repositorySource).toContain("claimGenerationRunForWorker");
    expect(repositorySource).toContain("completeProviderSimulatedRun");
    expect(repositorySource).toContain(".rpc(\"claim_generation_run\"");
    expect(repositorySource).toContain(".rpc(\"complete_provider_simulated_run\"");
    expect(repositorySource).toContain("toProviderSimCompletionRpcArgs");
    expect(repositorySource).toContain("toAssetUpsert");
    expect(repositorySource).toContain("outputAsset");
    expect(repositorySource).toContain("getAsset");
    expect(repositorySource).toContain("getGenerationRunEvents");
    expect(repositorySource).toContain("getValidationReportsForRun");
    expect(repositorySource).toContain("getCostLedgerEntriesForRun");
    expect(repositorySource).toContain("getRightsManifestEntriesForAsset");
    expect(repositorySource).toContain("getExportManifestsForRun");
    expect(repositorySource).toContain(".contains(\"model_runs\", [input.runId])");
    expect(repositorySource).toContain("artifact_asset_ids: report.artifactAssetIds ?? []");
    expect(repositorySource).toContain("generation_run_id: entry.runId ?? null");
    expect(repositorySource).toContain("asset_id: entry.assetId ?? null");
    expect(repositorySource).toContain("asset_ids: manifest.assetIds ?? getManifestAssetIds(manifest)");
    expect(repositorySource).toContain("model_runs: manifest.modelRunIds ?? getManifestModelRunIds(manifest)");
    expect(repositorySource).toContain("rights_summary: manifest.rightsSummary ?? summarizeManifestEvidence(manifest)");
    expect(repositorySource).toContain("generated_content_label: manifest.generatedContentLabel ?? \"not-labeled\"");
    expect(repositorySource).toContain("provenance_summary: manifest.provenanceSummary ?? {}");
    expect(repositorySource).toContain("render_artifact: manifest.renderArtifact ?? null");
    expect(repositorySource).toContain("c2pa_attachment: manifest.c2paAttachment ?? null");
    expect(repositorySource).toContain("render_artifact_checksum: manifest.renderArtifact?.checksum ?? null");
    expect(repositorySource).toContain("source_manifest_hash: manifest.renderArtifact?.sourceManifestHash ?? null");
    expect(repositorySource).toContain("c2pa_manifest_hash: manifest.c2paAttachment?.manifestHash ?? null");
    expect(repositorySource).toContain("generatedContentLabel: manifest.generatedContentLabel ?? \"not-labeled\"");
    expect(repositorySource).toContain("validationReportIds: manifest.validationReportIds ?? []");
    expect(repositorySource).toContain("provenanceSummary: manifest.provenanceSummary ?? {}");
    expect(repositorySource).toContain("renderArtifact: manifest.renderArtifact ?? null");
    expect(repositorySource).toContain("c2paAttachment: manifest.c2paAttachment ?? null");
    expect(repositorySource).toContain("c2pa_status: manifest.c2paStatus ?? \"not-attached\"");
    expect(repositorySource).toContain("renderArtifact: nullableRecord(row.render_artifact)");
    expect(repositorySource).toContain("c2paAttachment: nullableRecord(row.c2pa_attachment)");
    expect(repositorySource).toContain("renderArtifactChecksum: nullableString(row.render_artifact_checksum)");

    expect(repositorySource).not.toContain("completeClaimedGenerationRun");
    expect(repositorySource).not.toContain("saveGenerationRunEventOnce");
    expect(repositorySource).not.toContain("saveValidationReportOnce");
    expect(repositorySource).not.toContain("saveCostLedgerEntryOnce");
    expect(repositorySource).not.toContain("saveRightsManifestEntryOnce");
    expect(repositorySource).not.toContain("saveExportManifestOnce");

    expect(repositorySource).not.toContain("generation_run_id: null,");
    expect(repositorySource).not.toContain("asset_id: null,");
    expect(repositorySource).not.toContain("asset_ids: [],");
    expect(repositorySource).not.toContain("model_runs: [],");
    expect(repositorySource).not.toContain("rights_summary: {},");
  });
});

function readSql(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function toStatements(value: string): string[] {
  return stripSqlComments(value)
    .toLowerCase()
    .split(";")
    .map((statement) => statement.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function stripSqlComments(value: string): string {
  return value
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--.*$/gm, "");
}

function normalizeSqlForDrift(value: string): string {
  return value.replace(/\r\n/g, "\n").trim();
}

function grantMentionsTable(statement: string, table: string): boolean {
  const tableList = statement
    .replace(/^grant\s+.+?\s+on\s+/, "")
    .replace(/\s+to\s+authenticated$/, "")
    .split(",")
    .map((entry) => entry.trim());

  return tableList.includes(table);
}
