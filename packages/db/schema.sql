-- AETHON production-bound schema draft.
-- Auth model: Clerk issues a Supabase JWT template whose `sub` claim is the Clerk user id.
-- RLS uses requesting_user_id() and never trusts mutable user_metadata.

create extension if not exists "pgcrypto";

create or replace function requesting_user_id()
returns text
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::json ->> 'sub', '')::text;
$$;

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null default requesting_user_id(),
  title text not null,
  art_style text,
  mood_palette jsonb not null default '[]'::jsonb,
  world_bible jsonb not null default '{}'::jsonb,
  ai_global_mode text not null default 'adviser' check (ai_global_mode in ('auto', 'adviser', 'off')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function owns_project(project_uuid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from projects
    where id = project_uuid
      and owner_id = requesting_user_id()
  );
$$;

create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  source_type text not null check (source_type in ('upload', 'generated', 'external-link', 'stock')),
  storage_url text,
  content_hash text,
  license_type text not null default 'unknown',
  consent_status text not null default 'unknown' check (consent_status in ('unknown', 'granted', 'restricted', 'missing', 'not-required')),
  retention_until timestamptz,
  created_at timestamptz not null default now(),
  unique (project_id, id)
);

create table if not exists characters (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  role text,
  appearance text,
  personality jsonb not null default '{}'::jsonb,
  ref_asset_id uuid references assets(id) on delete set null,
  is_real_person boolean not null default false,
  consent_asset_id uuid references assets(id) on delete set null,
  consistency_threshold numeric(5,2) not null default 80,
  created_at timestamptz not null default now()
);

create table if not exists backgrounds (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  description text,
  time_of_day text,
  weather text,
  season text,
  ref_asset_id uuid references assets(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists scenes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  scene_index integer not null,
  title text not null,
  intent text,
  duration_seconds numeric(6,2) not null default 5,
  image_prompt text,
  video_prompt text,
  image_model text,
  video_model text,
  model_auto_selected boolean not null default true,
  model_selection_reason text,
  ai_mode text not null default 'adviser' check (ai_mode in ('auto', 'adviser', 'off')),
  inpaint_pins jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (project_id, scene_index)
);

create table if not exists ai_preferences (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id text not null default requesting_user_id(),
  global_mode text not null default 'adviser' check (global_mode in ('auto', 'adviser', 'off')),
  task_modes jsonb not null default '{}'::jsonb,
  approval_thresholds jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create table if not exists ai_suggestions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  scene_id uuid not null references scenes(id) on delete cascade,
  user_id text not null default requesting_user_id(),
  task_id text not null,
  suggestion_type text not null default 'ai-control',
  title text not null,
  summary text not null default '',
  recommended_option_id text,
  alternatives jsonb not null default '[]'::jsonb,
  risk_flags jsonb not null default '[]'::jsonb,
  mode_at_creation text not null default 'adviser' check (mode_at_creation in ('auto', 'adviser', 'off')),
  gate_status text not null default 'requires-approval' check (gate_status in ('ready', 'requires-approval', 'blocked')),
  requires_approval boolean not null default true,
  user_decision text not null default 'pending' check (user_decision in ('pending', 'accepted', 'dismissed', 'edited')),
  decision_reason text,
  decision_audit jsonb not null default '{}'::jsonb,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists generation_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  scene_id uuid not null references scenes(id) on delete cascade,
  suggestion_id uuid references ai_suggestions(id) on delete set null,
  user_id text not null default requesting_user_id(),
  provider_capability_id text not null,
  provider_key text not null,
  model_key text not null,
  provider text not null,
  model text not null,
  pricing_version text not null,
  provider_terms_url text not null,
  provider_capability_verified_at timestamptz not null,
  provider_job_id text,
  lease_owner text,
  lease_expires_at timestamptz,
  claim_token text,
  claimed_at timestamptz,
  prompt_hash text,
  input_asset_ids uuid[] not null default '{}',
  output_asset_id uuid references assets(id) on delete set null,
  cost_estimate numeric(10,4),
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  trigger_mode text not null default 'adviser' check (trigger_mode in ('auto', 'adviser', 'off')),
  trigger_source text not null default 'approved-suggestion' check (trigger_source in ('approved-suggestion', 'auto-policy', 'manual-override')),
  retry_count integer not null default 0 check (retry_count >= 0),
  max_retries integer not null default 2 check (max_retries >= 0),
  failure_reason text,
  started_at timestamptz,
  completed_at timestamptz,
  audit_trail jsonb not null default '[]'::jsonb,
  status_detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, id)
);

create table if not exists generation_run_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  generation_run_id uuid not null,
  scene_id uuid not null references scenes(id) on delete cascade,
  event_type text not null check (event_type in ('queued', 'claimed', 'running', 'succeeded', 'failed', 'cancelled', 'retry-scheduled')),
  status text not null check (status in ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  actor_id text not null,
  reason text not null,
  provider_job_id text,
  output_asset_id uuid references assets(id) on delete set null,
  failure_reason text,
  retry_count integer not null default 0 check (retry_count >= 0),
  lease_owner text,
  lease_expires_at timestamptz,
  claim_token text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (project_id, generation_run_id)
    references generation_runs(project_id, id)
    on delete cascade
);

create table if not exists scene_scores (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  scene_id uuid not null references scenes(id) on delete cascade,
  character_score numeric(5,2),
  brand_score numeric(5,2),
  style_score numeric(5,2),
  review_status text not null default 'pending' check (review_status in ('pending', 'passed', 'warning', 'blocked')),
  created_at timestamptz not null default now()
);

create table if not exists provider_capability_versions (
  id text not null,
  project_id uuid not null references projects(id) on delete cascade,
  provider_key text not null,
  model_key text not null,
  provider text not null,
  model text not null,
  kind text not null check (kind in ('image', 'video', 'local')),
  lifecycle_status text not null default 'active' check (lifecycle_status in ('active', 'stale', 'deprecated', 'disabled')),
  capability jsonb not null default '{}'::jsonb,
  pricing_version text not null,
  provider_terms_url text not null,
  source_url text not null,
  terms_risk text not null default 'medium' check (terms_risk in ('low', 'medium', 'high')),
  data_retention text not null default 'unknown' check (data_retention in ('unknown', 'none', 'temporary', 'provider-retained')),
  commercial_use_allowed boolean not null default false,
  region_availability text[] not null default '{}',
  last_verified_at timestamptz not null,
  verified_expires_at timestamptz not null,
  deprecated_at timestamptz,
  replacement_capability_id text,
  created_at timestamptz not null default now(),
  primary key (project_id, id),
  unique (project_id, provider_key, model_key, pricing_version)
);

do $$
begin
  alter table generation_runs
    add constraint generation_runs_provider_capability_fk
    foreign key (project_id, provider_capability_id)
    references provider_capability_versions(project_id, id)
    on update cascade;
exception
  when duplicate_object then null;
end $$;

create table if not exists scene_specs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  scene_id uuid not null references scenes(id) on delete cascade,
  requested_by text not null default requesting_user_id(),
  decision_suggestion_id uuid references ai_suggestions(id) on delete set null,
  approval_policy jsonb not null default '{}'::jsonb,
  user_intent text not null,
  camera_angle text not null,
  emotion text not null,
  shot_type text not null,
  budget_priority text not null check (budget_priority in ('lowest-cost', 'balanced', 'quality-first')),
  is_highlight boolean not null default false,
  target_aspect_ratio text not null default '16:9',
  provider_input_mode text not null,
  image_prompt text not null default '',
  video_prompt text not null default '',
  image_model text not null default '',
  video_model text not null default '',
  selection_mode text not null default 'ai-advised' check (selection_mode in ('ai-advised', 'manual-override', 'locked')),
  manual_override_reason text,
  source_asset_ids uuid[] not null default '{}',
  reference_asset_ids uuid[] not null default '{}',
  constraints jsonb not null default '{}'::jsonb,
  continuity_locks jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, scene_id)
);

create table if not exists validation_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  scene_id uuid not null references scenes(id) on delete cascade,
  generation_run_id uuid,
  generated_by text not null default 'system',
  generated_at timestamptz not null default now(),
  status text not null default 'needs-review' check (status in ('ready', 'needs-review', 'blocked')),
  checks jsonb not null default '[]'::jsonb,
  artifact_asset_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  foreign key (project_id, generation_run_id)
    references generation_runs(project_id, id)
);

create table if not exists cost_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  scene_id uuid references scenes(id) on delete cascade,
  generation_run_id uuid,
  provider text not null,
  model text not null,
  currency text not null default 'USD' check (currency = 'USD'),
  estimated_usd numeric(10,4) not null default 0,
  approved_usd numeric(10,4) not null default 0,
  actual_usd numeric(10,4),
  approved_by text,
  budget_id text,
  status text not null default 'estimated' check (status in ('estimated', 'approved', 'spent')),
  created_at timestamptz not null default now(),
  foreign key (project_id, generation_run_id)
    references generation_runs(project_id, id)
);

create table if not exists rights_manifest_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  scene_id uuid references scenes(id) on delete cascade,
  asset_id uuid,
  asset_label text not null,
  source text not null check (source in ('generated', 'uploaded', 'licensed', 'manual')),
  status text not null default 'needs-review' check (status in ('cleared', 'needs-review', 'blocked')),
  attribution_required boolean not null default false,
  attribution_text text,
  license_evidence_asset_id uuid,
  consent_evidence_asset_id uuid,
  provenance_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (project_id, asset_id)
    references assets(project_id, id),
  foreign key (project_id, license_evidence_asset_id)
    references assets(project_id, id),
  foreign key (project_id, consent_evidence_asset_id)
    references assets(project_id, id)
);

create table if not exists export_manifests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  asset_ids uuid[] not null default '{}',
  model_runs uuid[] not null default '{}',
  rights_summary jsonb not null default '{}'::jsonb,
  generated_content_label text not null default 'not-labeled'
    check (generated_content_label in ('not-labeled', 'ai-generated', 'mixed-source', 'manual-only')),
  provenance_summary jsonb not null default '{}'::jsonb,
  render_artifact jsonb,
  c2pa_attachment jsonb,
  render_artifact_checksum text,
  source_manifest_hash text,
  c2pa_manifest_hash text,
  preview_render_status text not null default 'not-rendered' check (preview_render_status in ('not-rendered', 'rendering', 'ready')),
  cost_ledger_entry_ids uuid[] not null default '{}',
  rights_manifest_entry_ids uuid[] not null default '{}',
  final_decision_audit jsonb not null default '[]'::jsonb,
  c2pa_status text not null default 'not-attached'
    check (c2pa_status in ('not-attached', 'attached', 'failed', 'not-required')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (preview_render_status <> 'ready' or render_artifact_checksum is not null),
  check (c2pa_status <> 'attached' or c2pa_attachment is not null)
);

alter table export_manifests
  add column if not exists preview_render_status text not null default 'not-rendered'
    check (preview_render_status in ('not-rendered', 'rendering', 'ready')),
  add column if not exists generated_content_label text not null default 'not-labeled'
    check (generated_content_label in ('not-labeled', 'ai-generated', 'mixed-source', 'manual-only')),
  add column if not exists provenance_summary jsonb not null default '{}'::jsonb,
  add column if not exists render_artifact jsonb,
  add column if not exists c2pa_attachment jsonb,
  add column if not exists render_artifact_checksum text,
  add column if not exists source_manifest_hash text,
  add column if not exists c2pa_manifest_hash text,
  add column if not exists cost_ledger_entry_ids uuid[] not null default '{}',
  add column if not exists rights_manifest_entry_ids uuid[] not null default '{}',
  add column if not exists final_decision_audit jsonb not null default '[]'::jsonb,
  add column if not exists c2pa_status text not null default 'not-attached'
    check (c2pa_status in ('not-attached', 'attached', 'failed', 'not-required')),
  add column if not exists updated_at timestamptz not null default now();

alter table export_manifests
  drop constraint if exists export_manifests_ready_render_artifact_check,
  drop constraint if exists export_manifests_attached_c2pa_check;

alter table export_manifests
  add constraint export_manifests_ready_render_artifact_check
    check (preview_render_status <> 'ready' or render_artifact_checksum is not null),
  add constraint export_manifests_attached_c2pa_check
    check (c2pa_status <> 'attached' or c2pa_attachment is not null);

create index if not exists assets_project_id_idx on assets(project_id);
create index if not exists characters_project_id_idx on characters(project_id);
create index if not exists backgrounds_project_id_idx on backgrounds(project_id);
create index if not exists scenes_project_id_idx on scenes(project_id);
create index if not exists ai_preferences_project_user_idx on ai_preferences(project_id, user_id);
create index if not exists ai_suggestions_project_scene_idx on ai_suggestions(project_id, scene_id);
create index if not exists generation_runs_project_status_idx on generation_runs(project_id, status);
create index if not exists generation_runs_suggestion_id_idx on generation_runs(suggestion_id);
create index if not exists generation_run_events_run_created_idx on generation_run_events(project_id, generation_run_id, created_at);
create unique index if not exists generation_run_events_claim_token_once_idx
  on generation_run_events(project_id, generation_run_id, claim_token)
  where claim_token is not null;
create unique index if not exists generation_run_events_queued_once_idx
  on generation_run_events(project_id, generation_run_id, event_type, retry_count)
  where event_type = 'queued';
create unique index if not exists generation_runs_approved_suggestion_once_idx
  on generation_runs(project_id, suggestion_id, trigger_source)
  where suggestion_id is not null and trigger_source = 'approved-suggestion';
create index if not exists scene_scores_project_scene_idx on scene_scores(project_id, scene_id);
create index if not exists provider_capability_versions_project_model_idx on provider_capability_versions(project_id, provider_key, model_key);
create index if not exists scene_specs_project_scene_idx on scene_specs(project_id, scene_id);
create index if not exists validation_reports_project_scene_idx on validation_reports(project_id, scene_id);
create index if not exists cost_ledger_entries_project_scene_idx on cost_ledger_entries(project_id, scene_id);
create index if not exists rights_manifest_entries_project_scene_idx on rights_manifest_entries(project_id, scene_id);
create index if not exists export_manifests_project_id_idx on export_manifests(project_id);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function prevent_generation_run_event_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'generation_run_events is append-only.';
end;
$$;

create or replace function claim_generation_run(
  p_run_id uuid,
  p_project_id uuid,
  p_actor_id text,
  p_claim_token text,
  p_lease_expires_at timestamptz,
  p_claimed_at timestamptz,
  p_event_id uuid,
  p_reason text
)
returns generation_runs
language plpgsql
security invoker
set search_path = public
as $$
declare
  claimed_run generation_runs;
begin
  if nullif(trim(p_actor_id), '') is null then
    raise exception 'A generation run claim needs an actor id.';
  end if;

  if nullif(trim(p_claim_token), '') is null then
    raise exception 'A generation run claim needs a claim token.';
  end if;

  if p_lease_expires_at <= p_claimed_at then
    raise exception 'Generation run lease expiry must be after claim time.';
  end if;

  select *
  into claimed_run
  from generation_runs
  where id = p_run_id
    and project_id = p_project_id
    and lease_owner = p_actor_id
    and claim_token = p_claim_token
    and lease_expires_at > p_claimed_at
  limit 1;

  if claimed_run.id is not null then
    return claimed_run;
  end if;

  update generation_runs
  set
    status = 'running',
    lease_owner = p_actor_id,
    lease_expires_at = p_lease_expires_at,
    claim_token = p_claim_token,
    claimed_at = p_claimed_at,
    started_at = coalesce(started_at, p_claimed_at),
    updated_at = p_claimed_at,
    audit_trail = audit_trail || jsonb_build_array(
      jsonb_build_object(
        'status', 'running',
        'at', p_claimed_at,
        'actorId', p_actor_id,
        'reason', p_reason
      )
    )
  where id = p_run_id
    and project_id = p_project_id
    and status in ('queued', 'running')
    and (lease_expires_at is null or lease_expires_at <= p_claimed_at)
  returning * into claimed_run;

  if claimed_run.id is null then
    raise exception 'Generation run % cannot be claimed because it is missing, terminal, or actively leased.', p_run_id;
  end if;

  insert into generation_run_events (
    id,
    project_id,
    generation_run_id,
    scene_id,
    event_type,
    status,
    actor_id,
    reason,
    provider_job_id,
    output_asset_id,
    failure_reason,
    retry_count,
    lease_owner,
    lease_expires_at,
    claim_token,
    metadata,
    created_at
  )
  values (
    p_event_id,
    claimed_run.project_id,
    claimed_run.id,
    claimed_run.scene_id,
    'claimed',
    claimed_run.status,
    p_actor_id,
    p_reason,
    claimed_run.provider_job_id,
    claimed_run.output_asset_id,
    claimed_run.failure_reason,
    claimed_run.retry_count,
    claimed_run.lease_owner,
    claimed_run.lease_expires_at,
    claimed_run.claim_token,
    jsonb_build_object('leaseSeconds', extract(epoch from (p_lease_expires_at - p_claimed_at))),
    p_claimed_at
  );

  return claimed_run;
end;
$$;

create or replace function complete_provider_simulated_run(
  p_run_id uuid,
  p_project_id uuid,
  p_actor_id text,
  p_claim_token text,
  p_completed_at timestamptz,
  p_status text,
  p_provider_job_id text,
  p_output_asset_id uuid,
  p_failure_reason text,
  p_audit_trail jsonb,
  p_status_detail jsonb,
  p_output_asset jsonb,
  p_events jsonb,
  p_validation_report jsonb,
  p_cost_ledger_entry jsonb,
  p_rights_manifest_entry jsonb,
  p_export_manifest jsonb
)
returns generation_runs
language plpgsql
security invoker
set search_path = public
as $$
declare
  completed_run generation_runs;
begin
  if nullif(trim(p_actor_id), '') is null then
    raise exception 'A provider-sim completion needs an actor id.';
  end if;

  if nullif(trim(p_claim_token), '') is null then
    raise exception 'A provider-sim completion needs a claim token.';
  end if;

  if p_completed_at is null then
    raise exception 'A provider-sim completion needs a completion timestamp.';
  end if;

  if p_status not in ('succeeded', 'failed') then
    raise exception 'Provider-sim completion can only write succeeded or failed terminal states.';
  end if;

  if p_status = 'succeeded' and p_output_asset_id is null then
    raise exception 'A succeeded provider-sim completion needs an output asset id.';
  end if;

  select *
  into completed_run
  from generation_runs
  where id = p_run_id
    and project_id = p_project_id
    and status = p_status
    and exists (
      select 1
      from generation_run_events
      where project_id = p_project_id
        and generation_run_id = p_run_id
        and event_type = 'claimed'
        and actor_id = p_actor_id
        and claim_token = p_claim_token
    )
  limit 1;

  if completed_run.id is not null then
    return completed_run;
  end if;

  if p_status = 'succeeded' then
    if p_output_asset is null or (p_output_asset ->> 'id')::uuid <> p_output_asset_id then
      raise exception 'A succeeded provider-sim completion needs an output asset payload matching its output asset id.';
    end if;

    insert into assets (
      id,
      project_id,
      source_type,
      storage_url,
      content_hash,
      license_type,
      consent_status,
      retention_until
    )
    values (
      (p_output_asset ->> 'id')::uuid,
      p_project_id,
      p_output_asset ->> 'source_type',
      nullif(p_output_asset ->> 'storage_url', ''),
      nullif(p_output_asset ->> 'content_hash', ''),
      coalesce(nullif(p_output_asset ->> 'license_type', ''), 'unknown'),
      coalesce(nullif(p_output_asset ->> 'consent_status', ''), 'unknown'),
      nullif(p_output_asset ->> 'retention_until', '')::timestamptz
    )
    on conflict (project_id, id) do update
    set
      source_type = excluded.source_type,
      storage_url = excluded.storage_url,
      content_hash = excluded.content_hash,
      license_type = excluded.license_type,
      consent_status = excluded.consent_status,
      retention_until = excluded.retention_until;
  end if;

  update generation_runs
  set
    provider_job_id = p_provider_job_id,
    output_asset_id = p_output_asset_id,
    status = p_status,
    failure_reason = p_failure_reason,
    completed_at = p_completed_at,
    updated_at = p_completed_at,
    lease_owner = null,
    lease_expires_at = null,
    claim_token = null,
    claimed_at = null,
    audit_trail = coalesce(p_audit_trail, audit_trail),
    status_detail = coalesce(p_status_detail, '{}'::jsonb)
  where id = p_run_id
    and project_id = p_project_id
    and status = 'running'
    and lease_owner = p_actor_id
    and claim_token = p_claim_token
    and lease_expires_at > p_completed_at
  returning * into completed_run;

  if completed_run.id is null then
    raise exception 'Generation run % was not completed because its worker lease is missing, stale, or owned by another worker.', p_run_id;
  end if;

  insert into generation_run_events (
    id,
    project_id,
    generation_run_id,
    scene_id,
    event_type,
    status,
    actor_id,
    reason,
    provider_job_id,
    output_asset_id,
    failure_reason,
    retry_count,
    lease_owner,
    lease_expires_at,
    claim_token,
    metadata,
    created_at
  )
  select
    (event_row.value ->> 'id')::uuid,
    p_project_id,
    p_run_id,
    (event_row.value ->> 'scene_id')::uuid,
    event_row.value ->> 'event_type',
    event_row.value ->> 'status',
    event_row.value ->> 'actor_id',
    event_row.value ->> 'reason',
    nullif(event_row.value ->> 'provider_job_id', ''),
    nullif(event_row.value ->> 'output_asset_id', '')::uuid,
    nullif(event_row.value ->> 'failure_reason', ''),
    coalesce((event_row.value ->> 'retry_count')::integer, 0),
    nullif(event_row.value ->> 'lease_owner', ''),
    nullif(event_row.value ->> 'lease_expires_at', '')::timestamptz,
    case
      when event_row.value ->> 'event_type' = 'claimed'
        then nullif(event_row.value ->> 'claim_token', '')
      else null
    end,
    coalesce(event_row.value -> 'metadata', '{}'::jsonb),
    (event_row.value ->> 'created_at')::timestamptz
  from jsonb_array_elements(coalesce(p_events, '[]'::jsonb)) as event_row(value)
  on conflict do nothing;

  if p_status = 'succeeded' and p_validation_report is not null then
    insert into validation_reports (
      id,
      project_id,
      scene_id,
      generation_run_id,
      generated_by,
      generated_at,
      status,
      checks,
      artifact_asset_ids
    )
    values (
      (p_validation_report ->> 'id')::uuid,
      p_project_id,
      (p_validation_report ->> 'scene_id')::uuid,
      (p_validation_report ->> 'generation_run_id')::uuid,
      coalesce(nullif(p_validation_report ->> 'generated_by', ''), 'system'),
      (p_validation_report ->> 'generated_at')::timestamptz,
      p_validation_report ->> 'status',
      coalesce(p_validation_report -> 'checks', '[]'::jsonb),
      (
        select coalesce(array_agg(value::uuid), '{}'::uuid[])
        from jsonb_array_elements_text(
          coalesce(p_validation_report -> 'artifact_asset_ids', '[]'::jsonb)
        ) as artifact_values(value)
      )
    )
    on conflict do nothing;
  end if;

  if p_status = 'succeeded' and p_cost_ledger_entry is not null then
    insert into cost_ledger_entries (
      id,
      project_id,
      scene_id,
      generation_run_id,
      provider,
      model,
      currency,
      estimated_usd,
      approved_usd,
      actual_usd,
      approved_by,
      budget_id,
      status
    )
    values (
      (p_cost_ledger_entry ->> 'id')::uuid,
      p_project_id,
      nullif(p_cost_ledger_entry ->> 'scene_id', '')::uuid,
      (p_cost_ledger_entry ->> 'generation_run_id')::uuid,
      p_cost_ledger_entry ->> 'provider',
      p_cost_ledger_entry ->> 'model',
      coalesce(nullif(p_cost_ledger_entry ->> 'currency', ''), 'USD'),
      coalesce((p_cost_ledger_entry ->> 'estimated_usd')::numeric, 0),
      coalesce((p_cost_ledger_entry ->> 'approved_usd')::numeric, 0),
      nullif(p_cost_ledger_entry ->> 'actual_usd', '')::numeric,
      nullif(p_cost_ledger_entry ->> 'approved_by', ''),
      nullif(p_cost_ledger_entry ->> 'budget_id', ''),
      p_cost_ledger_entry ->> 'status'
    )
    on conflict do nothing;
  end if;

  if p_status = 'succeeded' and p_rights_manifest_entry is not null then
    insert into rights_manifest_entries (
      id,
      project_id,
      scene_id,
      asset_id,
      asset_label,
      source,
      status,
      attribution_required,
      attribution_text,
      license_evidence_asset_id,
      consent_evidence_asset_id,
      provenance_payload
    )
    values (
      (p_rights_manifest_entry ->> 'id')::uuid,
      p_project_id,
      nullif(p_rights_manifest_entry ->> 'scene_id', '')::uuid,
      nullif(p_rights_manifest_entry ->> 'asset_id', '')::uuid,
      p_rights_manifest_entry ->> 'asset_label',
      p_rights_manifest_entry ->> 'source',
      p_rights_manifest_entry ->> 'status',
      coalesce((p_rights_manifest_entry ->> 'attribution_required')::boolean, false),
      nullif(p_rights_manifest_entry ->> 'attribution_text', ''),
      nullif(p_rights_manifest_entry ->> 'license_evidence_asset_id', '')::uuid,
      nullif(p_rights_manifest_entry ->> 'consent_evidence_asset_id', '')::uuid,
      coalesce(p_rights_manifest_entry -> 'provenance_payload', '{}'::jsonb)
    )
    on conflict do nothing;
  end if;

  if p_status = 'succeeded' and p_export_manifest is not null then
    insert into export_manifests (
      id,
      project_id,
      asset_ids,
      model_runs,
      rights_summary,
      generated_content_label,
      provenance_summary,
      render_artifact,
      c2pa_attachment,
      render_artifact_checksum,
      source_manifest_hash,
      c2pa_manifest_hash,
      preview_render_status,
      cost_ledger_entry_ids,
      rights_manifest_entry_ids,
      final_decision_audit,
      c2pa_status,
      updated_at
    )
    values (
      (p_export_manifest ->> 'id')::uuid,
      p_project_id,
      (
        select coalesce(array_agg(value::uuid), '{}'::uuid[])
        from jsonb_array_elements_text(
          coalesce(p_export_manifest -> 'asset_ids', '[]'::jsonb)
        ) as asset_values(value)
      ),
      (
        select coalesce(array_agg(value::uuid), '{}'::uuid[])
        from jsonb_array_elements_text(
          coalesce(p_export_manifest -> 'model_runs', '[]'::jsonb)
        ) as model_values(value)
      ),
      coalesce(p_export_manifest -> 'rights_summary', '{}'::jsonb),
      coalesce(nullif(p_export_manifest ->> 'generated_content_label', ''), 'not-labeled'),
      coalesce(p_export_manifest -> 'provenance_summary', '{}'::jsonb),
      p_export_manifest -> 'render_artifact',
      p_export_manifest -> 'c2pa_attachment',
      coalesce(
        nullif(p_export_manifest ->> 'render_artifact_checksum', ''),
        nullif(p_export_manifest #>> '{render_artifact,checksum}', '')
      ),
      nullif(p_export_manifest #>> '{render_artifact,sourceManifestHash}', ''),
      coalesce(
        nullif(p_export_manifest ->> 'c2pa_manifest_hash', ''),
        nullif(p_export_manifest #>> '{c2pa_attachment,manifestHash}', '')
      ),
      coalesce(nullif(p_export_manifest ->> 'preview_render_status', ''), 'not-rendered'),
      (
        select coalesce(array_agg(value::uuid), '{}'::uuid[])
        from jsonb_array_elements_text(
          coalesce(p_export_manifest -> 'cost_ledger_entry_ids', '[]'::jsonb)
        ) as cost_values(value)
      ),
      (
        select coalesce(array_agg(value::uuid), '{}'::uuid[])
        from jsonb_array_elements_text(
          coalesce(p_export_manifest -> 'rights_manifest_entry_ids', '[]'::jsonb)
        ) as rights_values(value)
      ),
      coalesce(p_export_manifest -> 'final_decision_audit', '[]'::jsonb),
      coalesce(nullif(p_export_manifest ->> 'c2pa_status', ''), 'not-attached'),
      p_completed_at
    )
    on conflict (id) do update
    set
      asset_ids = excluded.asset_ids,
      model_runs = excluded.model_runs,
      rights_summary = excluded.rights_summary,
      generated_content_label = excluded.generated_content_label,
      provenance_summary = excluded.provenance_summary,
      render_artifact = excluded.render_artifact,
      c2pa_attachment = excluded.c2pa_attachment,
      render_artifact_checksum = excluded.render_artifact_checksum,
      source_manifest_hash = excluded.source_manifest_hash,
      c2pa_manifest_hash = excluded.c2pa_manifest_hash,
      preview_render_status = excluded.preview_render_status,
      cost_ledger_entry_ids = excluded.cost_ledger_entry_ids,
      rights_manifest_entry_ids = excluded.rights_manifest_entry_ids,
      final_decision_audit = excluded.final_decision_audit,
      c2pa_status = excluded.c2pa_status,
      updated_at = excluded.updated_at;
  end if;

  return completed_run;
end;
$$;

drop trigger if exists projects_set_updated_at on projects;
create trigger projects_set_updated_at
before update on projects
for each row execute function set_updated_at();

drop trigger if exists ai_preferences_set_updated_at on ai_preferences;
create trigger ai_preferences_set_updated_at
before update on ai_preferences
for each row execute function set_updated_at();

drop trigger if exists generation_runs_set_updated_at on generation_runs;
create trigger generation_runs_set_updated_at
before update on generation_runs
for each row execute function set_updated_at();

drop trigger if exists generation_run_events_append_only on generation_run_events;
create trigger generation_run_events_append_only
before update or delete on generation_run_events
for each row execute function prevent_generation_run_event_mutation();

drop trigger if exists scene_specs_set_updated_at on scene_specs;
create trigger scene_specs_set_updated_at
before update on scene_specs
for each row execute function set_updated_at();

drop trigger if exists export_manifests_set_updated_at on export_manifests;
create trigger export_manifests_set_updated_at
before update on export_manifests
for each row execute function set_updated_at();

create or replace function record_ai_decision_and_queue_generation_run(
  p_suggestion_id uuid,
  p_decision text,
  p_decision_reason text,
  p_decision_audit jsonb,
  p_decided_at timestamptz,
  p_run_id uuid,
  p_project_id uuid,
  p_scene_id uuid,
  p_provider_capability_id text,
  p_provider_key text,
  p_model_key text,
  p_provider text,
  p_model text,
  p_pricing_version text,
  p_provider_terms_url text,
  p_provider_capability_verified_at timestamptz,
  p_prompt_hash text,
  p_input_asset_ids uuid[],
  p_output_asset_id uuid,
  p_cost_estimate numeric,
  p_status text,
  p_trigger_mode text,
  p_trigger_source text,
  p_retry_count integer,
  p_max_retries integer,
  p_failure_reason text,
  p_started_at timestamptz,
  p_completed_at timestamptz,
  p_audit_trail jsonb,
  p_status_detail jsonb,
  p_created_at timestamptz,
  p_updated_at timestamptz
)
returns generation_runs
language plpgsql
security invoker
set search_path = public
as $$
declare
  updated_suggestion_id uuid;
  queued_run generation_runs;
  matched_capability_id text;
begin
  if p_decision not in ('accepted', 'edited') then
    raise exception 'Only accepted or edited adviser decisions can queue generation runs.';
  end if;

  if p_trigger_source <> 'approved-suggestion' then
    raise exception 'Only approved-suggestion queueing is supported by this RPC.';
  end if;

  if p_status <> 'queued' then
    raise exception 'Decision queue RPC can only create queued generation runs.';
  end if;

  if p_trigger_mode = 'off' then
    raise exception 'AI Off mode cannot queue generation runs.';
  end if;

  if p_retry_count <> 0 then
    raise exception 'A newly queued generation run must start with retry_count 0.';
  end if;

  if p_started_at is not null or p_completed_at is not null then
    raise exception 'A newly queued generation run cannot already have start or completion timestamps.';
  end if;

  select id
  into matched_capability_id
  from provider_capability_versions
  where project_id = p_project_id
    and id = p_provider_capability_id
    and provider_key = p_provider_key
    and model_key = p_model_key
    and provider = p_provider
    and model = p_model
    and pricing_version = p_pricing_version
    and provider_terms_url = p_provider_terms_url
    and last_verified_at = p_provider_capability_verified_at
    and lifecycle_status = 'active'
    and commercial_use_allowed = true
    and verified_expires_at >= now()
  limit 1;

  if matched_capability_id is null then
    raise exception 'Provider capability % is missing, stale, disabled, or not commercially approved for project %',
      p_provider_capability_id,
      p_project_id;
  end if;

  update ai_suggestions
  set
    user_decision = p_decision,
    decision_reason = p_decision_reason,
    decision_audit = p_decision_audit,
    decided_at = p_decided_at
  where id = p_suggestion_id
    and project_id = p_project_id
    and scene_id = p_scene_id
  returning id into updated_suggestion_id;

  if updated_suggestion_id is null then
    raise exception 'AI suggestion % was not found for project %', p_suggestion_id, p_project_id;
  end if;

  insert into generation_runs (
    id,
    project_id,
    scene_id,
    suggestion_id,
    user_id,
    provider_capability_id,
    provider_key,
    model_key,
    provider,
    model,
    pricing_version,
    provider_terms_url,
    provider_capability_verified_at,
    prompt_hash,
    input_asset_ids,
    output_asset_id,
    cost_estimate,
    status,
    trigger_mode,
    trigger_source,
    retry_count,
    max_retries,
    failure_reason,
    started_at,
    completed_at,
    audit_trail,
    status_detail,
    created_at,
    updated_at
  )
  values (
    p_run_id,
    p_project_id,
    p_scene_id,
    p_suggestion_id,
    requesting_user_id(),
    p_provider_capability_id,
    p_provider_key,
    p_model_key,
    p_provider,
    p_model,
    p_pricing_version,
    p_provider_terms_url,
    p_provider_capability_verified_at,
    p_prompt_hash,
    p_input_asset_ids,
    p_output_asset_id,
    p_cost_estimate,
    p_status,
    p_trigger_mode,
    p_trigger_source,
    p_retry_count,
    p_max_retries,
    p_failure_reason,
    p_started_at,
    p_completed_at,
    p_audit_trail,
    p_status_detail,
    p_created_at,
    p_updated_at
  )
  on conflict do nothing
  returning * into queued_run;

  if queued_run.id is null then
    select *
    into queued_run
    from generation_runs
    where project_id = p_project_id
      and suggestion_id = p_suggestion_id
      and trigger_source = 'approved-suggestion'
    order by created_at desc
    limit 1;
  end if;

  if queued_run.id is null then
    raise exception 'Failed to queue or find approved generation run for suggestion %', p_suggestion_id;
  end if;

  insert into generation_run_events (
    project_id,
    generation_run_id,
    scene_id,
    event_type,
    status,
    actor_id,
    reason,
    provider_job_id,
    output_asset_id,
    failure_reason,
    retry_count,
    lease_owner,
    lease_expires_at,
    claim_token,
    metadata,
    created_at
  )
  values (
    queued_run.project_id,
    queued_run.id,
    queued_run.scene_id,
    'queued',
    queued_run.status,
    requesting_user_id(),
    'Queued after adviser approval.',
    queued_run.provider_job_id,
    queued_run.output_asset_id,
    queued_run.failure_reason,
    queued_run.retry_count,
    queued_run.lease_owner,
    queued_run.lease_expires_at,
    queued_run.claim_token,
    jsonb_build_object(
      'suggestionId', queued_run.suggestion_id,
      'triggerSource', queued_run.trigger_source
    ),
    queued_run.created_at
  )
  on conflict do nothing;

  return queued_run;
end;
$$;

alter table projects enable row level security;
alter table assets enable row level security;
alter table characters enable row level security;
alter table backgrounds enable row level security;
alter table scenes enable row level security;
alter table ai_preferences enable row level security;
alter table ai_suggestions enable row level security;
alter table generation_runs enable row level security;
alter table generation_run_events enable row level security;
alter table scene_scores enable row level security;
alter table provider_capability_versions enable row level security;
alter table scene_specs enable row level security;
alter table validation_reports enable row level security;
alter table cost_ledger_entries enable row level security;
alter table rights_manifest_entries enable row level security;
alter table export_manifests enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to authenticated;
grant select, insert, update, delete on
  projects,
  assets,
  characters,
  backgrounds,
  scenes,
  ai_preferences,
  ai_suggestions,
  generation_runs,
  scene_scores,
  scene_specs,
  provider_capability_versions,
  export_manifests
to authenticated;

grant select, insert on
  generation_run_events,
  provider_capability_versions,
  validation_reports,
  cost_ledger_entries,
  rights_manifest_entries
to authenticated;

revoke all on function record_ai_decision_and_queue_generation_run(
  uuid,
  text,
  text,
  jsonb,
  timestamptz,
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  text,
  uuid[],
  uuid,
  numeric,
  text,
  text,
  text,
  integer,
  integer,
  text,
  timestamptz,
  timestamptz,
  jsonb,
  jsonb,
  timestamptz,
  timestamptz
) from public;

grant execute on function record_ai_decision_and_queue_generation_run(
  uuid,
  text,
  text,
  jsonb,
  timestamptz,
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  text,
  uuid[],
  uuid,
  numeric,
  text,
  text,
  text,
  integer,
  integer,
  text,
  timestamptz,
  timestamptz,
  jsonb,
  jsonb,
  timestamptz,
  timestamptz
) to authenticated;

revoke all on function claim_generation_run(
  uuid,
  uuid,
  text,
  text,
  timestamptz,
  timestamptz,
  uuid,
  text
) from public;

grant execute on function claim_generation_run(
  uuid,
  uuid,
  text,
  text,
  timestamptz,
  timestamptz,
  uuid,
  text
) to authenticated;

revoke all on function complete_provider_simulated_run(
  uuid,
  uuid,
  text,
  text,
  timestamptz,
  text,
  text,
  uuid,
  text,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  jsonb
) from public;

grant execute on function complete_provider_simulated_run(
  uuid,
  uuid,
  text,
  text,
  timestamptz,
  text,
  text,
  uuid,
  text,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  jsonb
) to authenticated;

drop policy if exists projects_select_own on projects;
create policy projects_select_own on projects
for select to authenticated
using (owner_id = requesting_user_id());

drop policy if exists projects_insert_own on projects;
create policy projects_insert_own on projects
for insert to authenticated
with check (owner_id = requesting_user_id());

drop policy if exists projects_update_own on projects;
create policy projects_update_own on projects
for update to authenticated
using (owner_id = requesting_user_id())
with check (owner_id = requesting_user_id());

drop policy if exists projects_delete_own on projects;
create policy projects_delete_own on projects
for delete to authenticated
using (owner_id = requesting_user_id());

drop policy if exists assets_owner_all on assets;
create policy assets_owner_all on assets
for all to authenticated
using (owns_project(project_id))
with check (owns_project(project_id));

drop policy if exists characters_owner_all on characters;
create policy characters_owner_all on characters
for all to authenticated
using (owns_project(project_id))
with check (owns_project(project_id));

drop policy if exists backgrounds_owner_all on backgrounds;
create policy backgrounds_owner_all on backgrounds
for all to authenticated
using (owns_project(project_id))
with check (owns_project(project_id));

drop policy if exists scenes_owner_all on scenes;
create policy scenes_owner_all on scenes
for all to authenticated
using (owns_project(project_id))
with check (owns_project(project_id));

drop policy if exists ai_preferences_owner_all on ai_preferences;
create policy ai_preferences_owner_all on ai_preferences
for all to authenticated
using (owns_project(project_id) and user_id = requesting_user_id())
with check (owns_project(project_id) and user_id = requesting_user_id());

drop policy if exists ai_suggestions_owner_all on ai_suggestions;
create policy ai_suggestions_owner_all on ai_suggestions
for all to authenticated
using (owns_project(project_id))
with check (owns_project(project_id));

drop policy if exists generation_runs_owner_all on generation_runs;
create policy generation_runs_owner_all on generation_runs
for all to authenticated
using (owns_project(project_id))
with check (owns_project(project_id));

drop policy if exists generation_run_events_owner_all on generation_run_events;
create policy generation_run_events_owner_all on generation_run_events
for all to authenticated
using (owns_project(project_id))
with check (owns_project(project_id));

drop policy if exists scene_scores_owner_all on scene_scores;
create policy scene_scores_owner_all on scene_scores
for all to authenticated
using (owns_project(project_id))
with check (owns_project(project_id));

drop policy if exists provider_capability_versions_owner_all on provider_capability_versions;
create policy provider_capability_versions_owner_all on provider_capability_versions
for all to authenticated
using (owns_project(project_id))
with check (owns_project(project_id));

drop policy if exists scene_specs_owner_all on scene_specs;
create policy scene_specs_owner_all on scene_specs
for all to authenticated
using (owns_project(project_id))
with check (owns_project(project_id));

drop policy if exists validation_reports_owner_all on validation_reports;
create policy validation_reports_owner_all on validation_reports
for all to authenticated
using (owns_project(project_id))
with check (owns_project(project_id));

drop policy if exists cost_ledger_entries_owner_all on cost_ledger_entries;
create policy cost_ledger_entries_owner_all on cost_ledger_entries
for all to authenticated
using (owns_project(project_id))
with check (owns_project(project_id));

drop policy if exists rights_manifest_entries_owner_all on rights_manifest_entries;
create policy rights_manifest_entries_owner_all on rights_manifest_entries
for all to authenticated
using (owns_project(project_id))
with check (owns_project(project_id));

drop policy if exists export_manifests_owner_all on export_manifests;
create policy export_manifests_owner_all on export_manifests
for all to authenticated
using (owns_project(project_id))
with check (owns_project(project_id));
