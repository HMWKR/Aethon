# Session Handoff - Production Loop

> Updated: 2026-05-05 01:20 KST  
> Workspace: `C:\Users\jusan\Desktop\Aethon`  
> Active goal: AETHON의 모든 축이 경쟁사 대비 객관 체크리스트 100%를 만족할 때까지, 임의 감각이 아니라 검증 가능한 benchmark/gate/test/evidence로 완성도를 측정하고 반복 구현한다.

## 2026-07-06 Claude 세션 갱신

- 8영역 심층 감사 수행(코어/AI/웹/타입체크/스모크/문서/로드맵/provider).
- 코어 3건 + UI 6건 버그 수정. 전 게이트 green: core 61/61 · ai 17/17 · web 6/6 · typecheck 0 · smoke 38/38.
- DeepSeek V4 Pro NIM 어드바이저 실통합 — 최초 실 외부 AI 호출(키: `apps/web/.env.local`의 `NVIDIA_NIM_API_KEY`).
- 플레이헤드 좌표 오차 0.4px 실측 검증.
- 날짜 기반 로드맵(D+N) 폐지 → scorecard 루프 기반 전환. 데스크톱(Tauri)은 MVP 공식 제외(post-MVP).
- 다음 타겟: SiliconFlow Wan2.2 실통합($1 무료 크레딧, 어댑터 스캐폴드 진행 중) + 미디어 프리뷰 실체(`createObjectURL` + `loadedmetadata`).

## Next Session Bootstrap

- 다음 세션은 `NEXT_SESSION_PROMPT.md`의 복붙 프롬프트를 첫 메시지로 사용한다.
- 다음 세션은 `NEXT_SESSION_HANDOFF.md`를 운영 핸드오프 문서로 읽고 preflight, target 선택, 검증 명령, final answer contract를 따른다.
- 다음 실행 방향은 `session-handoff.md`의 Recommended Next Loop와 `docs/business-plan/aethon-100-percent-production-scorecard.md`를 따른다.
- 현재 다음 target은 **Loop 11X - production C2PA signer/real render output 또는 durable media storage slice**다.
- 실행 기본값은 all-agent wave가 아니라 **relevant-agent routing**이다.
- 현재 score는 Codex harness readiness **8.8/10**, product production readiness **68/100**이다.

## Mac Bootstrap (2026-05-05 추가)

> Windows → Mac 작업 이전을 위한 부트스트랩. 본 문단은 Mac에서 첫 세션 시작 시 사용한다.

### Repository
- Origin: `https://github.com/HMWKR/Aethon` (PRIVATE)
- Mac 첫 명령:
  ```bash
  cd ~/Desktop && git clone https://github.com/HMWKR/Aethon.git && cd Aethon
  pnpm install
  ```

### 환경 변수 (Git에 없음 — Mac에서 별도 셋업)
- `apps/web/.env.local` — Supabase / Clerk / AI provider 키 일체. Windows의 `.env.local`을 안전 채널(1Password/Bitwarden 등)로 이전하거나 Vercel Env Vars에서 동기화한다.
- `.env*`는 모두 `.gitignore` 차단됨 (보안 정책).

### 머신 종속 항목 (clone 후 미존재 정상)
- `.codex/`, `.codex-tmp/` — Codex 런타임 임시 상태. Mac에서 자체 생성됨.
- `.claude/settings.local.json` — 머신 고유 hook 설정. Mac에서 필요 시 생성.
- `apps/web/.next/`, `node_modules/` — `pnpm install` 후 자동 생성.
- `apps/desktop/src-tauri/target/` — Rust 빌드 캐시. `pnpm tauri build` 시 생성.

### Mac 첫 세션 진입 순서
1. `git clone` + `pnpm install`
2. `.env.local` 복원 (Windows에서 안전 채널로 이전)
3. Docker Desktop 기동 → `pnpm supabase:start` (Supabase local stack)
4. `pnpm dev` (Next.js 16 + Turbopack)
5. 본 `session-handoff.md`의 §0~§8을 읽어 Loop 11W 직후 상태 인식
6. `NEXT_SESSION_PROMPT.md`의 복붙 프롬프트를 첫 메시지로 사용

### Mac 환경 검증 게이트
- Node.js 24 LTS 설치 (`nvm install 24 && nvm use 24`)
- pnpm 설치 (`corepack enable pnpm` 권장)
- Docker Desktop for Mac (Supabase local stack 의존)
- gh CLI 인증 (`gh auth login`)
- 첫 검증: `pnpm production:check` (103 unit/security tests + 5-package typecheck/build + 38 production Playwright smoke)

### 다음 작업 포인터
- 현재 target: **Loop 11X — production C2PA signer / real render output / durable media storage slice** (위 §Next Session Bootstrap 참조).
- 실행 기본값: **relevant-agent routing** (all-agent wave 아님).
- 진행 상태: harness 8.8/10, product 68/100.

## 0. Loop 11C Current Direction - AI Planner, Export QC, and Agent Report Consolidation

- User direction: Claude-only agent 하위 구조가 아니라 root-level `agents/`를 공용 agent contract로 사용한다.
- Decision: `agents/AGENT_CONTRACT.md` + `agents/*.md`를 SSoT로 승격하고, `.claude/agents/*.md`는 Claude compatibility adapter로 남긴다.
- Codex runtime rule: all-agent work는 계속 수행하되, 대형 세션 전체를 `fork_context:true`로 모든 agent에 복제하지 않는다. `agents/CODEX_RUNTIME.md`의 6-role batch wave로 전체 23개 역할을 빠짐없이 실행한다.
- Incident: full-context multi-agent spawn 중 Codex process OOM이 발생했다. 원인 후보는 긴 세션 context fork와 불필요한 MCP discovery surface의 결합이다.
- Mitigation: CapCut MCP는 user 동의하에 `C:\Users\jusan\.codex\config.toml`에서 제거했고, 백업은 `C:\Users\jusan\.codex\config.toml.bak-20260504-035827`에 있다.
- Incident 2: Wave D spawn 중 `Starting MCP servers (0/9)`가 15분 이상 반복되고 timeout이 폭발했다. 확인 결과 CapCut은 제거된 상태였지만 활성 MCP가 `cantos`, `context7`, `notionApi`, `playwright`, `xcodebuildmcp`, `figma`, `supabase`, `vercel` 등 9개 표면으로 남아 있었다. 이 오류는 코드 실패가 아니라 MCP cold-start/동시 agent startup 실패다.
- Mitigation 2: all-agent wave에서는 MCP 사용을 subagent에게 요구하지 않는다. main Codex가 wave 종료 후 Cantos/Playwright 등 필요한 MCP만 순차 실행한다. MCP timeout이 한 번 발생한 세션에서는 다음 wave 동시성을 최대 3개 역할로 낮춘다.
- Scorecard: `docs/business-plan/aethon-100-percent-production-scorecard.md`를 추가했다. 현재 기준은 harness readiness 8.8/10, product production readiness 68/100이다. Product-lead가 31/100 headline과 축별 합산 37/100 불일치를 지적해 37/100으로 정정했고, Loop 11A disabled export affordance fix 후 38/100, Loop 11B core timeline primitives 후 40/100, Loop 11C AI planner/export QC/DB drift hardening 후 42/100, Loop 11D provider-sim persistence/readback 후 46/100, Loop 11F provider-sim SQL completion transaction 후 48/100, Loop 11G NLE trim/snap/move/keyboard/linked-audio 후 50/100, Loop 11H rolling/slip/zoom 후 51/100, Loop 11I source/program monitor commands and source-duration bounds 후 52/100, Loop 11J pointer drag/resize gestures 후 53/100, Loop 11K trim-in resize gestures 후 54/100, Loop 11L roll boundary gestures 후 55/100, Loop 11M ripple trim-end gesture 후 56/100, Loop 11N ripple trim-start gesture 후 57/100, Loop 11O media metadata source-duration hydration 후 58/100, Loop 11P timeline viewport zoom/scroll readout 후 59/100, Loop 11Q timeline viewport reload persistence 후 60/100, Loop 11R timeline scrollbar/minimap navigator 후 61/100, Loop 11S browser-local media import persistence 후 62/100, Loop 11T export manifest evidence expansion 후 63/100, Loop 11U browser-local media search/tag filtering 후 64/100, Loop 11V local Supabase runtime evidence 후 67/100, Loop 11W local render artifact/provenance evidence 후 68/100으로 갱신했다.
- Latest verification: after Loop 11W, local Supabase was reset to apply the updated export manifest evidence migration and `pnpm supabase:verify` passed. `$env:AETHON_E2E_PORT='3031'; pnpm production:check` also passed with 103 unit/security/source tests, 5-package typecheck, 5-package build, and 38 production Playwright smoke tests.
- Cantos/Playwright evidence:
  - Cantos ADR: `C:\Users\jusan\Desktop\cantos\projects\aethon\adr\0013-codex-native-agent-contracts-lightweight-waves.html`
  - Cantos DDR: `C:\Users\jusan\Desktop\cantos\projects\aethon\ddr\0020-loop11a-codex-agent-editor-readiness-evidence.html`
  - Cantos DDR: `C:\Users\jusan\Desktop\cantos\projects\aethon\ddr\0021-loop11a-disabled-export-affordance-fix.html`
  - Cantos ADR: `C:\Users\jusan\Desktop\cantos\projects\aethon\adr\0014-core-timeline-edit-primitives-before-ui-wiring.html`
  - Cantos DDR: `C:\Users\jusan\Desktop\cantos\projects\aethon\ddr\0022-loop11b-timeline-edit-workflow-evidence.html`
  - Cantos ADR: `C:\Users\jusan\Desktop\cantos\projects\aethon\adr\0015-loop11c-deterministic-ai-planner-export-qc-drift-gates.html`
  - Cantos DDR: `C:\Users\jusan\Desktop\cantos\projects\aethon\ddr\0023-loop11c-production-gate-70-tests-20-smoke.html`
  - Cantos ADR: `C:\Users\jusan\Desktop\cantos\projects\aethon\adr\0016-loop11f-provider-sim-sql-completion-transaction.html`
  - Screenshots: `docs/business-plan/assets/aethon-loop11a-codex-agent-scorecard-before-1440.png`, `docs/business-plan/assets/aethon-loop11a-codex-agent-scorecard-before-mobile-390.png`, `docs/business-plan/assets/aethon-cantos-adr-0013-codex-agent-contracts-1440.png`, `docs/business-plan/assets/aethon-loop11a-disabled-export-after-1440.png`, `docs/business-plan/assets/aethon-loop11a-disabled-export-after-mobile-390.png`, `docs/business-plan/assets/aethon-loop11a-disabled-export-after-export-tab-1440.png`, `docs/business-plan/assets/aethon-loop11b-timeline-split-after-1440.png`, `docs/business-plan/assets/aethon-loop11b-timeline-ripple-delete-after-1440.png`, `docs/business-plan/assets/aethon-cantos-adr-0015-loop11c-1440.png`, `docs/business-plan/assets/aethon-cantos-ddr-0023-loop11c-gate-1440.png`
- All-agent wave: all 23 roles have produced latest gap reports through lightweight waves. Do not use full-context fork for broad waves; keep max 6 roles per wave.
- User direction update: 앞으로는 모든 agent를 매번 띄우지 않고, 현재 작업에 직접 필요한 역할만 1-3개 선택해 실행한다. 전체 23명은 scorecard 기준 roster로 유지하되, 실행 기본값은 relevant-agent routing이다.
- Loop 11B implementation: `packages/core/src/video-editing.ts`에 `splitClipAtTime`, `splitClipAtPlayhead`, `rippleDeleteClip`, `TimelineHistory`, `applyTimelineEdit`, `undoTimelineEdit`, `redoTimelineEdit`를 추가했고 `packages/core/src/video-editing.test.ts`로 6개 테스트를 추가했다. `apps/web/app/studio-client.tsx`는 Split/Ripple Delete/Undo/Redo 버튼을 core command model에 연결했고, `apps/web/tests/e2e/studio.smoke.spec.ts`는 desktop/mobile에서 split → ripple delete → undo → redo workflow를 검증한다.
- Loop 11C implementation: added `@aethon/ai` deterministic scene planner, prompt-pair linting, and Claude adviser cache-boundary request builder. Export readiness now blocks validation reports that still need review. DB security tests now guard `schema.sql` vs initial migration drift.
- Loop 11D completed: `packages/core/src/provider-sim.ts` now carries run/asset/model-run evidence through validation, cost, rights, and export manifest contracts. `packages/db/src/ai-control-repository.ts` now preserves those fields, can save generated output assets, and can read back a full generation-run evidence bundle. `packages/db/schema.sql`, `packages/db/migrations/0001_initial_ai_control.sql`, and `packages/db/verification/rls-catalog-check.sql` now enforce/check project-scoped evidence FKs.
- Loop 11E repository slice completed: `SupabaseAiControlRepository` now wraps `claim_generation_run` and provides `completeProviderSimulatedRun`. Completion checks `lease_owner`, `claim_token`, and `lease_expires_at` before terminal update, saves generated output assets, and writes deterministic event/validation/cost/rights/export rows with duplicate-safe inserts.
- Loop 11F SQL transaction slice completed: `complete_provider_simulated_run` now wraps provider-sim terminal completion in one `security invoker` SQL RPC. It validates `lease_owner`, `claim_token`, and `lease_expires_at > completed_at`, writes the output asset before terminal FK update, appends run events, and writes validation/cost/rights/export evidence with duplicate-safe inserts.
- Loop 11G completed: Supabase CLI was unavailable, so the loop used the planned fallback NLE P0 slice. `packages/core/src/video-editing.ts` now supports trim start/end, move, snap-to-previous-boundary, linked aligned audio propagation, snapping, locked-track checks, and same-track overlap rejection. `apps/web/app/studio-client.tsx` now exposes Snap, Trim In, Trim Out, Move +1s, and keyboard shortcuts for V/B/T, trim brackets, and Ctrl/Cmd+Arrow move.
- Loop 11H completed: `packages/core/src/video-editing.ts` now supports adjacent rolling edits, slip in-point edits, and clamped timeline zoom. `apps/web/app/studio-client.tsx` exposes Roll +0.5s, Slip +0.5s, Zoom -/+, Shift+ArrowRight roll, Alt+ArrowRight slip, S slip tool, and +/- zoom shortcuts. The timeline header now auto-sizes so wrapped controls do not overlap the ruler, and clip lanes project workspace zoom through an inner scaled layer.
- Loop 11I completed: Supabase CLI remained unavailable, so the loop continued the planned non-destructive NLE fallback. `packages/core/src/video-editing.ts` now carries optional `sourceDurationSeconds` and rejects trim-out, rolling edit, and slip edits that exceed source media bounds. `apps/web/app/studio-client.tsx` exposes Source Slip +0.5s and Program Roll +0.5s buttons in the source/program monitors, both routed through the shared reducer command model. Mobile CSS now resets editor grid rows to auto and constrains monitor widths so program frames cannot intercept inspector tabs.
- Loop 11J completed: Supabase CLI remained unavailable, Docker Desktop daemon was not running, and Supabase SQL MCP did not expose a confirmed local/dev write target, so DB writes stayed blocked. The loop added pointer drag move and trim-out resize handles in the Studio timeline, with pointer delta converted into existing reducer/core commands. Mobile timeline actions now use a constrained two-column grid so the timeline header does not overflow the viewport.
- Loop 11K completed: Supabase CLI remained unavailable and Docker Desktop daemon was still not running, so the loop continued the non-destructive NLE fallback. The Studio timeline now exposes a trim-in resize handle, pointer deltas route to `trimClipStart` through the reducer/core command layer, and desktop/mobile smoke verifies start, duration, in-point, and linked audio propagation.
- Loop 11L completed: Supabase CLI remained unavailable and Docker Desktop daemon was still not running, so DB runtime writes stayed blocked. The Studio timeline now exposes a compact roll boundary handle on clips with an adjacent previous same-track clip. Pointer deltas route to `rollEditBoundary` through the reducer/core command layer, and desktop/mobile smoke verifies previous clip duration, room tone, selected clip geometry, in-point, and linked audio propagation.
- Loop 11M completed: Supabase CLI remained unavailable and Docker Desktop daemon was still not running, so DB runtime writes stayed blocked. Core now has `rippleTrimClipEnd`, including downstream clip shifting and source-duration rejection. The Studio timeline exposes a compact ripple-end handle, and desktop/mobile smoke verifies selected clip duration, linked room tone duration, downstream video start, and linked audio start after pointer ripple trim.
- Loop 11N completed: Supabase CLI remained unavailable and Docker Desktop daemon was still not running, so DB runtime writes stayed blocked. Core now has `rippleTrimClipStart`, including linked start/end propagation, downstream closure, and backward-trim rejection. The Studio timeline exposes a compact ripple-start handle, and desktop/mobile smoke verifies selected clip duration/in-point, linked keyframe in-point, room tone duration, downstream video start, and linked audio start after pointer ripple trim-start.
- Loop 11O completed: Supabase CLI remained unavailable and Docker Desktop daemon was still not running, so DB runtime writes stayed blocked. Core now has `SourceMediaMetadata` and `hydrateWorkspaceSourceDurations`; seed clips link to `sourceAssetId` values and derive `sourceDurationSeconds` from provider-result/file-probe metadata. Project Bin now renders media metadata tiles, and Clip Inspector shows source asset, source duration, and metadata provenance for the selected clip.
- Loop 11P completed: Supabase CLI remained unavailable and Docker Desktop daemon was still not running, so DB runtime writes stayed blocked. Core now owns `scrollSeconds`, `setTimelineScroll`, and `getTimelineVisibleRange`; Studio timeline ruler, clips, playhead, pointer gesture math, scroll buttons, and `Window` readout all use the same visible-range contract.
- Loop 11Q completed: Supabase CLI remained unavailable and Docker Desktop daemon was still not running, so DB runtime writes stayed blocked. Studio now persists only timeline `zoom` and `scrollSeconds` in versioned browser localStorage, then restores them through `setTimelineZoom` and `setTimelineScroll` so invalid values are clamped by core.
- Loop 11R completed: Supabase CLI remained unavailable and Docker Desktop daemon was still not running, so DB runtime writes stayed blocked. Studio now renders a compact timeline navigator with minimap clips, visible-window overlay, and direct range scrollbar, all driven by the existing `scrollSeconds`, `setTimelineScroll`, and `getTimelineVisibleRange` contract. Production smoke caught and fixed range step quantization by changing scrollbar step from `0.1` to `0.01`.
- Loop 11S completed: Supabase CLI remained unavailable and Docker Desktop daemon was still not running, so DB runtime writes stayed blocked. Studio now supports browser-local media/reference import, deterministic imported source metadata, localStorage reload persistence, Project Bin active selection, and Source Monitor metadata readout. The scope is explicit metadata persistence, not binary upload or cloud storage.
- Loop 11T completed: Supabase CLI remained unavailable and Docker Desktop daemon was still not running, so DB runtime writes stayed blocked. Core/export contracts now include explicit validation/cost/rights evidence ids, generated-content label, provenance summary, rights evidence asset ids, and readiness checks. Provider-sim successful exports populate those fields. DB repository readback maps expanded provenance through existing `rights_summary`, and Studio Export inspector shows the concrete manifest evidence block.
- Loop 11U completed: Supabase CLI remained unavailable and Docker Desktop daemon was still not running, so DB runtime writes stayed blocked. `SourceMediaMetadata` now carries tags and thumbnail labels, seeded media has deterministic tags, imported browser-local media infers/restores tags from file metadata, and Studio Project Bin supports search, tag filtering, result counts, and thumbnail label chips.
- Loop 11V completed: Supabase CLI is now installed as a root dev dependency, Docker Desktop local Linux daemon was started, `supabase/config.toml` and the CLI migration path were initialized, and `pnpm supabase:verify` proves RLS catalog plus provider-sim queue/claim/complete runtime cases against local Supabase. The runtime check covers same-token retry idempotency, different-worker active lease rejection, stale lease rejection, failed completion without export manifest, owner RLS isolation, and fixture cleanup.
- Loop 11W completed: Core/export contracts now include deterministic render artifact proof and a local provenance/C2PA attachment shape. Provider-sim successful exports populate render artifact id/URI/checksum and verified local attachment evidence. DB schema/migrations/RPC/repository mapping preserve these fields through first-class export manifest columns, and Studio Export inspector shows artifact-level provenance while final export remains blocked by unresolved QC/rights issues. This is local attestation evidence, not production C2PA signing or a real render file.
- Latest verification: `pnpm --filter @aethon/core test`, `pnpm --filter @aethon/db test`, `pnpm --filter @aethon/web typecheck`, `pnpm --filter @aethon/web build`, `$env:AETHON_E2E_PORT='3031'; pnpm --filter @aethon/web smoke:prod`, and `$env:AETHON_E2E_PORT='3031'; pnpm production:check` passed. Full production gate passed with 103 unit/source/security tests, 5-package typecheck, 5-package build, and 38 production Playwright smoke tests.
- Latest Cantos evidence: ADR `C:\Users\jusan\Desktop\cantos\projects\aethon\adr\0033-loop11w-deterministic-render-artifact-local-provenance.html`, DDR `C:\Users\jusan\Desktop\cantos\projects\aethon\ddr\0040-loop11w-export-render-artifact-evidence.html`, DDR `C:\Users\jusan\Desktop\cantos\projects\aethon\ddr\0041-loop11w-c2pa-verification-readout-evidence.html`.
- Latest screenshots: `docs/business-plan/assets/aethon-loop11w-render-artifact-proof-1440.png`, `docs/business-plan/assets/aethon-loop11w-render-artifact-proof-mobile-390.png`, `docs/business-plan/assets/aethon-loop11w-c2pa-render-proof-1440.png`, `docs/business-plan/assets/aethon-loop11w-c2pa-render-proof-mobile-390.png`.
- Previous Loop 11G evidence remains: ADR `0017-loop11g-timeline-trim-snap-move-command-model.html`, DDR `0024-loop11g-timeline-command-controls-and-shortcuts.html`, screenshots `aethon-loop11g-timeline-trim-move-1440.png`, `aethon-loop11g-timeline-trim-move-mobile-390.png`.
- Next implementation: do not write to production Supabase without explicit approval. With local DB evidence and local render artifact proof complete, continue with the smallest P0 product slice such as production C2PA signer/real render output, durable media storage/real thumbnails, or approved staging Supabase verification if the user provides a staging target.

## 1. Current Status

- Goal status: **in progress**.
- Latest completed loop: **Loop 11W - deterministic render artifact proof + local provenance attachment**.
- Current production gate: **passed** via `pnpm production:check`.
- Current product direction:
  - AI video IDE + professional video editor.
  - Premiere Pro/CapCut-grade workspace as the product quality bar.
  - AI mode is adviser-first by default; Auto is explicit task-level opt-in only.
  - User remains responsible for paid provider calls, model choice, final export, rights, and quality decisions.
- Active local agent mapping used in the latest loop:
  - Loop 11W used relevant-agent routing only: `product-lead`, `legal-compliance`, `desktop-qa-lead`, and `data-lead` were mapped/emulated by main Codex.
  - major remaining blockers: approved staging/production Supabase evidence, live Clerk auth session integration, real provider execution, durable media storage and real thumbnails, desktop/Tauri shell, production C2PA signer/real render output, observability/cost dashboard, and export provenance depth.

## 2. Loop 10B Completed

### Product/Technical Problem

The previous implementation could treat provider/model strings too loosely. That is dangerous before live provider execution because a recommendation like `Runway / Seedance` or provider-only match could accidentally queue the wrong external model. For an AI video editor, this is a production-grade boundary: paid provider calls must be tied to a verified catalog record, not UI text.

### Implemented

- `packages/core/src/production-readiness.ts`
  - Added provider catalog fields:
    - `providerKey`
    - `modelKey`
    - `status`
    - `sourceUrl`
    - `verificationTtlDays`
    - `termsRisk`
  - Added lifecycle status support:
    - `active`
    - `stale`
    - `deprecated`
    - `disabled`
  - Replaced loose provider/model matching with exact normalized `providerKey + modelKey` matching.
  - Added:
    - `findProviderCapabilityByModel`
    - `validateProviderCatalogSelection`
    - `validateProviderCapabilityForQueue`
    - `isProviderCapabilityExpired`
  - Queue blockers now include:
    - unknown provider capability
    - stale/deprecated/disabled capability
    - expired verification TTL
    - non-commercial capability
  - High terms risk remains a warning unless policy later chooses to block it.

- `packages/core/src/generation-run.ts`
  - `GenerationRun` now stores a provider capability snapshot:
    - `providerCapabilityId`
    - `providerKey`
    - `modelKey`
    - `pricingVersion`
    - `providerTermsUrl`
    - `providerCapabilityVerifiedAtIso`
  - `queueGenerationRunFromSuggestion` now:
    - validates the recommended option against provider catalog before queueing
    - blocks unknown/mismatched/stale catalog choices
    - canonicalizes `provider` and `model` from the catalog capability
    - keeps adviser approval semantics intact

- `packages/db/schema.sql`
- `packages/db/migrations/0001_initial_ai_control.sql`
  - `generation_runs` now stores provider snapshot columns:
    - `provider_capability_id`
    - `provider_key`
    - `model_key`
    - `pricing_version`
    - `provider_terms_url`
    - `provider_capability_verified_at`
  - `provider_capability_versions` now uses:
    - project-scoped stable id: primary key `(project_id, id)`
    - exact unique key: `(project_id, provider_key, model_key, pricing_version)`
    - lifecycle fields: `lifecycle_status`, `verified_expires_at`, `deprecated_at`, `replacement_capability_id`
    - provenance/risk fields: `source_url`, `terms_risk`
  - Added `generation_runs_provider_capability_fk`.
  - `record_ai_decision_and_queue_generation_run` now guards:
    - decision must be `accepted` or `edited`
    - run status must be `queued`
    - trigger mode cannot be `off`
    - initial `retry_count` must be `0`
    - `started_at` and `completed_at` must be null on newly queued runs
    - suggestion must belong to the same project and scene
    - provider capability must be active, commercially allowed, unexpired, and exact-match by id/provider key/model key/pricing/terms/verified timestamp

- `packages/db/src/ai-control-repository.ts`
  - Persists and reads provider capability snapshot fields.
  - Sends the new snapshot fields into the queue RPC.
  - Upserts provider capabilities with `project_id,provider_key,model_key,pricing_version`.

- `packages/db/src/schema-types.ts`
  - Added TypeScript record fields for generation run provider snapshots.
  - Added provider catalog lifecycle/provenance fields.

- `apps/web/app/actions/ai-control.ts`
  - Persisted queue paths now upsert the exact server catalog capability before `generation_runs` insert/RPC.
  - This keeps the DB FK/guard strict while avoiding empty-project catalog failures.

- `apps/web/app/studio-client.tsx`
  - UI provider capability card uses model-only display lookup so the visible inspector still works.
  - Actual queue path remains exact provider/model via core queue contract.

- `packages/db/verification/rls-catalog-check.sql`
  - Added live verification checks for:
    - provider catalog lifecycle columns
    - exact provider/model/pricing constraint
    - generation run provider capability FK
    - queue RPC active/expiry/commercial provider guard

## 3. Tests Added/Updated

- `packages/core/src/ai-control.test.ts`
  - Provider validation test updated to use exact `Kling / Kling image-to-video`.
  - Added tests for:
    - provider/model mismatch does not match catalog
    - model-only UI lookup still finds the display capability
    - unknown recommendation blocks queueing
    - expired provider capability blocks queueing
    - queued run carries provider capability snapshot fields

- `packages/db/src/schema-security.test.ts`
  - Added static assertions for:
    - provider snapshot columns on `generation_runs`
    - lifecycle/exact key fields on `provider_capability_versions`
    - `generation_runs_provider_capability_fk`
    - RPC guards for accepted/edited decisions, queued status, AI Off blocking, retry_count, timestamps, exact provider keys, active lifecycle, commercial use, verification expiry, and scene scoping

## 4. Verification Evidence

Commands run:

```powershell
pnpm --filter @aethon/core exec vitest run --pool=threads
pnpm --filter @aethon/db exec vitest run --pool=threads
pnpm --filter @aethon/web test
pnpm typecheck
pnpm build
pnpm test
pnpm production:check
```

Results:

- `@aethon/core`: **21 tests passed**
- `@aethon/db`: **19 tests passed**
- `@aethon/web`: **6 tests passed**
- Total unit/source/security tests: **46 passed**
- Typecheck: **4 packages passed**
- Build: **4 packages passed**
- Production browser smoke: **18 Playwright tests passed**
  - desktop Chromium
  - mobile Chrome
  - production `next start`
  - console/pageerror fixture active

Browser evidence:

- Playwright MCP was attempted but blocked by existing Chrome profile lock:
  - `Browser is already in use for ... mcp-chrome-6853872`
- Fallback evidence captured with Playwright CLI against the same production server:
  - `docs/business-plan/assets/loop-10b-provider-catalog-prod.png`
  - `docs/business-plan/assets/loop-10b-provider-catalog-mobile-prod.png`

## 5. Docs/Knowledge Updated

- `docs/domain-knowledge/ai-video-router-insights.md`
- `docs/domain-knowledge/data-insights.md`
- `docs/domain-knowledge/desktop-qa-insights.md`
- `docs/domain-knowledge/shared/changelog.md`
- `session-handoff.md`

Note: Cantos MCP DDR was not used in this continuation because a previous Cantos MCP evidence write was rejected as an external data transfer risk. Local docs and screenshot artifacts were used as the safe evidence fallback.

## 6. Remaining High-Priority Risks

1. **Provider catalog exactness/staleness**
   - Current provider source URLs/pricing/terms are seed estimates.
   - Before live paid provider calls, each provider must be refreshed from current official docs/account terms.
   - Needed fields: exact model id, terms URL, pricing version, verified timestamp, TTL, region availability, retention policy, commercial rights, deprecated/sunset state.

2. **Supabase live enforcement**
   - Static SQL tests pass, but live Supabase local/staging execution is still pending.
   - Need `packages/db/verification/rls-catalog-check.sql` against a real DB.
   - Need two-user cross-project RLS test.
   - Review note: direct authenticated table grants are still broad for several workflow tables. Before paid provider workers are connected, privileged writes should move behind narrow RPCs or a server-only service-role path.

3. **Provider-sim execution path**
   - Core, repository, and SQL RPC contracts now produce/save/read result asset, validation report, cost ledger entry, rights manifest entry, export manifest, and append-only run events.
   - Loop 11V proved the local Supabase runtime path for the SQL RPC, RLS catalog script, same-token retry, different-worker rejection, stale-lease rejection, failed completion, and owner isolation.
   - Remaining gap: approved staging target and real provider/queue integration.

4. **Queue lease/idempotency**
   - The DB blocks duplicate approved suggestion runs.
   - Claim RPC and completion RPC now have local runtime evidence for active lease and same-token retry behavior.

5. **Legal/export evidence**
   - Manifest evidence, generated-content label, local render artifact proof, and local provenance attachment evidence now exist.
   - Production C2PA signing, real render output verification, license evidence attachment, and SBOM/license allowlist gate are still incomplete.

6. **NLE primitives**
   - Split, ripple delete, undo/redo, trim in/out, snap-to-boundary, move, rolling edit, slip edit, keyboard shortcuts, zoom controls, aligned linked-audio propagation, source/program monitor command buttons, source-duration guards, pointer drag move, trim-out/in resize handles, roll boundary handles, ripple trim-end/start handles, and media metadata-backed source-duration hydration now exist in core and UI.
   - Zoom, bounded viewport scroll, browser-local viewport persistence, direct scrollbar/minimap navigation, browser-local media import persistence, and browser-local media tags/search now exist. Remaining product debt is durable backend media storage, real thumbnails/indexing, production export signing, and dense-editor refinements beyond the current P0 slices.

## 7. Recommended Next Loop

Recommended target: **Loop 11X - production C2PA signer/real render output or durable media storage slice**.

Suggested implementation slice:

1. If the user provides an approved staging Supabase target, repeat the local `pnpm supabase:verify` intent against staging only. Do not connect to production without explicit approval.

2. Otherwise choose the next smallest P0 product slice:
   - production C2PA signer and real render output, only with explicit credential/policy approval
   - durable media storage/real thumbnail extraction
   - Playwright evidence for the selected workflow on desktop and mobile

3. Run the same loop gate:
   - unit/security tests
   - typecheck
   - build
   - production smoke
   - screenshot evidence if UI changes
   - docs/domain knowledge/handoff update

## 8. Operating Notes For Next Session

- Do not use old dual-engine/duet-specific assumptions; the user said that infrastructure will change.
- Continue agent mapping in waves. Do not claim all agents are actively running unless actually spawned.
- Use `production-loop` skill when the user asks to continue the indefinite production loop.
- Use Playwright MCP first for browser evidence; if MCP remains profile-locked, record the blocker and use Playwright CLI fallback.
- User explicitly requested Cantos MCP records for this goal. Continue writing ADR/DDR for material architecture/design decisions, and pair UI changes with Playwright MCP screenshots when possible.
- Do not make live provider calls, paid API calls, Supabase production writes, or secret reads without explicit confirmation.
