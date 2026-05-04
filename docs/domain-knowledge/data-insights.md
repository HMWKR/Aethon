# Data Insights

## 2026-05-05: render/C2PA evidence now needs first-class export manifest columns

- **발견**: Loop 11W의 render artifact proof와 local C2PA attachment evidence는 `rights_summary` 보조 JSON에만 남기면 live DB 검증과 repository readback에서 누락되어도 알아차리기 어렵다.
- **결정**: `export_manifests`에 `generated_content_label`, `provenance_summary`, `render_artifact`, `c2pa_attachment`, `render_artifact_checksum`, `source_manifest_hash`, `c2pa_manifest_hash`를 1급 컬럼으로 추가하고, `complete_provider_simulated_run` RPC가 provider-sim completion 시 이 값을 함께 저장하게 했다.
- **영향**: local provider-sim/export UI는 artifact-level provenance evidence를 DB row 자체에서 재조회할 수 있다. RLS catalog check와 provider-sim runtime check도 해당 컬럼/constraint/JSON evidence를 검증한다.
- **검증**: local Supabase reset 후 `pnpm supabase:verify`가 통과했고, DB static security tests는 schema/migration/RPC/repository/fixture drift를 함께 검증한다.
- **출처**: Loop 11W deterministic render artifact proof and local provenance attachment.
- **다음**: durable render artifact table, object storage row, production signer verification schema, stored media hash probe는 별도 slice로 닫는다.
- **다음**: real render output이 생기면 stored artifact URI, checksum algorithm, signer verification result, retention policy를 explicit migration 또는 typed JSON contract로 고정한다.

## 2026-05-05: local Supabase runtime now proves RLS and provider-sim DB behavior

- **발견**: Supabase CLI를 repo dev dependency로 설치하고 Docker Desktop Linux daemon을 실행하면 AETHON initial migration을 실제 local Supabase DB에 적용할 수 있었다. 정적 schema test에서는 보이지 않던 기본 broad grant drift가 live catalog에서 드러났고, `authenticated`가 ledger table의 `UPDATE/DELETE`까지 가진 문제가 확인됐다.
- **결정**: `schema.sql`, initial migration, Supabase CLI migration 모두에 `revoke all on all tables in schema public from anon, authenticated;`를 명시한 뒤 필요한 grant만 재부여했다. `rls-catalog-check.sql`은 catalog predicate 대소문자 차이를 `lower(pg_get_expr(...))`로 보정했다.
- **구현**: `supabase/config.toml`, `supabase/migrations/20260504150838_initial_ai_control.sql`, empty `supabase/seed.sql`, root `supabase:*` scripts를 추가했다. `provider-sim-runtime-check.sql`은 authenticated role과 JWT claim을 설정해 queue -> claim -> complete, same-token retry, different-worker/stale-lease rejection, failed completion no-export, owner RLS isolation, fixture cleanup을 검증한다.
- **검증**: `pnpm supabase:verify`, `pnpm --filter @aethon/db test`, `pnpm --filter @aethon/db typecheck`, `$env:AETHON_E2E_PORT='3031'; pnpm production:check` 통과. Runtime fixture project count는 0으로 정리됐다.
- **영향**: DB/RLS 주장은 static-only에서 local-runtime evidence로 승격했다. 단, production/staging Supabase write는 아직 명시 승인 전이므로 live deployment evidence로 과장하지 않는다.
- **출처**: Loop 11V local Supabase runtime evidence.
- **다음**: 승인된 staging Supabase target이 생기면 같은 `pnpm supabase:verify` 경계를 staging-safe 방식으로 재실행하고, Clerk JWT template과 실제 auth session의 claim shape를 별도 검증한다.

## 2026-05-04: media tags are metadata contract, not indexed storage yet

- **발견**: Project Bin search/tag UX를 넣더라도 현재 runtime은 browser-local metadata와 seed data뿐이다. DB/object storage가 없는 상태에서 이 기능을 durable media catalog라고 부르면 안 된다.
- **결정**: `SourceMediaMetadata`에 optional `tags`와 `thumbnailLabel`을 추가하고, imported metadata localStorage restore가 해당 fields를 보존하게 했다.
- **영향**: 이후 Supabase asset rows나 object-storage probe 결과가 들어오면 같은 shape로 tags, thumbnail asset id, search index를 승격할 수 있다. 현재는 filename/type 기반 deterministic tags와 label thumbnail만 제공한다.
- **출처**: Loop 11U browser-local media search and tags.
- **다음**: durable asset table/search index를 열 때 `tags text[]` 또는 JSONB metadata, thumbnail asset FK, source probe status를 명시한다.

## 2026-05-04: export provenance can use existing JSON readback until live migration is available

- **발견**: Loop 11T에서 export manifest evidence id, generated-content label, provenance summary는 제품 gate에 필요했지만 Supabase CLI와 Docker Desktop Linux daemon 부재로 live schema migration/runtime proof를 만들 수 없었다.
- **결정**: DB repository는 당분간 기존 `rights_summary` JSONB 경계에 expanded provenance summary를 저장한다. 이 방식은 live migration 없이 readback shape를 보존하지만, durable schema contract 자체를 완성했다는 의미는 아니다.
- **영향**: Export inspector와 static DB mapper test는 asset/model/validation/cost/rights evidence를 볼 수 있다. 단, provider-sim SQL RPC runtime evidence와 explicit export evidence columns는 local/staging Supabase target이 확인된 뒤 별도 증명해야 한다.
- **출처**: Loop 11T export manifest evidence expansion.
- **다음**: Supabase runtime이 열리면 `rls-catalog-check.sql`, provider-sim completion RPC, export manifest readback, evidence column/migration strategy를 같은 루프에서 검증한다.

## 2026-05-04: browser-local imports are metadata persistence, not storage persistence

- **발견**: Supabase runtime이 막힌 상태에서 import UX를 구현하면 file binary와 durable asset row가 없는 상태를 제품이 과장할 위험이 있다.
- **결정**: Loop 11S import는 `SourceMediaMetadata`만 localStorage에 저장하고, `storageUri`는 `browser-local://imports/...`로 명시한다. `metadataSource`는 browser file metadata boundary의 `file-probe`로 기록하되, 실제 media duration probing은 후속 과제로 남긴다.
- **영향**: Project Bin과 Source Monitor는 imported source를 재로드 후에도 볼 수 있지만, 이 기록은 cloud upload, Supabase asset, export-safe durable media를 의미하지 않는다.
- **출처**: Loop 11S browser-local media import persistence.
- **다음**: Supabase/object storage target이 확인되면 imported metadata를 durable asset row와 실제 probe duration으로 승격한다.

## 2026-05-04: source media metadata should own edit source duration

- **발견**: `EditClip.sourceDurationSeconds`를 clip seed literal로만 유지하면 실제 media import, provider result, persisted asset metadata가 들어올 때 source bounds의 소유권이 불명확해진다.
- **결정**: `SourceMediaMetadata`를 source asset 단위 계약으로 두고, clips는 `sourceAssetId`로 연결한다. `hydrateWorkspaceSourceDurations`가 metadata의 `durationSeconds`와 `sourceType`을 workspace clip에 주입한다.
- **영향**: 지금은 seed metadata지만, 이후 file probe/provider result/Supabase asset row가 같은 shape로 들어오면 trim/slip/roll guard가 별도 UI 변경 없이 metadata source를 갈아탈 수 있다.
- **출처**: Loop 11O media metadata source-duration hydration.
- **다음**: 실제 import path가 생기면 media metadata persistence table 또는 existing asset metadata JSONB와 `SourceMediaMetadata` shape를 맞춰야 한다.

## 2026-05-04: provider-sim completion evidence should be one SQL transaction

- **발견**: provider-sim completion을 repository의 여러 Supabase JS write로 나누면 run terminal update 후 evidence insert 실패 같은 partial-state risk를 DB 레벨에서 차단했다고 말할 수 없다.
- **결정**: `complete_provider_simulated_run` RPC를 `security invoker`로 추가하고, `status = 'running'`, `lease_owner = p_actor_id`, `claim_token = p_claim_token`, `lease_expires_at > p_completed_at` 조건을 통과한 경우에만 terminal update와 evidence writes를 수행한다.
- **영향**: output asset FK가 run update 전에 충족되고, validation/cost/rights/export rows는 project-scoped FK와 deterministic IDs로 retry duplicate를 피한다. 같은 claim token 재시도는 terminal run을 반환하고 새 evidence row를 만들지 않는다.
- **출처**: Loop 11F provider-sim SQL transaction promotion.
- **다음**: local/staging Supabase에서 `packages/db/verification/rls-catalog-check.sql`과 same-token/different-worker/stale-lease runtime cases를 실행한다.

## 2026-05-04: provider-sim evidence must preserve project-scoped run and asset links

- **발견**: provider-sim 결과를 저장할 때 cost ledger의 `generation_run_id`, rights manifest의 `asset_id`, export manifest의 `asset_ids/model_runs/rights_summary`가 비면 DB에는 evidence row가 있어도 실행 결과와 연결되지 않는다.
- **결정**: `assets`는 `(project_id, id)` unique key를 갖고, validation/cost/rights evidence는 `project_id + generation_run_id` 또는 `project_id + asset_id` composite FK로 같은 프로젝트 범위를 강제한다.
- **영향**: provider worker가 생성한 output asset과 QC/cost/rights/export evidence를 run 기준으로 재조회할 수 있다. cross-project evidence stitching은 static schema test와 live catalog check 양쪽에서 탐지한다.
- **출처**: Loop 11D provider-sim persistence/readback.
- **다음**: 실제 Supabase local/staging에서 `packages/db/verification/rls-catalog-check.sql`를 실행하고, provider-sim worker RPC가 같은 project-scoped FK 조건을 통과하는지 검증한다.

## 2026-05-04: generation runs must reference a project-scoped provider capability snapshot

- **발견**: `generation_runs.provider/model` 텍스트만 저장하면 나중에 provider 약관, 가격, deprecated 상태가 바뀌었을 때 어떤 검증 근거로 실행됐는지 추적하기 어렵다.
- **결정**: `generation_runs`에 `provider_capability_id`, `provider_key`, `model_key`, `pricing_version`, `provider_terms_url`, `provider_capability_verified_at` snapshot을 추가했다. `provider_capability_versions`는 `(project_id, id)` primary key와 `(project_id, provider_key, model_key, pricing_version)` unique key를 가진다.
- **영향**: DB RPC `record_ai_decision_and_queue_generation_run`은 accepted/edited decision, queued status, non-off mode, retry_count 0, started/completed null, active/fresh/commercial provider capability를 모두 확인한 뒤에만 run을 만든다.
- **보강**: Server Action은 persisted queue/RPC 호출 전에 서버 catalog의 exact capability row를 upsert한다. 빈 프로젝트 DB에서도 FK/guard를 통과하되, unknown provider/model은 core catalog validation에서 먼저 차단된다.
- **출처**: Loop 10B provider catalog + queue contract hardening.
- **검증**: DB static security tests 19 passed, `pnpm production:check` passed. Live Supabase execution은 아직 미실행.
- **다음**: Supabase local/staging에서 `verification/rls-catalog-check.sql`와 two-user cross-project RLS 테스트를 실제 DB에 적용해야 한다.

## 2026-05-03: persisted approval queue must re-read DB suggestion state

- **발견**: Server Action 경계에서 클라이언트가 넘긴 suggestion/provider/model/cost를 그대로 run으로 바꾸면 DB의 canonical suggestion과 audit 근거가 갈라진다.
- **결정**: `SupabaseAiControlRepository.getSuggestion`을 추가하고 persisted approve/queue path에서 authenticated user의 stored suggestion을 재조회한다.
- **영향**: 이후 provider worker는 action payload가 아니라 DB canonical row와 capability catalog를 기준으로 실행되어야 한다.
- **검증**: `pnpm --filter @aethon/db test`, `pnpm --filter @aethon/db typecheck`, `pnpm production:check` 통과.
- **다음**: live Supabase에서 `rls-catalog-check.sql`와 two-user cross-project test를 실행한다.

> 본 파일은 `data-lead` 에이전트의 발견/결정을 축적한다.
> 업데이트 규칙: CLAUDE.md "인사이트 분배 프로토콜" 참조.

## 2026-05-03: adviser decision과 generation run은 DB transaction 경계가 필요하다

- **발견**: `approveAndQueueGenerationRunAction`에서 decision audit update와 generation run insert가 분리되면 audit만 성공하고 run 생성이 실패하는 partial state가 생길 수 있다.
- **이유**: AI provider 실행은 비용/권리/품질 책임이 붙는 작업이라, "사용자가 승인했다"와 "그 승인으로 실행 큐가 생겼다"는 같은 persistence boundary에 있어야 한다.
- **영향**: `record_ai_decision_and_queue_generation_run` RPC와 `generation_runs_approved_suggestion_once_idx`를 추가해 approved suggestion당 generation run 중복을 막고, live catalog check가 해당 RPC와 execute grant를 검증한다.
- **출처**: Loop 9 DB-backed adviser decision persistence.
- **다음**: 실제 Supabase local/staging 적용 후 RPC가 RLS owner policy 안에서 작동하는지 live catalog + two-user test로 검증한다.

---

## 2026-04-20: 에이전트 초기 생성

- **발견**: AETHON 프로젝트 부트스트랩. Data Lead 신설.
- **이유**: Supabase 스키마(projects/characters/backgrounds/scenes)·Storage·Realtime·RLS 전담.
- **영향**: 스키마 진화 방향, RLS 정책 패턴, 멀티 모델 라우팅 필드(image_model/video_model/model_auto_selected/model_selection_reason) 결정이 여기 축적된다.
- **출처**: /agent-architect 실행 (세션 2026-04-20)
- **다음**: 첫 과제 수신 대기.

---

## 2026-05-03: AI Control approval/audit 스키마 보강

- **발견**: `ai_suggestions`에 `task_id`, `recommended_option_id`, `mode_at_creation`, `gate_status`, `requires_approval`, `decision_audit`, `decided_at`을 추가하고, `generation_runs`에 `suggestion_id`를 연결했다. `packages/db/migrations/0001_initial_ai_control.sql`도 추가했다.
- **이유**: AETHON은 AI 추천과 실제 실행을 분리해야 하며, 사용자가 어떤 모드에서 어떤 근거로 승인/수정/보류했는지 감사 가능해야 한다.
- **영향**: Supabase persistence 구현 시 `ai_preferences -> ai_suggestions -> generation_runs -> export_manifests` 흐름으로 사용자 책임/비용/권리 로그를 추적할 수 있다.
- **출처**: AI Control Center productionization 작업(2026-05-03).
- **다음**: RLS 정책과 Clerk owner_id 매핑을 migration에 추가한다.

---

## 2026-05-03: AI 선택 보조를 위한 데이터 모델 추가

- **발견**: Adviser-first UX를 구현하려면 씬/모델 결과만으로는 부족하고, 사용자의 AI 모드 설정과 AI 제안/선택 로그가 필요하다.
- **이유**: AETHON은 "AI가 알아서 했다"가 아니라 "사용자가 어떤 근거로 선택했는지"를 남겨야 한다.
- **영향**: `packages/db/schema.sql` 초안에 `ai_preferences`, `ai_suggestions`, `generation_runs.trigger_mode`를 추가했다. `projects.ai_global_mode`, `scenes.ai_mode`도 포함했다.
- **출처**: AI Control Center 문서 동기화 및 초기 스키마 작성.
- **다음**: Supabase RLS 정책을 추가할 때 `ai_preferences.user_id`와 `projects.owner_id` 권한 경계를 검증한다.

---

## 2026-04-20: Phase 1 사전 지식 시드

### Supabase RLS 패턴 — 프로젝트 오너 기반
- **발견**: 모든 테이블 RLS는 `owner_id = auth.uid()` (projects) 또는 `project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())` (하위 테이블). USING + WITH CHECK 절 양쪽 적용.
- **이유**: 단일 패턴으로 관리. RLS 누락은 `security-auditor`가 자동 검증.
- **영향**: 마이그레이션 템플릿에 RLS 자동 생성. 새 테이블 추가 시 동일 패턴 강제.
- **출처**: 사전 리서치.
- **다음**: Phase 0 마이그레이션 + Phase 11 협업 모드 시 다중 멤버 RLS 확장.

### JSONB 인덱싱 — inpaint_pins, personality, mood_palette
- **발견**: JSONB 컬럼에 자주 쿼리되는 키는 GIN 인덱스 또는 expression 인덱스 적용. 예: `CREATE INDEX ON scenes USING GIN (inpaint_pins jsonb_path_ops);`.
- **이유**: 핀 검색·필터링 성능. 30 씬 × 5 핀 = 150 핀 규모에서도 빠른 쿼리.
- **영향**: 마이그레이션에 인덱스 정의. 쿼리 패턴이 정해진 후 Phase 3에서 추가.
- **출처**: 사전 리서치.
- **다음**: Phase 3 핀 쿼리 패턴 확정 후 인덱스 추가.

### Realtime 채널 명명 규칙
- **발견**: 채널명 표준 `project:{projectId}:scene:{sceneId}` (개별 씬) / `project:{projectId}` (전체). RLS는 자동 적용 안되므로 채널 인증 핸들러에서 owner 검증.
- **이유**: 협업 모드(P11)에서 충돌 없는 멀티 사용자 편집.
- **영향**: P11 시작 시 표준 채널 + 인증 핸들러. 영상 변환 진행률(P4)도 같은 패턴.
- **출처**: 사전 리서치.
- **다음**: Phase 4 Realtime polling 대안으로 검토.

### Storage 버킷 구조
- **발견**: 버킷 분리 — `references` (사용자 업로드 캐릭터/배경 레퍼런스, private), `generated` (AI 생성 이미지, private), `exports` (MP4 다운로드, signed URL 30일).
- **이유**: 라이프사이클 + 권한 정책 분리.
- **영향**: Phase 0 버킷 생성. cascade 삭제 정책 마이그레이션에 명시.
- **출처**: 사전 리서치.
- **다음**: Phase 0 Storage 셋업.

---

## 2026-04-20: Phase 1 사전 지식 시드

### Supabase RLS 패턴 — 프로젝트 오너 기반
- **발견**: 모든 테이블 RLS는 `owner_id = auth.uid()` (projects) 또는 `project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())` (하위 테이블). USING + WITH CHECK 절 양쪽 적용.
- **이유**: 단일 패턴으로 관리. RLS 누락은 `security-auditor`가 자동 검증.
- **영향**: 마이그레이션 템플릿에 RLS 자동 생성. 새 테이블 추가 시 동일 패턴 강제.
- **출처**: 사전 리서치.
- **다음**: Phase 0 마이그레이션 + Phase 11 협업 모드 시 다중 멤버 RLS 확장.

### JSONB 인덱싱 — inpaint_pins, personality, mood_palette
- **발견**: JSONB 컬럼에 자주 쿼리되는 키는 GIN 인덱스 또는 expression 인덱스 적용. 예: `CREATE INDEX ON scenes USING GIN (inpaint_pins jsonb_path_ops);`.
- **이유**: 핀 검색·필터링 성능. 30 씬 × 5 핀 = 150 핀 규모에서도 빠른 쿼리.
- **영향**: 마이그레이션에 인덱스 정의. 쿼리 패턴이 정해진 후 Phase 3에서 추가.
- **출처**: 사전 리서치.
- **다음**: Phase 3 핀 쿼리 패턴 확정 후 인덱스 추가.

### Realtime 채널 명명 규칙
- **발견**: 채널명 표준 `project:{projectId}:scene:{sceneId}` (개별 씬) / `project:{projectId}` (전체). RLS는 자동 적용 안되므로 채널 인증 핸들러에서 owner 검증.
- **이유**: 협업 모드(P11)에서 충돌 없는 멀티 사용자 편집.
- **영향**: P11 시작 시 표준 채널 + 인증 핸들러. 영상 변환 진행률(P4)도 같은 패턴.
- **출처**: 사전 리서치.
- **다음**: Phase 4 Realtime polling 대안으로 검토.

### Storage 버킷 구조
- **발견**: 버킷 분리 — `references` (사용자 업로드 캐릭터/배경 레퍼런스, private), `generated` (AI 생성 이미지, private), `exports` (MP4 다운로드, signed URL 30일).
- **이유**: 라이프사이클 + 권한 정책 분리.
- **영향**: Phase 0 버킷 생성. cascade 삭제 정책 마이그레이션에 명시.
- **출처**: 사전 리서치.
- **다음**: Phase 0 Storage 셋업.

---
