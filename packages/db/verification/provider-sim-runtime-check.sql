-- AETHON provider-sim runtime verification for Supabase local/staging DBs.
-- This check runs as the authenticated role with request.jwt.claims set, then
-- removes all deterministic fixture data after proving the queue -> claim -> complete path.

do $$
declare
  v_project_id uuid := '11111111-1111-4111-8111-111111111111';
  v_scene_id uuid := '22222222-2222-4222-8222-222222222222';
  v_suggestion_id uuid := '33333333-3333-4333-8333-333333333333';
  v_run_id uuid := '44444444-4444-4444-8444-444444444444';
  v_claim_event_id uuid := '55555555-5555-4555-8555-555555555555';
  v_output_asset_id uuid := '66666666-6666-4666-8666-666666666666';
  v_success_event_id uuid := '77777777-7777-4777-8777-777777777777';
  v_validation_report_id uuid := '88888888-8888-4888-8888-888888888888';
  v_cost_entry_id uuid := '99999999-9999-4999-8999-999999999999';
  v_rights_entry_id uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  v_export_manifest_id uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  v_rejected_output_asset_id uuid := 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  v_stale_output_asset_id uuid := 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  v_failed_suggestion_id uuid := 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  v_failed_run_id uuid := '12121212-1212-4212-8212-121212121212';
  v_failed_claim_event_id uuid := '13131313-1313-4313-8313-131313131313';
  v_failed_event_id uuid := '14141414-1414-4414-8414-141414141414';
  v_verified_at timestamptz := '2026-05-05 00:00:00+00';
  v_queued_at timestamptz := '2026-05-05 00:01:00+00';
  v_claimed_at timestamptz := '2026-05-05 00:02:00+00';
  v_lease_expires_at timestamptz := '2026-05-05 00:12:00+00';
  v_completed_at timestamptz := '2026-05-05 00:03:00+00';
  v_failed_queued_at timestamptz := '2026-05-05 00:04:00+00';
  v_failed_claimed_at timestamptz := '2026-05-05 00:05:00+00';
  v_failed_lease_expires_at timestamptz := '2026-05-05 00:15:00+00';
  v_failed_completed_at timestamptz := '2026-05-05 00:06:00+00';
  v_claim_token text := 'provider-sim-runtime-claim-token';
  v_failed_claim_token text := 'provider-sim-runtime-failed-claim-token';
  v_queued_run generation_runs;
  v_claimed_run generation_runs;
  v_retried_claimed_run generation_runs;
  v_completed_run generation_runs;
  v_retried_completed_run generation_runs;
  v_failed_queued_run generation_runs;
  v_failed_claimed_run generation_runs;
  v_failed_completed_run generation_runs;
  v_count integer;
begin
  execute 'alter table generation_run_events disable trigger generation_run_events_append_only';

  delete from projects
  where id = v_project_id;

  execute 'alter table generation_run_events enable trigger generation_run_events_append_only';

  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', '{"sub":"runtime-owner"}', true);

  insert into projects (id, owner_id, title)
  values (v_project_id, 'runtime-owner', 'Runtime Supabase Verification');

  insert into scenes (
    id,
    project_id,
    scene_index,
    title,
    intent,
    duration_seconds
  )
  values (
    v_scene_id,
    v_project_id,
    1,
    'Provider Simulation Runtime Check',
    'prove transactional provider completion',
    5
  );

  insert into provider_capability_versions (
    id,
    project_id,
    provider_key,
    model_key,
    provider,
    model,
    kind,
    capability,
    pricing_version,
    provider_terms_url,
    source_url,
    terms_risk,
    data_retention,
    commercial_use_allowed,
    region_availability,
    last_verified_at,
    verified_expires_at
  )
  values (
    'runtime-provider-capability',
    v_project_id,
    'runtime-provider',
    'runtime-model',
    'Runtime Provider',
    'Runtime Model',
    'video',
    '{"maxDurationSeconds":8,"supportsImageToVideo":true}'::jsonb,
    '2026-05',
    'https://example.invalid/runtime-provider/terms',
    'https://example.invalid/runtime-provider/models/runtime-model',
    'low',
    'temporary',
    true,
    array['US'],
    v_verified_at,
    v_verified_at + interval '30 days'
  );

  insert into ai_suggestions (
    id,
    project_id,
    scene_id,
    user_id,
    task_id,
    title,
    summary,
    recommended_option_id,
    alternatives,
    mode_at_creation,
    gate_status,
    requires_approval
  )
  values (
    v_suggestion_id,
    v_project_id,
    v_scene_id,
    'runtime-owner',
    'runtime-provider-sim',
    'Approve runtime provider simulation',
    'Queue a provider-sim run for runtime verification.',
    'runtime-provider-capability',
    '[{"id":"runtime-provider-capability","label":"Runtime Provider"}]'::jsonb,
    'adviser',
    'requires-approval',
    true
  );

  select *
  into v_queued_run
  from record_ai_decision_and_queue_generation_run(
    v_suggestion_id,
    'accepted',
    'Runtime verification accepted this adviser suggestion.',
    '{"source":"provider-sim-runtime-check"}'::jsonb,
    v_queued_at,
    v_run_id,
    v_project_id,
    v_scene_id,
    'runtime-provider-capability',
    'runtime-provider',
    'runtime-model',
    'Runtime Provider',
    'Runtime Model',
    '2026-05',
    'https://example.invalid/runtime-provider/terms',
    v_verified_at,
    'runtime-prompt-hash',
    '{}'::uuid[],
    null,
    0.2500,
    'queued',
    'adviser',
    'approved-suggestion',
    0,
    2,
    null,
    null,
    null,
    '[{"status":"queued","source":"runtime-check"}]'::jsonb,
    '{"runtimeCheck":true}'::jsonb,
    v_queued_at,
    v_queued_at
  );

  if v_queued_run.id <> v_run_id or v_queued_run.status <> 'queued' then
    raise exception 'Decision queue RPC returned unexpected run state: %, %',
      v_queued_run.id,
      v_queued_run.status;
  end if;

  select count(*)
  into v_count
  from generation_run_events
  where project_id = v_project_id
    and generation_run_id = v_run_id
    and event_type = 'queued';

  if v_count <> 1 then
    raise exception 'Decision queue RPC should write exactly one queued event, found %.', v_count;
  end if;

  select *
  into v_claimed_run
  from claim_generation_run(
    v_run_id,
    v_project_id,
    'runtime-worker',
    v_claim_token,
    v_lease_expires_at,
    v_claimed_at,
    v_claim_event_id,
    'Runtime worker claimed this provider-sim run.'
  );

  if v_claimed_run.status <> 'running'
    or v_claimed_run.lease_owner <> 'runtime-worker'
    or v_claimed_run.claim_token <> v_claim_token then
    raise exception 'Claim RPC returned unexpected run lease state: %, %, %',
      v_claimed_run.status,
      v_claimed_run.lease_owner,
      v_claimed_run.claim_token;
  end if;

  select *
  into v_retried_claimed_run
  from claim_generation_run(
    v_run_id,
    v_project_id,
    'runtime-worker',
    v_claim_token,
    v_lease_expires_at,
    v_claimed_at,
    v_claim_event_id,
    'Runtime worker retried the same claim token.'
  );

  if v_retried_claimed_run.id <> v_run_id
    or v_retried_claimed_run.claim_token <> v_claim_token then
    raise exception 'Claim RPC same-token retry returned unexpected run state: %, %',
      v_retried_claimed_run.id,
      v_retried_claimed_run.claim_token;
  end if;

  select count(*)
  into v_count
  from generation_run_events
  where project_id = v_project_id
    and generation_run_id = v_run_id
    and event_type = 'claimed';

  if v_count <> 1 then
    raise exception 'Claim RPC same-token retry should not duplicate claimed events, found %.', v_count;
  end if;

  begin
    perform complete_provider_simulated_run(
      v_run_id,
      v_project_id,
      'other-worker',
      v_claim_token,
      v_completed_at,
      'succeeded',
      'runtime-rejected-worker-job',
      v_rejected_output_asset_id,
      null,
      '[{"status":"succeeded","source":"runtime-check-rejected-worker"}]'::jsonb,
      '{"runtimeCheck":true,"expected":"different-worker-rejection"}'::jsonb,
      jsonb_build_object(
        'id', v_rejected_output_asset_id,
        'source_type', 'generated',
        'storage_url', 'supabase://runtime/rejected-worker-output.mp4',
        'content_hash', 'sha256-runtime-rejected-worker-output',
        'license_type', 'generated-commercial',
        'consent_status', 'not-required'
      ),
      jsonb_build_array(
        jsonb_build_object(
          'id', gen_random_uuid(),
          'scene_id', v_scene_id,
          'event_type', 'succeeded',
          'status', 'succeeded',
          'actor_id', 'other-worker',
          'reason', 'This completion should be rejected.',
          'provider_job_id', 'runtime-rejected-worker-job',
          'output_asset_id', v_rejected_output_asset_id,
          'retry_count', 0,
          'metadata', jsonb_build_object('runtimeCheck', true),
          'created_at', v_completed_at
        )
      ),
      null,
      null,
      null,
      null
    );

    raise exception 'Different worker completion was accepted unexpectedly.';
  exception
    when others then
      if sqlerrm not like '%worker lease%' then
        raise;
      end if;
  end;

  begin
    perform complete_provider_simulated_run(
      v_run_id,
      v_project_id,
      'runtime-worker',
      v_claim_token,
      v_lease_expires_at + interval '1 second',
      'succeeded',
      'runtime-stale-lease-job',
      v_stale_output_asset_id,
      null,
      '[{"status":"succeeded","source":"runtime-check-stale-lease"}]'::jsonb,
      '{"runtimeCheck":true,"expected":"stale-lease-rejection"}'::jsonb,
      jsonb_build_object(
        'id', v_stale_output_asset_id,
        'source_type', 'generated',
        'storage_url', 'supabase://runtime/stale-lease-output.mp4',
        'content_hash', 'sha256-runtime-stale-lease-output',
        'license_type', 'generated-commercial',
        'consent_status', 'not-required'
      ),
      jsonb_build_array(
        jsonb_build_object(
          'id', gen_random_uuid(),
          'scene_id', v_scene_id,
          'event_type', 'succeeded',
          'status', 'succeeded',
          'actor_id', 'runtime-worker',
          'reason', 'This completion should be rejected because the lease is stale.',
          'provider_job_id', 'runtime-stale-lease-job',
          'output_asset_id', v_stale_output_asset_id,
          'retry_count', 0,
          'metadata', jsonb_build_object('runtimeCheck', true),
          'created_at', v_lease_expires_at + interval '1 second'
        )
      ),
      null,
      null,
      null,
      null
    );

    raise exception 'Stale lease completion was accepted unexpectedly.';
  exception
    when others then
      if sqlerrm not like '%worker lease%' then
        raise;
      end if;
  end;

  select *
  into v_completed_run
  from complete_provider_simulated_run(
    v_run_id,
    v_project_id,
    'runtime-worker',
    v_claim_token,
    v_completed_at,
    'succeeded',
    'runtime-provider-job',
    v_output_asset_id,
    null,
    '[{"status":"succeeded","source":"runtime-check"}]'::jsonb,
    '{"durationSeconds":5,"runtimeCheck":true}'::jsonb,
    jsonb_build_object(
      'id', v_output_asset_id,
      'source_type', 'generated',
      'storage_url', 'supabase://runtime/provider-output.mp4',
      'content_hash', 'sha256-runtime-provider-output',
      'license_type', 'generated-commercial',
      'consent_status', 'not-required'
    ),
    jsonb_build_array(
      jsonb_build_object(
        'id', v_success_event_id,
        'scene_id', v_scene_id,
        'event_type', 'succeeded',
        'status', 'succeeded',
        'actor_id', 'runtime-worker',
        'reason', 'Runtime provider simulation completed.',
        'provider_job_id', 'runtime-provider-job',
        'output_asset_id', v_output_asset_id,
        'retry_count', 0,
        'metadata', jsonb_build_object('runtimeCheck', true),
        'created_at', v_completed_at
      )
    ),
    jsonb_build_object(
      'id', v_validation_report_id,
      'scene_id', v_scene_id,
      'generation_run_id', v_run_id,
      'generated_by', 'runtime-provider-sim',
      'generated_at', v_completed_at,
      'status', 'ready',
      'checks', jsonb_build_array(jsonb_build_object('id', 'runtime', 'status', 'passed')),
      'artifact_asset_ids', jsonb_build_array(v_output_asset_id)
    ),
    jsonb_build_object(
      'id', v_cost_entry_id,
      'scene_id', v_scene_id,
      'generation_run_id', v_run_id,
      'provider', 'Runtime Provider',
      'model', 'Runtime Model',
      'currency', 'USD',
      'estimated_usd', 0.25,
      'approved_usd', 0.25,
      'actual_usd', 0.21,
      'approved_by', 'runtime-owner',
      'budget_id', 'runtime-budget',
      'status', 'spent'
    ),
    jsonb_build_object(
      'id', v_rights_entry_id,
      'scene_id', v_scene_id,
      'asset_id', v_output_asset_id,
      'asset_label', 'Runtime provider output',
      'source', 'generated',
      'status', 'cleared',
      'attribution_required', false,
      'provenance_payload', jsonb_build_object('providerJobId', 'runtime-provider-job')
    ),
    jsonb_build_object(
      'id', v_export_manifest_id,
      'asset_ids', jsonb_build_array(v_output_asset_id),
      'model_runs', jsonb_build_array(v_run_id),
      'rights_summary', jsonb_build_object(
        'status', 'cleared',
        'renderArtifactChecksum', repeat('a', 64),
        'c2paManifestHash', repeat('c', 64)
      ),
      'generated_content_label', 'ai-generated',
      'provenance_summary', jsonb_build_object(
        'generatedContentLabel', 'ai-generated',
        'renderArtifactChecksum', repeat('a', 64),
        'sourceManifestHash', repeat('b', 64),
        'c2paManifestHash', repeat('c', 64),
        'policy', 'local-provider-sim'
      ),
      'render_artifact', jsonb_build_object(
        'id', 'runtime-render-artifact',
        'uri', 'aethon-render://runtime/provider-output.mp4',
        'checksum', repeat('a', 64),
        'checksumAlgorithm', 'sha256',
        'byteSize', 2048,
        'codec', 'h264',
        'container', 'mp4',
        'durationSeconds', 5,
        'frameRate', 24,
        'renderedAtIso', v_completed_at,
        'renderer', 'aethon-local-renderer',
        'rendererVersion', 'provider-sim-runtime-v1',
        'sourceManifestHash', repeat('b', 64)
      ),
      'c2pa_attachment', jsonb_build_object(
        'id', 'runtime-c2pa-attestation',
        'manifestHash', repeat('c', 64),
        'artifactChecksum', repeat('a', 64),
        'status', 'attached',
        'signatureAlgorithm', 'aethon-local-sha256-attestation-v1',
        'signedBy', 'runtime-provider-sim',
        'attachedAtIso', v_completed_at,
        'verificationStatus', 'verified',
        'policy', 'local-provider-sim'
      ),
      'render_artifact_checksum', repeat('a', 64),
      'source_manifest_hash', repeat('b', 64),
      'c2pa_manifest_hash', repeat('c', 64),
      'preview_render_status', 'ready',
      'cost_ledger_entry_ids', jsonb_build_array(v_cost_entry_id),
      'rights_manifest_entry_ids', jsonb_build_array(v_rights_entry_id),
      'final_decision_audit', jsonb_build_array(jsonb_build_object('source', 'runtime-check')),
      'c2pa_status', 'attached'
    )
  );

  if v_completed_run.status <> 'succeeded'
    or v_completed_run.output_asset_id <> v_output_asset_id
    or v_completed_run.lease_owner is not null
    or v_completed_run.claim_token is not null then
    raise exception 'Completion RPC returned unexpected terminal state: %, %, %, %',
      v_completed_run.status,
      v_completed_run.output_asset_id,
      v_completed_run.lease_owner,
      v_completed_run.claim_token;
  end if;

  select *
  into v_retried_completed_run
  from complete_provider_simulated_run(
    v_run_id,
    v_project_id,
    'runtime-worker',
    v_claim_token,
    v_completed_at,
    'succeeded',
    'runtime-provider-job',
    v_output_asset_id,
    null,
    '[{"status":"succeeded","source":"runtime-check-retry"}]'::jsonb,
    '{"durationSeconds":5,"runtimeCheck":true,"retry":true}'::jsonb,
    jsonb_build_object(
      'id', v_output_asset_id,
      'source_type', 'generated',
      'storage_url', 'supabase://runtime/provider-output.mp4',
      'content_hash', 'sha256-runtime-provider-output',
      'license_type', 'generated-commercial',
      'consent_status', 'not-required'
    ),
    jsonb_build_array(
      jsonb_build_object(
        'id', v_success_event_id,
        'scene_id', v_scene_id,
        'event_type', 'succeeded',
        'status', 'succeeded',
        'actor_id', 'runtime-worker',
        'reason', 'Runtime provider simulation completion retry.',
        'provider_job_id', 'runtime-provider-job',
        'output_asset_id', v_output_asset_id,
        'retry_count', 0,
        'metadata', jsonb_build_object('runtimeCheck', true, 'retry', true),
        'created_at', v_completed_at
      )
    ),
    jsonb_build_object(
      'id', v_validation_report_id,
      'scene_id', v_scene_id,
      'generation_run_id', v_run_id,
      'generated_by', 'runtime-provider-sim',
      'generated_at', v_completed_at,
      'status', 'ready',
      'checks', jsonb_build_array(jsonb_build_object('id', 'runtime', 'status', 'passed')),
      'artifact_asset_ids', jsonb_build_array(v_output_asset_id)
    ),
    jsonb_build_object(
      'id', v_cost_entry_id,
      'scene_id', v_scene_id,
      'generation_run_id', v_run_id,
      'provider', 'Runtime Provider',
      'model', 'Runtime Model',
      'currency', 'USD',
      'estimated_usd', 0.25,
      'approved_usd', 0.25,
      'actual_usd', 0.21,
      'approved_by', 'runtime-owner',
      'budget_id', 'runtime-budget',
      'status', 'spent'
    ),
    jsonb_build_object(
      'id', v_rights_entry_id,
      'scene_id', v_scene_id,
      'asset_id', v_output_asset_id,
      'asset_label', 'Runtime provider output',
      'source', 'generated',
      'status', 'cleared',
      'attribution_required', false,
      'provenance_payload', jsonb_build_object('providerJobId', 'runtime-provider-job')
    ),
    jsonb_build_object(
      'id', v_export_manifest_id,
      'asset_ids', jsonb_build_array(v_output_asset_id),
      'model_runs', jsonb_build_array(v_run_id),
      'rights_summary', jsonb_build_object(
        'status', 'cleared',
        'renderArtifactChecksum', repeat('a', 64),
        'c2paManifestHash', repeat('c', 64)
      ),
      'generated_content_label', 'ai-generated',
      'provenance_summary', jsonb_build_object(
        'generatedContentLabel', 'ai-generated',
        'renderArtifactChecksum', repeat('a', 64),
        'sourceManifestHash', repeat('b', 64),
        'c2paManifestHash', repeat('c', 64),
        'policy', 'local-provider-sim',
        'retry', true
      ),
      'render_artifact', jsonb_build_object(
        'id', 'runtime-render-artifact',
        'uri', 'aethon-render://runtime/provider-output.mp4',
        'checksum', repeat('a', 64),
        'checksumAlgorithm', 'sha256',
        'byteSize', 2048,
        'codec', 'h264',
        'container', 'mp4',
        'durationSeconds', 5,
        'frameRate', 24,
        'renderedAtIso', v_completed_at,
        'renderer', 'aethon-local-renderer',
        'rendererVersion', 'provider-sim-runtime-v1',
        'sourceManifestHash', repeat('b', 64)
      ),
      'c2pa_attachment', jsonb_build_object(
        'id', 'runtime-c2pa-attestation',
        'manifestHash', repeat('c', 64),
        'artifactChecksum', repeat('a', 64),
        'status', 'attached',
        'signatureAlgorithm', 'aethon-local-sha256-attestation-v1',
        'signedBy', 'runtime-provider-sim',
        'attachedAtIso', v_completed_at,
        'verificationStatus', 'verified',
        'policy', 'local-provider-sim'
      ),
      'render_artifact_checksum', repeat('a', 64),
      'source_manifest_hash', repeat('b', 64),
      'c2pa_manifest_hash', repeat('c', 64),
      'preview_render_status', 'ready',
      'cost_ledger_entry_ids', jsonb_build_array(v_cost_entry_id),
      'rights_manifest_entry_ids', jsonb_build_array(v_rights_entry_id),
      'final_decision_audit', jsonb_build_array(jsonb_build_object('source', 'runtime-check')),
      'c2pa_status', 'attached'
    )
  );

  if v_retried_completed_run.id <> v_run_id
    or v_retried_completed_run.status <> 'succeeded' then
    raise exception 'Completion RPC retry returned unexpected terminal state: %, %',
      v_retried_completed_run.id,
      v_retried_completed_run.status;
  end if;

  select count(*)
  into v_count
  from generation_run_events
  where project_id = v_project_id
    and generation_run_id = v_run_id
    and event_type in ('queued', 'claimed', 'succeeded');

  if v_count <> 3 then
    raise exception 'Provider-sim run should have queued, claimed, and succeeded events, found %.', v_count;
  end if;

  select count(*)
  into v_count
  from assets
  where project_id = v_project_id
    and id = v_output_asset_id;

  if v_count <> 1 then
    raise exception 'Provider-sim completion should write exactly one output asset, found %.', v_count;
  end if;

  select count(*)
  into v_count
  from validation_reports
  where project_id = v_project_id
    and generation_run_id = v_run_id
    and status = 'ready';

  if v_count <> 1 then
    raise exception 'Provider-sim completion should write one ready validation report, found %.', v_count;
  end if;

  select count(*)
  into v_count
  from cost_ledger_entries
  where project_id = v_project_id
    and generation_run_id = v_run_id
    and status = 'spent';

  if v_count <> 1 then
    raise exception 'Provider-sim completion should write one spent cost ledger entry, found %.', v_count;
  end if;

  select count(*)
  into v_count
  from rights_manifest_entries
  where project_id = v_project_id
    and asset_id = v_output_asset_id
    and status = 'cleared';

  if v_count <> 1 then
    raise exception 'Provider-sim completion should write one cleared rights manifest entry, found %.', v_count;
  end if;

  select count(*)
  into v_count
  from export_manifests
  where id = v_export_manifest_id
    and project_id = v_project_id
    and preview_render_status = 'ready'
    and generated_content_label = 'ai-generated'
    and c2pa_status = 'attached'
    and render_artifact_checksum = repeat('a', 64)
    and source_manifest_hash = repeat('b', 64)
    and c2pa_manifest_hash = repeat('c', 64)
    and render_artifact ->> 'checksumAlgorithm' = 'sha256'
    and c2pa_attachment ->> 'verificationStatus' = 'verified'
    and c2pa_attachment ->> 'policy' = 'local-provider-sim';

  if v_count <> 1 then
    raise exception 'Provider-sim completion should write one ready export manifest with attached local C2PA-ready evidence, found %.', v_count;
  end if;

  insert into ai_suggestions (
    id,
    project_id,
    scene_id,
    user_id,
    task_id,
    title,
    summary,
    recommended_option_id,
    alternatives,
    mode_at_creation,
    gate_status,
    requires_approval
  )
  values (
    v_failed_suggestion_id,
    v_project_id,
    v_scene_id,
    'runtime-owner',
    'runtime-provider-sim-failure',
    'Approve failed runtime provider simulation',
    'Queue a provider-sim run that should complete as failed.',
    'runtime-provider-capability',
    '[{"id":"runtime-provider-capability","label":"Runtime Provider"}]'::jsonb,
    'adviser',
    'requires-approval',
    true
  );

  select *
  into v_failed_queued_run
  from record_ai_decision_and_queue_generation_run(
    v_failed_suggestion_id,
    'accepted',
    'Runtime verification accepted this failed-path adviser suggestion.',
    '{"source":"provider-sim-runtime-check","path":"failed"}'::jsonb,
    v_failed_queued_at,
    v_failed_run_id,
    v_project_id,
    v_scene_id,
    'runtime-provider-capability',
    'runtime-provider',
    'runtime-model',
    'Runtime Provider',
    'Runtime Model',
    '2026-05',
    'https://example.invalid/runtime-provider/terms',
    v_verified_at,
    'runtime-failed-prompt-hash',
    '{}'::uuid[],
    null,
    0.2500,
    'queued',
    'adviser',
    'approved-suggestion',
    0,
    2,
    null,
    null,
    null,
    '[{"status":"queued","source":"runtime-check","path":"failed"}]'::jsonb,
    '{"runtimeCheck":true,"path":"failed"}'::jsonb,
    v_failed_queued_at,
    v_failed_queued_at
  );

  if v_failed_queued_run.id <> v_failed_run_id or v_failed_queued_run.status <> 'queued' then
    raise exception 'Failed-path queue RPC returned unexpected run state: %, %',
      v_failed_queued_run.id,
      v_failed_queued_run.status;
  end if;

  select *
  into v_failed_claimed_run
  from claim_generation_run(
    v_failed_run_id,
    v_project_id,
    'runtime-worker',
    v_failed_claim_token,
    v_failed_lease_expires_at,
    v_failed_claimed_at,
    v_failed_claim_event_id,
    'Runtime worker claimed failed-path provider-sim run.'
  );

  if v_failed_claimed_run.status <> 'running'
    or v_failed_claimed_run.lease_owner <> 'runtime-worker'
    or v_failed_claimed_run.claim_token <> v_failed_claim_token then
    raise exception 'Failed-path claim RPC returned unexpected lease state: %, %, %',
      v_failed_claimed_run.status,
      v_failed_claimed_run.lease_owner,
      v_failed_claimed_run.claim_token;
  end if;

  select *
  into v_failed_completed_run
  from complete_provider_simulated_run(
    v_failed_run_id,
    v_project_id,
    'runtime-worker',
    v_failed_claim_token,
    v_failed_completed_at,
    'failed',
    'runtime-provider-job-failed',
    null,
    'Runtime provider simulation intentionally failed.',
    '[{"status":"failed","source":"runtime-check"}]'::jsonb,
    '{"runtimeCheck":true,"failure":"intentional"}'::jsonb,
    null,
    jsonb_build_array(
      jsonb_build_object(
        'id', v_failed_event_id,
        'scene_id', v_scene_id,
        'event_type', 'failed',
        'status', 'failed',
        'actor_id', 'runtime-worker',
        'reason', 'Runtime provider simulation intentionally failed.',
        'provider_job_id', 'runtime-provider-job-failed',
        'failure_reason', 'Runtime provider simulation intentionally failed.',
        'retry_count', 0,
        'metadata', jsonb_build_object('runtimeCheck', true, 'path', 'failed'),
        'created_at', v_failed_completed_at
      )
    ),
    null,
    null,
    null,
    null
  );

  if v_failed_completed_run.status <> 'failed'
    or v_failed_completed_run.output_asset_id is not null
    or v_failed_completed_run.failure_reason is null then
    raise exception 'Failed-path completion RPC returned unexpected terminal state: %, %, %',
      v_failed_completed_run.status,
      v_failed_completed_run.output_asset_id,
      v_failed_completed_run.failure_reason;
  end if;

  select count(*)
  into v_count
  from generation_run_events
  where project_id = v_project_id
    and generation_run_id = v_failed_run_id
    and event_type in ('queued', 'claimed', 'failed');

  if v_count <> 3 then
    raise exception 'Failed provider-sim run should have queued, claimed, and failed events, found %.', v_count;
  end if;

  select count(*)
  into v_count
  from export_manifests
  where project_id = v_project_id
    and model_runs @> array[v_failed_run_id]::uuid[];

  if v_count <> 0 then
    raise exception 'Failed provider-sim completion should not write export manifests, found %.', v_count;
  end if;

  perform set_config('request.jwt.claims', '{"sub":"runtime-stranger"}', true);

  select count(*)
  into v_count
  from generation_runs
  where project_id = v_project_id;

  if v_count <> 0 then
    raise exception 'RLS leaked runtime generation runs to a non-owner user, found %.', v_count;
  end if;

  execute 'reset role';
  execute 'alter table generation_run_events disable trigger generation_run_events_append_only';

  delete from projects
  where id = v_project_id;

  execute 'alter table generation_run_events enable trigger generation_run_events_append_only';
end $$;
