import type {
  AiControlPreferences,
  AiDecisionAuditRecord,
  AiSuggestion,
  CostLedgerEntry,
  ExportManifest,
  ProviderCapability,
  RightsManifestEntry,
  SceneSpec,
  ValidationReport,
  GenerationRun,
  GenerationRunEvent,
  SimulatedProviderRunResult
} from "@aethon/core";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AiPreferenceRecord,
  AiSuggestionRecord,
  AssetRecord,
  AssetWrite,
  CostLedgerEntryRecord,
  ExportManifestRecord,
  GenerationRunEvidenceRecord,
  GenerationRunEventRecord,
  GenerationRunRecord,
  ProviderCapabilityVersionRecord,
  RightsManifestEntryRecord,
  SceneSpecRecord,
  ValidationReportRecord
} from "./schema-types";

export interface AiControlRepository {
  saveAsset(input: {
    projectId: string;
    asset: AssetWrite;
  }): Promise<AssetRecord>;
  getPreferences(input: {
    projectId: string;
    userId: string;
  }): Promise<AiControlPreferences | null>;
  getSuggestion(input: {
    projectId?: string;
    suggestionId: string;
    userId: string;
  }): Promise<AiSuggestionRecord | null>;
  saveSuggestion(input: {
    projectId: string;
    userId: string;
    suggestion: AiSuggestion;
    gateStatus: AiSuggestionRecord["gateStatus"];
    requiresApproval: boolean;
  }): Promise<AiSuggestionRecord>;
  recordDecision(input: {
    auditRecord: AiDecisionAuditRecord;
    decisionReason: string;
  }): Promise<AiSuggestionRecord>;
  recordDecisionAndCreateGenerationRun(input: {
    auditRecord: AiDecisionAuditRecord;
    decisionReason: string;
    run: GenerationRun;
  }): Promise<GenerationRunRecord>;
  createGenerationRun(input: {
    run: GenerationRun;
  }): Promise<GenerationRunRecord>;
  claimGenerationRunForWorker(input: {
    projectId: string;
    runId: string;
    actorId: string;
    claimToken: string;
    leaseExpiresAt: string;
    claimedAt: string;
    eventId: string;
    reason: string;
  }): Promise<GenerationRunRecord>;
  completeProviderSimulatedRun(input: {
    result: SimulatedProviderRunResult;
    outputAsset?: AssetWrite;
  }): Promise<GenerationRunEvidenceRecord>;
  getGenerationRunEvidence(input: {
    projectId: string;
    runId: string;
  }): Promise<GenerationRunEvidenceRecord>;
  updateGenerationRun(input: {
    run: GenerationRun;
  }): Promise<GenerationRunRecord>;
  saveGenerationRunEvent(input: {
    event: GenerationRunEvent;
  }): Promise<GenerationRunEventRecord>;
  upsertSceneSpec(input: {
    projectId: string;
    spec: SceneSpec;
  }): Promise<SceneSpecRecord>;
  upsertProviderCapability(input: {
    projectId: string;
    capability: ProviderCapability;
  }): Promise<ProviderCapabilityVersionRecord>;
  saveValidationReport(input: {
    projectId: string;
    report: ValidationReport;
  }): Promise<ValidationReportRecord>;
  saveCostLedgerEntry(input: {
    projectId: string;
    entry: CostLedgerEntry;
  }): Promise<CostLedgerEntryRecord>;
  saveRightsManifestEntry(input: {
    projectId: string;
    entry: RightsManifestEntry;
  }): Promise<RightsManifestEntryRecord>;
  saveExportManifest(input: {
    manifest: ExportManifest;
  }): Promise<ExportManifestRecord>;
}

export interface AiControlPersistenceAdapter {
  assetsTable: "assets";
  preferencesTable: "ai_preferences";
  suggestionsTable: "ai_suggestions";
  runsTable: "generation_runs";
  runEventsTable: "generation_run_events";
  sceneSpecsTable: "scene_specs";
  providerCapabilitiesTable: "provider_capability_versions";
  validationReportsTable: "validation_reports";
  costLedgerTable: "cost_ledger_entries";
  rightsManifestTable: "rights_manifest_entries";
  exportManifestsTable: "export_manifests";
}

export const AI_CONTROL_TABLES: AiControlPersistenceAdapter = {
  assetsTable: "assets",
  preferencesTable: "ai_preferences",
  suggestionsTable: "ai_suggestions",
  runsTable: "generation_runs",
  runEventsTable: "generation_run_events",
  sceneSpecsTable: "scene_specs",
  providerCapabilitiesTable: "provider_capability_versions",
  validationReportsTable: "validation_reports",
  costLedgerTable: "cost_ledger_entries",
  rightsManifestTable: "rights_manifest_entries",
  exportManifestsTable: "export_manifests"
};

export class SupabaseAiControlRepository implements AiControlRepository {
  constructor(private readonly client: SupabaseClient) {}

  async saveAsset(input: {
    projectId: string;
    asset: AssetWrite;
  }): Promise<AssetRecord> {
    const { data, error } = await this.client
      .from(AI_CONTROL_TABLES.assetsTable)
      .upsert(toAssetUpsert(input.projectId, input.asset), {
        onConflict: "project_id,id"
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to save asset: ${error.message}`);
    }

    return toAssetRecord(data);
  }

  async getPreferences(input: {
    projectId: string;
    userId: string;
  }): Promise<AiControlPreferences | null> {
    const { data, error } = await this.client
      .from(AI_CONTROL_TABLES.preferencesTable)
      .select("*")
      .eq("project_id", input.projectId)
      .eq("user_id", input.userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load AI preferences: ${error.message}`);
    }

    return data ? mapPreferenceRecord(toAiPreferenceRecord(data)) : null;
  }

  async getSuggestion(input: {
    projectId?: string;
    suggestionId: string;
    userId: string;
  }): Promise<AiSuggestionRecord | null> {
    const query = this.client
      .from(AI_CONTROL_TABLES.suggestionsTable)
      .select("*")
      .eq("id", input.suggestionId)
      .eq("user_id", input.userId);
    const scopedQuery = input.projectId
      ? query.eq("project_id", input.projectId)
      : query;
    const { data, error } = await scopedQuery.maybeSingle();

    if (error) {
      throw new Error(`Failed to load AI suggestion: ${error.message}`);
    }

    return data ? toAiSuggestionRecord(data) : null;
  }

  async saveSuggestion(input: {
    projectId: string;
    userId: string;
    suggestion: AiSuggestion;
    gateStatus: AiSuggestionRecord["gateStatus"];
    requiresApproval: boolean;
  }): Promise<AiSuggestionRecord> {
    const { data, error } = await this.client
      .from(AI_CONTROL_TABLES.suggestionsTable)
      .insert({
        id: input.suggestion.id,
        project_id: input.projectId,
        scene_id: input.suggestion.sceneId,
        user_id: input.userId,
        task_id: input.suggestion.taskId,
        suggestion_type: "ai-control",
        title: input.suggestion.title,
        summary: input.suggestion.summary,
        recommended_option_id: input.suggestion.recommendedOptionId,
        alternatives: input.suggestion.options,
        risk_flags: input.suggestion.riskFlags,
        mode_at_creation: "adviser",
        gate_status: input.gateStatus,
        requires_approval: input.requiresApproval,
        user_decision: input.suggestion.decision,
        decision_reason: input.suggestion.decisionReason ?? null
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to save AI suggestion: ${error.message}`);
    }

    return toAiSuggestionRecord(data);
  }

  async recordDecision(input: {
    auditRecord: AiDecisionAuditRecord;
    decisionReason: string;
  }): Promise<AiSuggestionRecord> {
    const { data, error } = await this.client
      .from(AI_CONTROL_TABLES.suggestionsTable)
      .update({
        user_decision: input.auditRecord.decision,
        decision_reason: input.decisionReason,
        decision_audit: input.auditRecord,
        decided_at: input.auditRecord.decidedAt
      })
      .eq("id", input.auditRecord.suggestionId)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to record AI suggestion decision: ${error.message}`);
    }

    return toAiSuggestionRecord(data);
  }

  async recordDecisionAndCreateGenerationRun(input: {
    auditRecord: AiDecisionAuditRecord;
    decisionReason: string;
    run: GenerationRun;
  }): Promise<GenerationRunRecord> {
    const { data, error } = await this.client
      .rpc(
        "record_ai_decision_and_queue_generation_run",
        toDecisionQueueRpcArgs(input.auditRecord, input.decisionReason, input.run)
      )
      .single();

    if (error) {
      throw new Error(`Failed to record decision and queue generation run: ${error.message}`);
    }

    return toGenerationRunRecord(data as Record<string, unknown>);
  }

  async createGenerationRun(input: {
    run: GenerationRun;
  }): Promise<GenerationRunRecord> {
    const { data, error } = await this.client
      .from(AI_CONTROL_TABLES.runsTable)
      .insert(toGenerationRunInsert(input.run))
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to create generation run: ${error.message}`);
    }

    return toGenerationRunRecord(data);
  }

  async claimGenerationRunForWorker(input: {
    projectId: string;
    runId: string;
    actorId: string;
    claimToken: string;
    leaseExpiresAt: string;
    claimedAt: string;
    eventId: string;
    reason: string;
  }): Promise<GenerationRunRecord> {
    const { data, error } = await this.client
      .rpc("claim_generation_run", {
        p_run_id: input.runId,
        p_project_id: input.projectId,
        p_actor_id: input.actorId,
        p_claim_token: input.claimToken,
        p_lease_expires_at: input.leaseExpiresAt,
        p_claimed_at: input.claimedAt,
        p_event_id: input.eventId,
        p_reason: input.reason
      })
      .single();

    if (error) {
      throw new Error(`Failed to claim generation run: ${error.message}`);
    }

    return toGenerationRunRecord(data as Record<string, unknown>);
  }

  async completeProviderSimulatedRun(input: {
    result: SimulatedProviderRunResult;
    outputAsset?: AssetWrite;
  }): Promise<GenerationRunEvidenceRecord> {
    if (input.result.status === "blocked") {
      throw new Error(
        `Cannot persist a blocked provider simulation: ${input.result.reasons.join("; ")}`
      );
    }

    const claimEvent = getClaimEvent(input.result);
    const completionArgs = toProviderSimCompletionRpcArgs({
      result: input.result,
      claimEvent,
      outputAsset: input.result.run.outputAssetId
        ? input.outputAsset ??
          createGeneratedOutputAsset(
            input.result.run.outputAssetId,
            input.result.exportManifest?.renderArtifact?.checksum ?? null
          )
        : null
    });

    const { error } = await this.client
      .rpc("complete_provider_simulated_run", completionArgs)
      .single();

    if (error) {
      throw new Error(`Failed to complete provider-simulated generation run: ${error.message}`);
    }

    return this.getGenerationRunEvidence({
      projectId: input.result.run.projectId,
      runId: input.result.run.id
    });
  }

  async getGenerationRunEvidence(input: {
    projectId: string;
    runId: string;
  }): Promise<GenerationRunEvidenceRecord> {
    const { data: runData, error: runError } = await this.client
      .from(AI_CONTROL_TABLES.runsTable)
      .select("*")
      .eq("project_id", input.projectId)
      .eq("id", input.runId)
      .maybeSingle();

    if (runError) {
      throw new Error(`Failed to load generation run evidence root: ${runError.message}`);
    }

    const run = runData ? toGenerationRunRecord(runData) : null;

    if (!run) {
      return {
        run: null,
        outputAsset: null,
        events: [],
        validationReports: [],
        costLedgerEntries: [],
        rightsManifestEntries: [],
        exportManifests: []
      };
    }

    const [
      outputAsset,
      events,
      validationReports,
      costLedgerEntries,
      rightsManifestEntries,
      exportManifests
    ] =
      await Promise.all([
        run.outputAssetId
          ? this.getAsset({
              projectId: input.projectId,
              assetId: run.outputAssetId
            })
          : Promise.resolve(null),
        this.getGenerationRunEvents(input),
        this.getValidationReportsForRun(input),
        this.getCostLedgerEntriesForRun(input),
        run.outputAssetId
          ? this.getRightsManifestEntriesForAsset({
              projectId: input.projectId,
              assetId: run.outputAssetId
            })
          : Promise.resolve([]),
        this.getExportManifestsForRun(input)
      ]);

    return {
      run,
      outputAsset,
      events,
      validationReports,
      costLedgerEntries,
      rightsManifestEntries,
      exportManifests
    };
  }

  async updateGenerationRun(input: {
    run: GenerationRun;
  }): Promise<GenerationRunRecord> {
    const { data, error } = await this.client
      .from(AI_CONTROL_TABLES.runsTable)
      .update(toGenerationRunUpdate(input.run))
      .eq("id", input.run.id)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to update generation run: ${error.message}`);
    }

    return toGenerationRunRecord(data);
  }

  async saveGenerationRunEvent(input: {
    event: GenerationRunEvent;
  }): Promise<GenerationRunEventRecord> {
    const { data, error } = await this.client
      .from(AI_CONTROL_TABLES.runEventsTable)
      .insert(toGenerationRunEventInsert(input.event))
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to save generation run event: ${error.message}`);
    }

    return toGenerationRunEventRecord(data);
  }

  async upsertSceneSpec(input: {
    projectId: string;
    spec: SceneSpec;
  }): Promise<SceneSpecRecord> {
    const { data, error } = await this.client
      .from(AI_CONTROL_TABLES.sceneSpecsTable)
      .upsert(toSceneSpecUpsert(input.projectId, input.spec), {
        onConflict: "project_id,scene_id"
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to upsert scene spec: ${error.message}`);
    }

    return toSceneSpecRecord(data);
  }

  async upsertProviderCapability(input: {
    projectId: string;
    capability: ProviderCapability;
  }): Promise<ProviderCapabilityVersionRecord> {
    const { data, error } = await this.client
      .from(AI_CONTROL_TABLES.providerCapabilitiesTable)
      .upsert(toProviderCapabilityUpsert(input.projectId, input.capability), {
        onConflict: "project_id,provider_key,model_key,pricing_version"
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to upsert provider capability: ${error.message}`);
    }

    return toProviderCapabilityVersionRecord(data);
  }

  async saveValidationReport(input: {
    projectId: string;
    report: ValidationReport;
  }): Promise<ValidationReportRecord> {
    const { data, error } = await this.client
      .from(AI_CONTROL_TABLES.validationReportsTable)
      .insert(toValidationReportInsert(input.projectId, input.report))
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to save validation report: ${error.message}`);
    }

    return toValidationReportRecord(data);
  }

  async saveCostLedgerEntry(input: {
    projectId: string;
    entry: CostLedgerEntry;
  }): Promise<CostLedgerEntryRecord> {
    const { data, error } = await this.client
      .from(AI_CONTROL_TABLES.costLedgerTable)
      .insert(toCostLedgerEntryInsert(input.projectId, input.entry))
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to save cost ledger entry: ${error.message}`);
    }

    return toCostLedgerEntryRecord(data);
  }

  async saveRightsManifestEntry(input: {
    projectId: string;
    entry: RightsManifestEntry;
  }): Promise<RightsManifestEntryRecord> {
    const { data, error } = await this.client
      .from(AI_CONTROL_TABLES.rightsManifestTable)
      .insert(toRightsManifestEntryInsert(input.projectId, input.entry))
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to save rights manifest entry: ${error.message}`);
    }

    return toRightsManifestEntryRecord(data);
  }

  async saveExportManifest(input: {
    manifest: ExportManifest;
  }): Promise<ExportManifestRecord> {
    const { data, error } = await this.client
      .from(AI_CONTROL_TABLES.exportManifestsTable)
      .insert(toExportManifestInsert(input.manifest))
      .select("*")
      .single();

    if (error) {
      throw new Error(`Failed to save export manifest: ${error.message}`);
    }

    return toExportManifestRecord(data);
  }

  private async getAsset(input: {
    projectId: string;
    assetId: string;
  }): Promise<AssetRecord | null> {
    const { data, error } = await this.client
      .from(AI_CONTROL_TABLES.assetsTable)
      .select("*")
      .eq("project_id", input.projectId)
      .eq("id", input.assetId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load asset: ${error.message}`);
    }

    return data ? toAssetRecord(data) : null;
  }

  private async getGenerationRunEvents(input: {
    projectId: string;
    runId: string;
  }): Promise<GenerationRunEventRecord[]> {
    const { data, error } = await this.client
      .from(AI_CONTROL_TABLES.runEventsTable)
      .select("*")
      .eq("project_id", input.projectId)
      .eq("generation_run_id", input.runId)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`Failed to load generation run events: ${error.message}`);
    }

    return (data ?? []).map((row) => toGenerationRunEventRecord(row));
  }

  private async getValidationReportsForRun(input: {
    projectId: string;
    runId: string;
  }): Promise<ValidationReportRecord[]> {
    const { data, error } = await this.client
      .from(AI_CONTROL_TABLES.validationReportsTable)
      .select("*")
      .eq("project_id", input.projectId)
      .eq("generation_run_id", input.runId)
      .order("generated_at", { ascending: true });

    if (error) {
      throw new Error(`Failed to load validation reports: ${error.message}`);
    }

    return (data ?? []).map((row) => toValidationReportRecord(row));
  }

  private async getCostLedgerEntriesForRun(input: {
    projectId: string;
    runId: string;
  }): Promise<CostLedgerEntryRecord[]> {
    const { data, error } = await this.client
      .from(AI_CONTROL_TABLES.costLedgerTable)
      .select("*")
      .eq("project_id", input.projectId)
      .eq("generation_run_id", input.runId)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`Failed to load cost ledger entries: ${error.message}`);
    }

    return (data ?? []).map((row) => toCostLedgerEntryRecord(row));
  }

  private async getRightsManifestEntriesForAsset(input: {
    projectId: string;
    assetId: string;
  }): Promise<RightsManifestEntryRecord[]> {
    const { data, error } = await this.client
      .from(AI_CONTROL_TABLES.rightsManifestTable)
      .select("*")
      .eq("project_id", input.projectId)
      .eq("asset_id", input.assetId)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`Failed to load rights manifest entries: ${error.message}`);
    }

    return (data ?? []).map((row) => toRightsManifestEntryRecord(row));
  }

  private async getExportManifestsForRun(input: {
    projectId: string;
    runId: string;
  }): Promise<ExportManifestRecord[]> {
    const { data, error } = await this.client
      .from(AI_CONTROL_TABLES.exportManifestsTable)
      .select("*")
      .eq("project_id", input.projectId)
      .contains("model_runs", [input.runId])
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`Failed to load export manifests: ${error.message}`);
    }

    return (data ?? []).map((row) => toExportManifestRecord(row));
  }
}

export function mapPreferenceRecord(record: AiPreferenceRecord): AiControlPreferences {
  return {
    globalMode: record.globalMode,
    taskModes: mapTaskModes(record.taskModes),
    approvalThresholds: {
      maxAutoCostUsd:
        typeof record.approvalThresholds.maxAutoCostUsd === "number"
          ? record.approvalThresholds.maxAutoCostUsd
          : 0,
      manualApprovalRiskSeverity:
        record.approvalThresholds.manualApprovalRiskSeverity === "low" ||
        record.approvalThresholds.manualApprovalRiskSeverity === "medium" ||
        record.approvalThresholds.manualApprovalRiskSeverity === "high" ||
        record.approvalThresholds.manualApprovalRiskSeverity === "blocking"
          ? record.approvalThresholds.manualApprovalRiskSeverity
          : "medium",
      externalProviderRequiresApproval:
        typeof record.approvalThresholds.externalProviderRequiresApproval === "boolean"
          ? record.approvalThresholds.externalProviderRequiresApproval
          : true
    }
  };
}

function getClaimEvent(result: SimulatedProviderRunResult): GenerationRunEvent {
  const claimEvent = result.events.find(
    (event) => event.type === "claimed" && event.claimToken
  );

  if (!claimEvent) {
    throw new Error("A provider simulation completion needs a claimed event.");
  }

  return claimEvent;
}

function createGeneratedOutputAsset(assetId: string, contentHash: string | null): AssetWrite {
  return {
    id: assetId,
    sourceType: "generated",
    storageUrl: null,
    contentHash,
    licenseType: "generated-ai-output",
    consentStatus: "not-required"
  };
}

function toAssetRecord(row: Record<string, unknown>): AssetRecord {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    sourceType: String(row.source_type) as AssetRecord["sourceType"],
    storageUrl: nullableString(row.storage_url),
    contentHash: nullableString(row.content_hash),
    licenseType: String(row.license_type ?? "unknown"),
    consentStatus: String(row.consent_status ?? "unknown") as AssetRecord["consentStatus"],
    retentionUntil: nullableString(row.retention_until),
    createdAt: String(row.created_at)
  };
}

function toAssetUpsert(projectId: string, asset: AssetWrite): Record<string, unknown> {
  return {
    id: asset.id,
    project_id: projectId,
    source_type: asset.sourceType,
    storage_url: asset.storageUrl ?? null,
    content_hash: asset.contentHash ?? null,
    license_type: asset.licenseType ?? "unknown",
    consent_status: asset.consentStatus ?? "unknown",
    retention_until: asset.retentionUntil ?? null
  };
}

function toAiPreferenceRecord(row: Record<string, unknown>): AiPreferenceRecord {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    userId: String(row.user_id),
    globalMode: row.global_mode === "auto" || row.global_mode === "off" ? row.global_mode : "adviser",
    taskModes: asRecord(row.task_modes),
    approvalThresholds: asRecord(row.approval_thresholds),
    updatedAt: String(row.updated_at)
  };
}

function toAiSuggestionRecord(row: Record<string, unknown>): AiSuggestionRecord {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    sceneId: String(row.scene_id),
    userId: String(row.user_id),
    taskId: String(row.task_id),
    suggestionType: String(row.suggestion_type),
    title: String(row.title),
    summary: String(row.summary),
    recommendedOptionId: nullableString(row.recommended_option_id),
    alternatives: Array.isArray(row.alternatives) ? row.alternatives : [],
    riskFlags: Array.isArray(row.risk_flags) ? row.risk_flags : [],
    modeAtCreation:
      row.mode_at_creation === "auto" || row.mode_at_creation === "off"
        ? row.mode_at_creation
        : "adviser",
    gateStatus:
      row.gate_status === "ready" || row.gate_status === "blocked"
        ? row.gate_status
        : "requires-approval",
    requiresApproval: Boolean(row.requires_approval),
    userDecision:
      row.user_decision === "accepted" ||
      row.user_decision === "dismissed" ||
      row.user_decision === "edited"
        ? row.user_decision
        : "pending",
    decisionReason: nullableString(row.decision_reason),
    decisionAudit: asRecord(row.decision_audit),
    decidedAt: nullableString(row.decided_at),
    createdAt: String(row.created_at)
  };
}

function toGenerationRunRecord(row: Record<string, unknown>): GenerationRunRecord {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    sceneId: String(row.scene_id),
    suggestionId: nullableString(row.suggestion_id),
    userId: String(row.user_id),
    providerCapabilityId: String(row.provider_capability_id),
    providerKey: String(row.provider_key),
    modelKey: String(row.model_key),
    provider: String(row.provider),
    model: String(row.model),
    pricingVersion: String(row.pricing_version),
    providerTermsUrl: String(row.provider_terms_url),
    providerCapabilityVerifiedAt: String(row.provider_capability_verified_at),
    providerJobId: nullableString(row.provider_job_id),
    leaseOwner: nullableString(row.lease_owner),
    leaseExpiresAt: nullableString(row.lease_expires_at),
    claimToken: nullableString(row.claim_token),
    claimedAt: nullableString(row.claimed_at),
    promptHash: nullableString(row.prompt_hash),
    inputAssetIds: Array.isArray(row.input_asset_ids)
      ? row.input_asset_ids.map(String)
      : [],
    outputAssetId: nullableString(row.output_asset_id),
    costEstimate: nullableNumber(row.cost_estimate),
    status:
      row.status === "running" ||
      row.status === "succeeded" ||
      row.status === "failed" ||
      row.status === "cancelled"
        ? row.status
        : "queued",
    triggerMode:
      row.trigger_mode === "auto" || row.trigger_mode === "off"
        ? row.trigger_mode
        : "adviser",
    triggerSource:
      row.trigger_source === "auto-policy" || row.trigger_source === "manual-override"
        ? row.trigger_source
        : "approved-suggestion",
    failureReason: nullableString(row.failure_reason),
    retryCount: Number(row.retry_count ?? 0),
    maxRetries: Number(row.max_retries ?? 2),
    startedAt: nullableString(row.started_at),
    completedAt: nullableString(row.completed_at),
    updatedAt: String(row.updated_at),
    auditTrail: Array.isArray(row.audit_trail) ? row.audit_trail : [],
    statusDetail: asRecord(row.status_detail),
    createdAt: String(row.created_at)
  };
}

function toGenerationRunEventRecord(row: Record<string, unknown>): GenerationRunEventRecord {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    generationRunId: String(row.generation_run_id),
    sceneId: String(row.scene_id),
    eventType: String(row.event_type) as GenerationRunEventRecord["eventType"],
    status: String(row.status) as GenerationRunEventRecord["status"],
    actorId: String(row.actor_id),
    reason: String(row.reason),
    providerJobId: nullableString(row.provider_job_id),
    outputAssetId: nullableString(row.output_asset_id),
    failureReason: nullableString(row.failure_reason),
    retryCount: Number(row.retry_count ?? 0),
    leaseOwner: nullableString(row.lease_owner),
    leaseExpiresAt: nullableString(row.lease_expires_at),
    claimToken: nullableString(row.claim_token),
    metadata: asRecord(row.metadata),
    createdAt: String(row.created_at)
  };
}

function toGenerationRunInsert(run: GenerationRun): Record<string, unknown> {
  return {
    id: run.id,
    project_id: run.projectId,
    scene_id: run.sceneId,
    suggestion_id: run.suggestionId,
    user_id: run.userId,
    provider_capability_id: run.providerCapabilityId,
    provider_key: run.providerKey,
    model_key: run.modelKey,
    provider: run.provider,
    model: run.model,
    pricing_version: run.pricingVersion,
    provider_terms_url: run.providerTermsUrl,
    provider_capability_verified_at: run.providerCapabilityVerifiedAtIso,
    provider_job_id: run.providerJobId,
    lease_owner: run.leaseOwner,
    lease_expires_at: run.leaseExpiresAt,
    claim_token: run.claimToken,
    claimed_at: run.claimedAt,
    prompt_hash: run.promptHash,
    input_asset_ids: run.inputAssetIds,
    output_asset_id: run.outputAssetId,
    cost_estimate: run.costEstimateUsd,
    status: run.status,
    trigger_mode: run.triggerMode,
    trigger_source: run.triggerSource,
    retry_count: run.retryCount,
    max_retries: run.maxRetries,
    failure_reason: run.failureReason,
    started_at: run.startedAt,
    completed_at: run.completedAt,
    audit_trail: run.auditTrail,
    status_detail: {},
    created_at: run.queuedAt,
    updated_at: run.updatedAt
  };
}

function toGenerationRunUpdate(run: GenerationRun): Record<string, unknown> {
  return {
    provider_job_id: run.providerJobId,
    lease_owner: run.leaseOwner,
    lease_expires_at: run.leaseExpiresAt,
    claim_token: run.claimToken,
    claimed_at: run.claimedAt,
    output_asset_id: run.outputAssetId,
    status: run.status,
    retry_count: run.retryCount,
    failure_reason: run.failureReason,
    started_at: run.startedAt,
    completed_at: run.completedAt,
    audit_trail: run.auditTrail,
    updated_at: run.updatedAt
  };
}

function toGenerationRunEventInsert(event: GenerationRunEvent): Record<string, unknown> {
  return {
    id: event.id,
    project_id: event.projectId,
    generation_run_id: event.runId,
    scene_id: event.sceneId,
    event_type: event.type,
    status: event.status,
    actor_id: event.actorId,
    reason: event.reason,
    provider_job_id: event.providerJobId,
    output_asset_id: event.outputAssetId,
    failure_reason: event.failureReason,
    retry_count: event.retryCount,
    lease_owner: event.leaseOwner,
    lease_expires_at: event.leaseExpiresAt,
    claim_token: event.claimToken,
    metadata: event.metadata,
    created_at: event.at
  };
}

function toDecisionQueueRpcArgs(
  auditRecord: AiDecisionAuditRecord,
  decisionReason: string,
  run: GenerationRun
): Record<string, unknown> {
  return {
    p_suggestion_id: auditRecord.suggestionId,
    p_decision: auditRecord.decision,
    p_decision_reason: decisionReason,
    p_decision_audit: auditRecord,
    p_decided_at: auditRecord.decidedAt,
    p_run_id: run.id,
    p_project_id: run.projectId,
    p_scene_id: run.sceneId,
    p_provider_capability_id: run.providerCapabilityId,
    p_provider_key: run.providerKey,
    p_model_key: run.modelKey,
    p_provider: run.provider,
    p_model: run.model,
    p_pricing_version: run.pricingVersion,
    p_provider_terms_url: run.providerTermsUrl,
    p_provider_capability_verified_at: run.providerCapabilityVerifiedAtIso,
    p_prompt_hash: run.promptHash,
    p_input_asset_ids: run.inputAssetIds,
    p_output_asset_id: run.outputAssetId,
    p_cost_estimate: run.costEstimateUsd,
    p_status: run.status,
    p_trigger_mode: run.triggerMode,
    p_trigger_source: run.triggerSource,
    p_retry_count: run.retryCount,
    p_max_retries: run.maxRetries,
    p_failure_reason: run.failureReason,
    p_started_at: run.startedAt,
    p_completed_at: run.completedAt,
    p_audit_trail: run.auditTrail,
    p_status_detail: {},
    p_created_at: run.queuedAt,
    p_updated_at: run.updatedAt
  };
}

function toProviderSimCompletionRpcArgs(input: {
  result: SimulatedProviderRunResult;
  claimEvent: GenerationRunEvent;
  outputAsset: AssetWrite | null;
}): Record<string, unknown> {
  const completedAt = input.result.run.completedAt ?? input.result.run.updatedAt;

  if (!input.claimEvent.claimToken) {
    throw new Error("A provider simulation completion needs a claim token.");
  }

  return {
    p_run_id: input.result.run.id,
    p_project_id: input.result.run.projectId,
    p_actor_id: input.claimEvent.actorId,
    p_claim_token: input.claimEvent.claimToken,
    p_completed_at: completedAt,
    p_status: input.result.run.status,
    p_provider_job_id: input.result.run.providerJobId,
    p_output_asset_id: input.result.run.outputAssetId,
    p_failure_reason: input.result.run.failureReason,
    p_audit_trail: input.result.run.auditTrail,
    p_status_detail: {},
    p_output_asset: input.outputAsset
      ? toAssetUpsert(input.result.run.projectId, input.outputAsset)
      : null,
    p_events: input.result.events.map(toGenerationRunEventInsert),
    p_validation_report: input.result.validationReport
      ? toValidationReportInsert(
          input.result.run.projectId,
          input.result.validationReport
        )
      : null,
    p_cost_ledger_entry: input.result.costLedgerEntry
      ? toCostLedgerEntryInsert(
          input.result.run.projectId,
          input.result.costLedgerEntry
        )
      : null,
    p_rights_manifest_entry: input.result.rightsManifestEntry
      ? toRightsManifestEntryInsert(
          input.result.run.projectId,
          input.result.rightsManifestEntry
        )
      : null,
    p_export_manifest: input.result.exportManifest
      ? toExportManifestInsert(input.result.exportManifest)
      : null
  };
}

function toSceneSpecUpsert(projectId: string, spec: SceneSpec): Record<string, unknown> {
  return {
    id: spec.id,
    project_id: projectId,
    scene_id: spec.sceneId,
    requested_by: spec.requestedBy,
    decision_suggestion_id: spec.decisionId,
    approval_policy: spec.approvalPolicy,
    user_intent: spec.userIntent,
    camera_angle: spec.cameraAngle,
    emotion: spec.emotion,
    shot_type: spec.shotType,
    budget_priority: spec.budgetPriority,
    is_highlight: spec.isHighlight,
    target_aspect_ratio: spec.targetAspectRatio,
    provider_input_mode: spec.providerInputMode,
    image_prompt: spec.imagePrompt,
    video_prompt: spec.videoPrompt,
    image_model: spec.imageModel,
    video_model: spec.videoModel,
    selection_mode: spec.selectionMode,
    manual_override_reason: spec.manualOverrideReason ?? null,
    source_asset_ids: spec.sourceAssetIds,
    reference_asset_ids: spec.referenceAssetIds,
    constraints: spec.constraints,
    continuity_locks: spec.continuityLocks,
    created_at: spec.createdAtIso,
    updated_at: spec.updatedAtIso
  };
}

function toProviderCapabilityUpsert(
  projectId: string,
  capability: ProviderCapability
): Record<string, unknown> {
  return {
    id: capability.id,
    project_id: projectId,
    provider_key: capability.providerKey,
    model_key: capability.modelKey,
    provider: capability.provider,
    model: capability.model,
    kind: capability.kind,
    lifecycle_status: capability.status,
    capability,
    pricing_version: capability.pricingVersion,
    provider_terms_url: capability.providerTermsUrl,
    source_url: capability.sourceUrl,
    terms_risk: capability.termsRisk,
    data_retention: capability.dataRetention,
    commercial_use_allowed: capability.commercialUseAllowed,
    region_availability: capability.regionAvailability,
    last_verified_at: capability.lastVerifiedAtIso,
    verified_expires_at: addDaysIso(
      capability.lastVerifiedAtIso,
      capability.verificationTtlDays
    ),
    deprecated_at: capability.status === "deprecated" ? capability.lastVerifiedAtIso : null,
    replacement_capability_id: null
  };
}

function toValidationReportInsert(
  projectId: string,
  report: ValidationReport
): Record<string, unknown> {
  return {
    id: report.id,
    project_id: projectId,
    scene_id: report.sceneId,
    generation_run_id: report.runId,
    generated_by: "system",
    generated_at: report.generatedAtIso,
    status: getReportStatus(report),
    checks: report.checks,
    artifact_asset_ids: report.artifactAssetIds ?? []
  };
}

function toCostLedgerEntryInsert(
  projectId: string,
  entry: CostLedgerEntry
): Record<string, unknown> {
  return {
    id: entry.id,
    project_id: projectId,
    scene_id: entry.sceneId,
    generation_run_id: entry.runId ?? null,
    provider: entry.provider,
    model: entry.model,
    currency: "USD",
    estimated_usd: entry.estimatedUsd,
    approved_usd: entry.approvedUsd,
    actual_usd: entry.actualCostUsd ?? null,
    approved_by: entry.approvedBy ?? null,
    budget_id: entry.budgetId ?? null,
    status: entry.status
  };
}

function toRightsManifestEntryInsert(
  projectId: string,
  entry: RightsManifestEntry
): Record<string, unknown> {
  return {
    id: entry.id,
    project_id: projectId,
    scene_id: entry.sceneId,
    asset_id: entry.assetId ?? null,
    asset_label: entry.assetLabel,
    source: entry.source,
    status: entry.status,
    attribution_required: entry.attributionRequired,
    attribution_text: entry.attributionText ?? null,
    license_evidence_asset_id: entry.licenseEvidenceAssetId ?? null,
    consent_evidence_asset_id: entry.consentEvidenceAssetId ?? null,
    provenance_payload: entry.provenancePayload ?? {}
  };
}

function toExportManifestInsert(manifest: ExportManifest): Record<string, unknown> {
  return {
    id: manifest.id,
    project_id: manifest.projectId,
    asset_ids: manifest.assetIds ?? getManifestAssetIds(manifest),
    model_runs: manifest.modelRunIds ?? getManifestModelRunIds(manifest),
    rights_summary: manifest.rightsSummary ?? summarizeManifestEvidence(manifest),
    generated_content_label: manifest.generatedContentLabel ?? "not-labeled",
    provenance_summary: manifest.provenanceSummary ?? {},
    render_artifact: manifest.renderArtifact ?? null,
    c2pa_attachment: manifest.c2paAttachment ?? null,
    render_artifact_checksum: manifest.renderArtifact?.checksum ?? null,
    source_manifest_hash: manifest.renderArtifact?.sourceManifestHash ?? null,
    c2pa_manifest_hash: manifest.c2paAttachment?.manifestHash ?? null,
    preview_render_status: manifest.previewRenderStatus,
    cost_ledger_entry_ids:
      manifest.costLedgerEntryIds ?? manifest.costLedger.map((entry) => entry.id),
    rights_manifest_entry_ids:
      manifest.rightsManifestEntryIds ?? manifest.rights.map((entry) => entry.id),
    final_decision_audit: manifest.finalDecisionAudit,
    c2pa_status: manifest.c2paStatus ?? "not-attached"
  };
}

function getManifestAssetIds(manifest: ExportManifest): string[] {
  return manifest.rights
    .map((entry) => entry.assetId)
    .filter((assetId): assetId is string => Boolean(assetId));
}

function getManifestModelRunIds(manifest: ExportManifest): string[] {
  return manifest.costLedger
    .map((entry) => entry.runId)
    .filter((runId): runId is string => Boolean(runId));
}

function summarizeManifestEvidence(manifest: ExportManifest): Record<string, unknown> {
  const rights = manifest.rights;

  return {
    cleared: rights.filter((entry) => entry.status === "cleared").length,
    needsReview: rights.filter((entry) => entry.status === "needs-review").length,
    blocked: rights.filter((entry) => entry.status === "blocked").length,
    attributionRequired: rights.filter((entry) => entry.attributionRequired).length,
    generatedContentLabel: manifest.generatedContentLabel ?? "not-labeled",
    validationReportIds: manifest.validationReportIds ?? [],
    costLedgerEntryIds: manifest.costLedgerEntryIds ?? manifest.costLedger.map((entry) => entry.id),
    rightsManifestEntryIds:
      manifest.rightsManifestEntryIds ?? manifest.rights.map((entry) => entry.id),
    provenanceSummary: manifest.provenanceSummary ?? {},
    renderArtifact: manifest.renderArtifact ?? null,
    c2paAttachment: manifest.c2paAttachment ?? null,
    c2paStatus: manifest.c2paStatus ?? "not-attached",
    total: rights.length
  };
}

function toSceneSpecRecord(row: Record<string, unknown>): SceneSpecRecord {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    sceneId: String(row.scene_id),
    requestedBy: String(row.requested_by),
    decisionSuggestionId: nullableString(row.decision_suggestion_id),
    approvalPolicy: asRecord(row.approval_policy),
    userIntent: String(row.user_intent),
    cameraAngle: String(row.camera_angle),
    emotion: String(row.emotion) as SceneSpecRecord["emotion"],
    shotType: String(row.shot_type) as SceneSpecRecord["shotType"],
    budgetPriority: String(row.budget_priority) as SceneSpecRecord["budgetPriority"],
    isHighlight: Boolean(row.is_highlight),
    targetAspectRatio: String(row.target_aspect_ratio),
    providerInputMode: String(row.provider_input_mode) as SceneSpecRecord["providerInputMode"],
    imagePrompt: String(row.image_prompt),
    videoPrompt: String(row.video_prompt),
    imageModel: String(row.image_model),
    videoModel: String(row.video_model),
    selectionMode: String(row.selection_mode) as SceneSpecRecord["selectionMode"],
    manualOverrideReason: nullableString(row.manual_override_reason),
    sourceAssetIds: arrayOfStrings(row.source_asset_ids),
    referenceAssetIds: arrayOfStrings(row.reference_asset_ids),
    constraints: asRecord(row.constraints),
    continuityLocks: asRecord(row.continuity_locks),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

function toProviderCapabilityVersionRecord(
  row: Record<string, unknown>
): ProviderCapabilityVersionRecord {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    providerKey: String(row.provider_key),
    modelKey: String(row.model_key),
    provider: String(row.provider),
    model: String(row.model),
    kind: String(row.kind) as ProviderCapabilityVersionRecord["kind"],
    lifecycleStatus: String(row.lifecycle_status) as ProviderCapabilityVersionRecord["lifecycleStatus"],
    capability: asRecord(row.capability),
    pricingVersion: String(row.pricing_version),
    providerTermsUrl: String(row.provider_terms_url),
    sourceUrl: String(row.source_url),
    termsRisk: String(row.terms_risk) as ProviderCapabilityVersionRecord["termsRisk"],
    dataRetention: String(row.data_retention) as ProviderCapabilityVersionRecord["dataRetention"],
    commercialUseAllowed: Boolean(row.commercial_use_allowed),
    regionAvailability: arrayOfStrings(row.region_availability),
    lastVerifiedAt: String(row.last_verified_at),
    verifiedExpiresAt: String(row.verified_expires_at),
    deprecatedAt: nullableString(row.deprecated_at),
    replacementCapabilityId: nullableString(row.replacement_capability_id),
    createdAt: String(row.created_at)
  };
}

function toValidationReportRecord(row: Record<string, unknown>): ValidationReportRecord {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    sceneId: String(row.scene_id),
    generationRunId: nullableString(row.generation_run_id),
    generatedBy: String(row.generated_by),
    generatedAt: String(row.generated_at),
    status: String(row.status) as ValidationReportRecord["status"],
    checks: Array.isArray(row.checks) ? row.checks : [],
    artifactAssetIds: arrayOfStrings(row.artifact_asset_ids),
    createdAt: String(row.created_at)
  };
}

function toCostLedgerEntryRecord(row: Record<string, unknown>): CostLedgerEntryRecord {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    sceneId: nullableString(row.scene_id),
    generationRunId: nullableString(row.generation_run_id),
    provider: String(row.provider),
    model: String(row.model),
    currency: "USD",
    estimatedUsd: Number(row.estimated_usd ?? 0),
    approvedUsd: Number(row.approved_usd ?? 0),
    actualUsd: nullableNumber(row.actual_usd),
    approvedBy: nullableString(row.approved_by),
    budgetId: nullableString(row.budget_id),
    status: String(row.status) as CostLedgerEntryRecord["status"],
    createdAt: String(row.created_at)
  };
}

function toRightsManifestEntryRecord(row: Record<string, unknown>): RightsManifestEntryRecord {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    sceneId: nullableString(row.scene_id),
    assetId: nullableString(row.asset_id),
    assetLabel: String(row.asset_label),
    source: String(row.source) as RightsManifestEntryRecord["source"],
    status: String(row.status) as RightsManifestEntryRecord["status"],
    attributionRequired: Boolean(row.attribution_required),
    attributionText: nullableString(row.attribution_text),
    licenseEvidenceAssetId: nullableString(row.license_evidence_asset_id),
    consentEvidenceAssetId: nullableString(row.consent_evidence_asset_id),
    provenancePayload: asRecord(row.provenance_payload),
    createdAt: String(row.created_at)
  };
}

function toExportManifestRecord(row: Record<string, unknown>): ExportManifestRecord {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    assetIds: arrayOfStrings(row.asset_ids),
    modelRuns: arrayOfStrings(row.model_runs),
    rightsSummary: asRecord(row.rights_summary),
    generatedContentLabel: String(row.generated_content_label ?? "not-labeled"),
    provenanceSummary: asRecord(row.provenance_summary),
    renderArtifact: nullableRecord(row.render_artifact),
    c2paAttachment: nullableRecord(row.c2pa_attachment),
    renderArtifactChecksum: nullableString(row.render_artifact_checksum),
    sourceManifestHash: nullableString(row.source_manifest_hash),
    c2paManifestHash: nullableString(row.c2pa_manifest_hash),
    previewRenderStatus: String(row.preview_render_status) as ExportManifestRecord["previewRenderStatus"],
    costLedgerEntryIds: arrayOfStrings(row.cost_ledger_entry_ids),
    rightsManifestEntryIds: arrayOfStrings(row.rights_manifest_entry_ids),
    finalDecisionAudit: Array.isArray(row.final_decision_audit) ? row.final_decision_audit : [],
    c2paStatus: String(row.c2pa_status),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

function getReportStatus(report: ValidationReport): ValidationReportRecord["status"] {
  if (
    report.checks.some(
      (check) => check.status === "fail" && check.severity === "blocking"
    )
  ) {
    return "blocked";
  }

  if (
    report.checks.some(
      (check) => check.status === "fail" || check.status === "warn" || check.status === "not-run"
    )
  ) {
    return "needs-review";
  }

  return "ready";
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function nullableNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function nullableRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function arrayOfStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function addDaysIso(value: string, days: number): string {
  const parsed = Date.parse(value);

  if (!Number.isFinite(parsed)) {
    return value;
  }

  return new Date(parsed + days * 24 * 60 * 60 * 1000).toISOString();
}

function mapTaskModes(value: Record<string, unknown>): AiControlPreferences["taskModes"] {
  return Object.fromEntries(
    Object.entries(value).filter(
      ([, mode]) => mode === "auto" || mode === "adviser" || mode === "off"
    )
  ) as AiControlPreferences["taskModes"];
}
