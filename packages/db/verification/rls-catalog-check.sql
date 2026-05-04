-- AETHON Supabase catalog verification.
-- Run after applying migrations in a Supabase local/staging database.
-- It raises an exception if owner-scoped RLS, policies, or append-only ledger grants drift.

do $$
declare
  missing_tables text;
  missing_rls text;
  missing_policies text;
  broad_ledger_grants text;
  missing_ledger_grants text;
  missing_atomic_function text;
  atomic_function_security_drift text;
  missing_atomic_execute_grant text;
  missing_generation_run_dedupe_index text;
  missing_provider_catalog_columns text;
  missing_provider_catalog_constraint text;
  missing_generation_run_provider_fk text;
  missing_project_evidence_fk text;
  missing_export_manifest_evidence_columns text;
  missing_export_manifest_evidence_constraints text;
  missing_provider_catalog_rpc_guard text;
  missing_event_append_trigger text;
  missing_event_claim_index text;
  missing_event_queued_index text;
  missing_claim_function text;
  claim_function_security_drift text;
  missing_claim_execute_grant text;
  missing_completion_function text;
  completion_function_security_drift text;
  missing_completion_execute_grant text;
begin
  with expected(table_name) as (
    values
      ('provider_capability_versions'),
      ('generation_run_events'),
      ('scene_specs'),
      ('validation_reports'),
      ('cost_ledger_entries'),
      ('rights_manifest_entries'),
      ('export_manifests')
  )
  select string_agg(expected.table_name, ', ')
  into missing_tables
  from expected
  where not exists (
    select 1
    from pg_class
    join pg_namespace on pg_namespace.oid = pg_class.relnamespace
    where pg_namespace.nspname = 'public'
      and pg_class.relname = expected.table_name
      and pg_class.relkind = 'r'
  );

  if missing_tables is not null then
    raise exception 'Missing production-readiness tables: %', missing_tables;
  end if;

  with expected(table_name) as (
    values
      ('provider_capability_versions'),
      ('generation_run_events'),
      ('scene_specs'),
      ('validation_reports'),
      ('cost_ledger_entries'),
      ('rights_manifest_entries'),
      ('export_manifests')
  )
  select string_agg(expected.table_name, ', ')
  into missing_rls
  from expected
  where not exists (
    select 1
    from pg_class
    join pg_namespace on pg_namespace.oid = pg_class.relnamespace
    where pg_namespace.nspname = 'public'
      and pg_class.relname = expected.table_name
      and pg_class.relrowsecurity = true
  );

  if missing_rls is not null then
    raise exception 'Missing RLS on production-readiness tables: %', missing_rls;
  end if;

  with expected(table_name, policy_name) as (
    values
      ('provider_capability_versions', 'provider_capability_versions_owner_all'),
      ('generation_run_events', 'generation_run_events_owner_all'),
      ('scene_specs', 'scene_specs_owner_all'),
      ('validation_reports', 'validation_reports_owner_all'),
      ('cost_ledger_entries', 'cost_ledger_entries_owner_all'),
      ('rights_manifest_entries', 'rights_manifest_entries_owner_all'),
      ('export_manifests', 'export_manifests_owner_all')
  )
  select string_agg(expected.table_name, ', ')
  into missing_policies
  from expected
  where not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = expected.table_name
      and policyname = expected.policy_name
      and qual like '%owns_project(project_id)%'
      and with_check like '%owns_project(project_id)%'
  );

  if missing_policies is not null then
    raise exception 'Missing owner policies on production-readiness tables: %', missing_policies;
  end if;

  with ledger_tables(table_name) as (
    values
      ('generation_run_events'),
      ('validation_reports'),
      ('cost_ledger_entries'),
      ('rights_manifest_entries')
  )
  select string_agg(table_name || ':' || privilege_type, ', ')
  into broad_ledger_grants
  from information_schema.role_table_grants
  where table_schema = 'public'
    and grantee = 'authenticated'
    and table_name in (select table_name from ledger_tables)
    and privilege_type in ('UPDATE', 'DELETE');

  if broad_ledger_grants is not null then
    raise exception 'Ledger tables must not grant UPDATE/DELETE to authenticated: %', broad_ledger_grants;
  end if;

  with expected(table_name, privilege_type) as (
    values
      ('validation_reports', 'SELECT'),
      ('validation_reports', 'INSERT'),
      ('generation_run_events', 'SELECT'),
      ('generation_run_events', 'INSERT'),
      ('cost_ledger_entries', 'SELECT'),
      ('cost_ledger_entries', 'INSERT'),
      ('rights_manifest_entries', 'SELECT'),
      ('rights_manifest_entries', 'INSERT')
  )
  select string_agg(expected.table_name || ':' || expected.privilege_type, ', ')
  into missing_ledger_grants
  from expected
  where not exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee = 'authenticated'
      and table_name = expected.table_name
      and privilege_type = expected.privilege_type
  );

  if missing_ledger_grants is not null then
    raise exception 'Missing append-oriented ledger grants: %', missing_ledger_grants;
  end if;

  select 'record_ai_decision_and_queue_generation_run'
  into missing_atomic_function
  where not exists (
    select 1
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname = 'record_ai_decision_and_queue_generation_run'
  );

  if missing_atomic_function is not null then
    raise exception 'Missing adviser decision queue RPC: %', missing_atomic_function;
  end if;

  select 'record_ai_decision_and_queue_generation_run:SECURITY DEFINER'
  into atomic_function_security_drift
  where exists (
    select 1
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname = 'record_ai_decision_and_queue_generation_run'
      and pg_proc.prosecdef = true
  );

  if atomic_function_security_drift is not null then
    raise exception 'Adviser decision queue RPC must remain SECURITY INVOKER: %', atomic_function_security_drift;
  end if;

  select 'record_ai_decision_and_queue_generation_run:EXECUTE'
  into missing_atomic_execute_grant
  where not exists (
    select 1
    from information_schema.routine_privileges
    where routine_schema = 'public'
      and grantee = 'authenticated'
      and routine_name = 'record_ai_decision_and_queue_generation_run'
      and privilege_type = 'EXECUTE'
  );

  if missing_atomic_execute_grant is not null then
    raise exception 'Missing adviser decision queue RPC grant: %', missing_atomic_execute_grant;
  end if;

  select 'generation_runs_approved_suggestion_once_idx'
  into missing_generation_run_dedupe_index
  where not exists (
    select 1
    from pg_index
    join pg_class index_class on index_class.oid = pg_index.indexrelid
    join pg_class table_class on table_class.oid = pg_index.indrelid
    join pg_namespace on pg_namespace.oid = table_class.relnamespace
    where pg_namespace.nspname = 'public'
      and table_class.relname = 'generation_runs'
      and index_class.relname = 'generation_runs_approved_suggestion_once_idx'
      and pg_index.indisunique = true
      and pg_get_expr(pg_index.indpred, pg_index.indrelid) like '%approved-suggestion%'
  );

  if missing_generation_run_dedupe_index is not null then
    raise exception 'Missing approved suggestion generation run dedupe index: %', missing_generation_run_dedupe_index;
  end if;

  with expected(column_name) as (
    values
      ('provider_key'),
      ('model_key'),
      ('lifecycle_status'),
      ('source_url'),
      ('terms_risk'),
      ('verified_expires_at'),
      ('replacement_capability_id')
  )
  select string_agg(expected.column_name, ', ')
  into missing_provider_catalog_columns
  from expected
  where not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'provider_capability_versions'
      and column_name = expected.column_name
  );

  if missing_provider_catalog_columns is not null then
    raise exception 'Missing provider catalog lifecycle columns: %', missing_provider_catalog_columns;
  end if;

  select 'provider_capability_versions:project scoped stable key'
  into missing_provider_catalog_constraint
  where not exists (
    select 1
    from pg_constraint
    join pg_class on pg_class.oid = pg_constraint.conrelid
    join pg_namespace on pg_namespace.oid = pg_class.relnamespace
    where pg_namespace.nspname = 'public'
      and pg_class.relname = 'provider_capability_versions'
      and pg_constraint.contype in ('p', 'u')
      and pg_get_constraintdef(pg_constraint.oid) like '%project_id%'
      and pg_get_constraintdef(pg_constraint.oid) like '%provider_key%'
      and pg_get_constraintdef(pg_constraint.oid) like '%model_key%'
      and pg_get_constraintdef(pg_constraint.oid) like '%pricing_version%'
  );

  if missing_provider_catalog_constraint is not null then
    raise exception 'Missing provider catalog exact provider/model/pricing constraint: %', missing_provider_catalog_constraint;
  end if;

  select 'generation_runs_provider_capability_fk'
  into missing_generation_run_provider_fk
  where not exists (
    select 1
    from pg_constraint
    join pg_class on pg_class.oid = pg_constraint.conrelid
    join pg_namespace on pg_namespace.oid = pg_class.relnamespace
    where pg_namespace.nspname = 'public'
      and pg_class.relname = 'generation_runs'
      and pg_constraint.conname = 'generation_runs_provider_capability_fk'
      and pg_constraint.contype = 'f'
  );

  if missing_generation_run_provider_fk is not null then
    raise exception 'Missing generation run to provider catalog FK: %', missing_generation_run_provider_fk;
  end if;

  with expected(table_name, first_column, second_column) as (
    values
      ('validation_reports', 'project_id', 'generation_run_id'),
      ('cost_ledger_entries', 'project_id', 'generation_run_id'),
      ('rights_manifest_entries', 'project_id', 'asset_id'),
      ('rights_manifest_entries', 'project_id', 'license_evidence_asset_id'),
      ('rights_manifest_entries', 'project_id', 'consent_evidence_asset_id')
  )
  select string_agg(expected.table_name || ':' || expected.second_column, ', ')
  into missing_project_evidence_fk
  from expected
  where not exists (
    select 1
    from pg_constraint
    join pg_class on pg_class.oid = pg_constraint.conrelid
    join pg_namespace on pg_namespace.oid = pg_class.relnamespace
    where pg_namespace.nspname = 'public'
      and pg_class.relname = expected.table_name
      and pg_constraint.contype = 'f'
      and pg_get_constraintdef(pg_constraint.oid) like '%' || expected.first_column || '%'
      and pg_get_constraintdef(pg_constraint.oid) like '%' || expected.second_column || '%'
  );

  if missing_project_evidence_fk is not null then
    raise exception 'Missing project-scoped evidence FK: %', missing_project_evidence_fk;
  end if;

  with expected(column_name) as (
    values
      ('generated_content_label'),
      ('provenance_summary'),
      ('render_artifact'),
      ('c2pa_attachment'),
      ('render_artifact_checksum'),
      ('source_manifest_hash'),
      ('c2pa_manifest_hash'),
      ('c2pa_status')
  )
  select string_agg(expected.column_name, ', ')
  into missing_export_manifest_evidence_columns
  from expected
  where not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'export_manifests'
      and column_name = expected.column_name
  );

  if missing_export_manifest_evidence_columns is not null then
    raise exception 'Missing export manifest render/C2PA evidence columns: %', missing_export_manifest_evidence_columns;
  end if;

  with expected(constraint_name) as (
    values
      ('export_manifests_ready_render_artifact_check'),
      ('export_manifests_attached_c2pa_check')
  )
  select string_agg(expected.constraint_name, ', ')
  into missing_export_manifest_evidence_constraints
  from expected
  where not exists (
    select 1
    from pg_constraint
    join pg_class on pg_class.oid = pg_constraint.conrelid
    join pg_namespace on pg_namespace.oid = pg_class.relnamespace
    where pg_namespace.nspname = 'public'
      and pg_class.relname = 'export_manifests'
      and pg_constraint.conname = expected.constraint_name
      and pg_constraint.contype = 'c'
  );

  if missing_export_manifest_evidence_constraints is not null then
    raise exception 'Missing export manifest render/C2PA evidence constraints: %', missing_export_manifest_evidence_constraints;
  end if;

  select 'record_ai_decision_and_queue_generation_run:provider catalog guard'
  into missing_provider_catalog_rpc_guard
  where not exists (
    select 1
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname = 'record_ai_decision_and_queue_generation_run'
      and pg_get_functiondef(pg_proc.oid) like '%lifecycle_status = ''active''%'
      and pg_get_functiondef(pg_proc.oid) like '%verified_expires_at >= now()%'
      and pg_get_functiondef(pg_proc.oid) like '%commercial_use_allowed = true%'
      and pg_get_functiondef(pg_proc.oid) like '%provider_key = p_provider_key%'
      and pg_get_functiondef(pg_proc.oid) like '%model_key = p_model_key%'
  );

  if missing_provider_catalog_rpc_guard is not null then
    raise exception 'Missing provider catalog active/expiry/commercial guard in queue RPC: %', missing_provider_catalog_rpc_guard;
  end if;

  select 'generation_run_events_append_only'
  into missing_event_append_trigger
  where not exists (
    select 1
    from pg_trigger
    join pg_class on pg_class.oid = pg_trigger.tgrelid
    join pg_namespace on pg_namespace.oid = pg_class.relnamespace
    join pg_proc on pg_proc.oid = pg_trigger.tgfoid
    where pg_namespace.nspname = 'public'
      and pg_class.relname = 'generation_run_events'
      and pg_trigger.tgname = 'generation_run_events_append_only'
      and pg_proc.proname = 'prevent_generation_run_event_mutation'
      and not pg_trigger.tgisinternal
  );

  if missing_event_append_trigger is not null then
    raise exception 'Missing generation run events append-only trigger: %', missing_event_append_trigger;
  end if;

  select 'generation_run_events_claim_token_once_idx'
  into missing_event_claim_index
  where not exists (
    select 1
    from pg_index
    join pg_class index_class on index_class.oid = pg_index.indexrelid
    join pg_class table_class on table_class.oid = pg_index.indrelid
    join pg_namespace on pg_namespace.oid = table_class.relnamespace
    where pg_namespace.nspname = 'public'
      and table_class.relname = 'generation_run_events'
      and index_class.relname = 'generation_run_events_claim_token_once_idx'
      and pg_index.indisunique = true
      and lower(pg_get_expr(pg_index.indpred, pg_index.indrelid)) like '%claim_token is not null%'
  );

  if missing_event_claim_index is not null then
    raise exception 'Missing generation run event claim token idempotency index: %', missing_event_claim_index;
  end if;

  select 'generation_run_events_queued_once_idx'
  into missing_event_queued_index
  where not exists (
    select 1
    from pg_index
    join pg_class index_class on index_class.oid = pg_index.indexrelid
    join pg_class table_class on table_class.oid = pg_index.indrelid
    join pg_namespace on pg_namespace.oid = table_class.relnamespace
    where pg_namespace.nspname = 'public'
      and table_class.relname = 'generation_run_events'
      and index_class.relname = 'generation_run_events_queued_once_idx'
      and pg_index.indisunique = true
      and lower(pg_get_expr(pg_index.indpred, pg_index.indrelid)) like '%event_type = ''queued''%'
  );

  if missing_event_queued_index is not null then
    raise exception 'Missing generation run queued event idempotency index: %', missing_event_queued_index;
  end if;

  select 'claim_generation_run'
  into missing_claim_function
  where not exists (
    select 1
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname = 'claim_generation_run'
      and pg_get_functiondef(pg_proc.oid) like '%insert into generation_run_events%'
      and pg_get_functiondef(pg_proc.oid) like '%lease_expires_at is null or lease_expires_at <= p_claimed_at%'
      and pg_get_functiondef(pg_proc.oid) like '%status in (''queued'', ''running'')%'
  );

  if missing_claim_function is not null then
    raise exception 'Missing atomic generation run claim RPC: %', missing_claim_function;
  end if;

  select 'claim_generation_run:SECURITY DEFINER'
  into claim_function_security_drift
  where exists (
    select 1
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname = 'claim_generation_run'
      and pg_proc.prosecdef = true
  );

  if claim_function_security_drift is not null then
    raise exception 'Generation run claim RPC must remain SECURITY INVOKER: %', claim_function_security_drift;
  end if;

  select 'claim_generation_run:EXECUTE'
  into missing_claim_execute_grant
  where not exists (
    select 1
    from information_schema.routine_privileges
    where routine_schema = 'public'
      and grantee = 'authenticated'
      and routine_name = 'claim_generation_run'
      and privilege_type = 'EXECUTE'
  );

  if missing_claim_execute_grant is not null then
    raise exception 'Missing generation run claim RPC grant: %', missing_claim_execute_grant;
  end if;

  select 'complete_provider_simulated_run'
  into missing_completion_function
  where not exists (
    select 1
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname = 'complete_provider_simulated_run'
      and pg_get_functiondef(pg_proc.oid) like '%status = ''running''%'
      and pg_get_functiondef(pg_proc.oid) like '%lease_expires_at > p_completed_at%'
      and pg_get_functiondef(pg_proc.oid) like '%insert into assets%'
      and pg_get_functiondef(pg_proc.oid) like '%insert into generation_run_events%'
      and pg_get_functiondef(pg_proc.oid) like '%insert into validation_reports%'
      and pg_get_functiondef(pg_proc.oid) like '%insert into cost_ledger_entries%'
      and pg_get_functiondef(pg_proc.oid) like '%insert into rights_manifest_entries%'
      and pg_get_functiondef(pg_proc.oid) like '%insert into export_manifests%'
      and pg_get_functiondef(pg_proc.oid) like '%render_artifact_checksum%'
      and pg_get_functiondef(pg_proc.oid) like '%c2pa_attachment%'
      and pg_get_functiondef(pg_proc.oid) like '%c2pa_manifest_hash%'
  );

  if missing_completion_function is not null then
    raise exception 'Missing transactional provider-sim completion RPC: %', missing_completion_function;
  end if;

  select 'complete_provider_simulated_run:SECURITY DEFINER'
  into completion_function_security_drift
  where exists (
    select 1
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname = 'complete_provider_simulated_run'
      and pg_proc.prosecdef = true
  );

  if completion_function_security_drift is not null then
    raise exception 'Provider-sim completion RPC must remain SECURITY INVOKER: %', completion_function_security_drift;
  end if;

  select 'complete_provider_simulated_run:EXECUTE'
  into missing_completion_execute_grant
  where not exists (
    select 1
    from information_schema.routine_privileges
    where routine_schema = 'public'
      and grantee = 'authenticated'
      and routine_name = 'complete_provider_simulated_run'
      and privilege_type = 'EXECUTE'
  );

  if missing_completion_execute_grant is not null then
    raise exception 'Missing provider-sim completion RPC grant: %', missing_completion_execute_grant;
  end if;
end $$;
