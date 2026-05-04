# AETHON Organization Changelog

> Major organization, agent, insight, and harness changes.

## 2026-05-05: Loop 11W deterministic render artifact and local provenance evidence

- Added `ExportRenderArtifact` and `C2paProvenanceAttachment` to the core export manifest contract.
- Added deterministic local helpers for render artifact proof and local provenance attachment evidence.
- Provider-sim successful exports now include render artifact id, URI, checksum, and verified local C2PA attachment evidence.
- Export readiness now blocks ready preview manifests that lack render artifact proof and blocks attached C2PA claims without verified attachment evidence.
- DB schema, Supabase migration, repository mapping, and provider-sim SQL runtime fixture now preserve render/provenance evidence as first-class export manifest columns.
- Studio Export inspector now shows render artifact id, checksum, artifact URI, C2PA status, C2PA verification, policy, signature, signer, and manifest hash.
- Production smoke now verifies the render/provenance evidence on desktop and mobile.
- Verified: `$env:AETHON_E2E_PORT='3031'; pnpm production:check` passed with 103 unit/source/security tests, 5-package typecheck/build, and 38 production Playwright smoke tests. Local Supabase reset plus `pnpm supabase:verify` also passed after the schema migration update.
- Screenshot evidence: `aethon-loop11w-render-artifact-proof-1440.png`, `aethon-loop11w-render-artifact-proof-mobile-390.png`, `aethon-loop11w-c2pa-render-proof-1440.png`, `aethon-loop11w-c2pa-render-proof-mobile-390.png`.
- Cantos evidence: ADR `0033-loop11w-deterministic-render-artifact-local-provenance.html`, DDR `0040-loop11w-export-render-artifact-evidence.html`, DDR `0041-loop11w-c2pa-verification-readout-evidence.html`.
- Product readiness score moved from 67/100 to 68/100.
- Boundary: this is local deterministic attestation, not a production C2PA signer or a real render-output file.

## 2026-05-05: Loop 11V local Supabase runtime evidence

- Added root Supabase CLI dev dependency and repo scripts: `supabase:start`, `supabase:db:reset`, `supabase:verify:rls`, `supabase:verify:provider-sim`, `supabase:verify`.
- Initialized `supabase/config.toml`, created `supabase/migrations/20260504150838_initial_ai_control.sql`, and kept `supabase/seed.sql` empty for the local reset path.
- Fixed live role grant drift by revoking broad `anon`/`authenticated` grants before re-granting least privileges in `schema.sql`, initial migration, and Supabase CLI migration.
- Hardened `rls-catalog-check.sql` against catalog predicate casing and added `provider-sim-runtime-check.sql` for local runtime verification.
- Runtime evidence now covers RLS owner isolation, ledger SELECT/INSERT-only grants, queue -> claim -> complete success, same-token retry idempotency, different-worker and stale-lease rejection, failed completion without export manifest, and deterministic fixture cleanup.
- Verified: `pnpm supabase:verify`, `pnpm --filter @aethon/db test`, `pnpm --filter @aethon/db typecheck`, and `$env:AETHON_E2E_PORT='3031'; pnpm production:check` passed with 100 unit/source/security tests, 5-package typecheck/build, and 38 production Playwright smoke tests.
- Cantos evidence: ADR `0032-loop11v-local-supabase-runtime-verification.html`, DDR `0039-loop11v-supabase-runtime-evidence.html`.
- Product readiness score moved from 64/100 to 67/100.

## 2026-05-04: Loop 11U browser-local media search and tags

- Added `tags` and `thumbnailLabel` to `SourceMediaMetadata`.
- Seed media now carries generated/uploaded/audio/reference tags and deterministic thumbnail labels.
- Imported browser-local media now infers deterministic tags from file type/name and preserves tags/thumbnail labels through localStorage restore.
- Studio Project Bin now includes media search, tag filtering, result count, thumbnail label chips, and tag readouts.
- Extended desktop/mobile production smoke to verify import tags, `noir` search, `imported` tag filtering, hidden non-matching sources, and reload persistence.
- Verified: `$env:AETHON_E2E_PORT='3031'; pnpm production:check` passed with 99 unit/source/security tests, 5-package typecheck/build, and 38 production Playwright smoke tests.
- Screenshot evidence: `aethon-loop11u-media-search-tags-1440.png`, `aethon-loop11u-media-search-tags-mobile-390.png`.
- Product readiness score moved from 63/100 to 64/100.

## 2026-05-04: Loop 11T export manifest evidence expansion

- Added explicit export manifest evidence fields for validation report ids, cost ledger ids, rights manifest ids, generated-content label, and provenance summary.
- Export readiness now blocks missing asset/model/validation/cost/rights evidence and missing generated-content labels.
- Provider-sim successful exports now include full manifest evidence and remain ready only when evidence is complete.
- Studio Export inspector now shows a `Manifest evidence` panel with concrete asset, model run, validation, cost, rights, rights evidence, generated label, and C2PA status.
- DB repository mapping stores expanded provenance through existing `rights_summary` and keeps static readback checks covered.
- Verified: `$env:AETHON_E2E_PORT='3031'; pnpm production:check` passed with 99 unit/source/security tests, 5-package typecheck/build, and 38 production Playwright smoke tests.
- Cantos evidence: ADR `0030-loop11t-export-manifest-evidence-contract.html`, DDR `0037-loop11t-export-manifest-evidence-inspector.html`.
- Screenshot evidence: `aethon-loop11t-export-manifest-evidence-1440.png`, `aethon-loop11t-export-manifest-evidence-mobile-390.png`.
- Product readiness score moved from 62/100 to 63/100.

## 2026-05-04: Next session handoff file

- Added `NEXT_SESSION_HANDOFF.md` as the next-session operating handoff.
- The handoff records the current loop baseline, product readiness score, next target selection, Supabase runtime evidence path, fallback product slices, MCP/Cantos/Playwright policy, verification commands, scoring rules, and final answer contract.
- Updated `NEXT_SESSION_PROMPT.md` and `session-handoff.md` to point the next session to the new handoff file.

## 2026-05-04: Loop 11S browser-local media import persistence

- Added Project Bin `Import Media` for browser-local video/audio/image metadata import.
- Added deterministic imported media ids, `uploaded-image` source type support, imported tile selection, and Source Monitor metadata readout.
- Persisted imported metadata in versioned localStorage with an explicit browser-local scope; no cloud upload or binary persistence is claimed.
- Extended desktop/mobile production smoke to verify import, active imported tile, Source Monitor readout, and reload persistence.
- Verified focused gates: `@aethon/core` tests, `@aethon/web` tests, web typecheck/build, and production smoke 38 passed.
- Cantos evidence: ADR `0029-loop11s-browser-local-media-import-persistence-contract.html`, DDR `0036-loop11s-media-import-project-bin-evidence.html`.
- Screenshot evidence: `aethon-loop11s-media-import-persistence-1440.png`, `aethon-loop11s-media-import-persistence-mobile-390.png`.
- Product readiness score moved from 61/100 to 62/100.

## 2026-05-04: Loop 11R timeline navigator scrollbar and minimap

- Added a compact `timeline-navigator` with minimap clips, visible-window overlay, and direct range scrollbar.
- Kept scrollbar state on the existing core visible-range contract: `scrollSeconds`, `setTimelineScroll`, and `getTimelineVisibleRange`.
- Extended desktop/mobile production smoke to verify navigator visibility, scrollbar max/value, minimap window position, and reload persistence.
- Fixed a caught browser range quantization issue by aligning scrollbar `step` to 0.01 seconds instead of 0.1 seconds.
- Verified: `$env:AETHON_E2E_PORT='3031'; pnpm production:check` passed with 97 unit/source/security tests, 5-package typecheck/build, and 36 production Playwright smoke tests.
- Cantos evidence: ADR `0028-loop11r-timeline-navigator-scrollbar-minimap-contract.html`, DDR `0035-loop11r-timeline-navigator-scrollbar-minimap-evidence.html`.
- Screenshot evidence: `aethon-loop11r-timeline-navigator-1440.png`, `aethon-loop11r-timeline-navigator-mobile-390.png`.
- Product readiness score moved from 60/100 to 61/100.

## 2026-05-04: Loop 11Q timeline viewport reload persistence

- Added versioned browser-local persistence for timeline `zoom` and `scrollSeconds`.
- Restored persisted viewport state through `setTimelineZoom` and `setTimelineScroll`, so core clamping still owns valid timeline ranges.
- Extended desktop/mobile production smoke to zoom, scroll, reload, and verify the same `Zoom 125%` and `Window 00:00:02:22 - 00:00:14:14` readouts.
- Verified: `pnpm --filter @aethon/web typecheck`, `pnpm --filter @aethon/web build`, and targeted production smoke passed.
- Cantos evidence: ADR `0027-loop11q-timeline-viewport-persistence-contract.html`, DDR `0034-loop11q-timeline-viewport-reload-persistence.html`.
- Product readiness score moved from 59/100 to 60/100.

## 2026-05-04: Loop 11P timeline viewport zoom-scroll readout

- Added `scrollSeconds`, `setTimelineScroll`, and `getTimelineVisibleRange` in the core video editing model.
- Studio timeline now renders ruler, playhead, clip positions, pointer gesture math, scroll buttons, and `Window` readout from the same visible-range contract.
- Mobile selection readout now uses a compact grid so Selected, Scene, Zoom, and Window values fit without overlap.
- Added core scroll clamping tests and desktop/mobile production smoke assertions for zoom + scroll behavior.
- Verified: `pnpm production:check` passed with 97 tests, 5-package typecheck/build, and 36 production Playwright smoke tests.
- Cantos evidence: ADR `0026-loop11p-timeline-viewport-scroll-contract.html`, DDR `0033-loop11p-timeline-zoom-scroll-readout.html`.
- Screenshot evidence: `aethon-loop11p-timeline-zoom-scroll-window-1440.png`, `aethon-loop11p-timeline-zoom-scroll-window-mobile-390.png`.
- Product readiness score moved from 58/100 to 59/100.

## 2026-05-04: Loop 11O media metadata source-duration hydration

- Added `SourceMediaMetadata`, `sourceAssetId`, and `hydrateWorkspaceSourceDurations` in core.
- Seed workspace clips now derive source duration/type from provider-result and file-probe media metadata.
- Project Bin now renders media source metadata tiles, and Clip Inspector shows source asset, source duration, and metadata provenance for the selected clip.
- Added core hydration tests and production smoke assertions for manual close-up source duration `00:00:08:00`.
- Verified: `pnpm production:check` passed with 96 tests, 5-package typecheck/build, and 36 production Playwright smoke tests.
- Cantos evidence: ADR `0025-loop11o-media-metadata-source-duration-hydration.html`, DDR `0032-loop11o-source-duration-metadata-readout.html`.
- Screenshot evidence: `aethon-loop11o-media-metadata-source-duration-1440.png`, `aethon-loop11o-media-metadata-source-duration-mobile-390.png`.
- Product readiness score moved from 57/100 to 58/100.

## 2026-05-04: Loop 11N timeline ripple trim-start gesture

- Added `rippleTrimClipStart` in core to shorten a clip head while preserving timeline start and closing downstream clips.
- Added core tests for downstream closure and backward trim rejection.
- Added a compact ripple-start handle in the Studio timeline and routed pointer deltas through the reducer/core command path.
- Added desktop/mobile Playwright smoke for ripple trim-start with selected clip, linked keyframe, room tone, downstream video, and linked audio assertions.
- Verified: `pnpm production:check` passed with 95 tests, 5-package typecheck/build, and 36 production Playwright smoke tests.
- Cantos evidence: ADR `0024-loop11n-ripple-trim-start-command-and-gesture.html`, DDR `0031-loop11n-timeline-ripple-start-handle.html`.
- Screenshot evidence: `aethon-loop11n-timeline-ripple-start-handle-1440.png`, `aethon-loop11n-timeline-ripple-start-handle-mobile-390.png`.
- Product readiness score moved from 56/100 to 57/100.

## 2026-05-04: Loop 11M timeline ripple trim gesture

- Added `rippleTrimClipEnd` in core to change clip duration and shift downstream clips by the same delta.
- Added core tests for downstream ripple shift and source-duration rejection.
- Added a compact ripple-end handle in the Studio timeline and routed pointer deltas through the reducer/core command path.
- Added desktop/mobile Playwright smoke for ripple trim-end with selected clip, room tone, downstream video, and linked audio assertions.
- Verified: `pnpm production:check` passed with 93 tests, 5-package typecheck/build, and 34 production Playwright smoke tests.
- Cantos evidence: ADR `0023-loop11m-ripple-trim-command-and-gesture.html`, DDR `0030-loop11m-timeline-ripple-trim-handle.html`.
- Screenshot evidence: `aethon-loop11m-timeline-ripple-handle-1440.png`, `aethon-loop11m-timeline-ripple-handle-mobile-390.png`.
- Product readiness score moved from 55/100 to 56/100.

## 2026-05-04: Loop 11L timeline roll boundary gesture

- Added a compact roll-start boundary handle for timeline clips with an adjacent previous same-track clip.
- Gesture state converts boundary-handle pointer deltas into the existing `rollEditBoundary` reducer/core command path.
- Added desktop/mobile Playwright smoke for roll boundary drag with previous clip, room tone, selected clip, and linked audio assertions.
- Verified: `pnpm production:check` passed with 91 tests, 5-package typecheck/build, and 32 production Playwright smoke tests.
- Cantos evidence: ADR `0022-loop11l-roll-boundary-gesture-command-layer.html`, DDR `0029-loop11l-timeline-roll-boundary-handle.html`.
- Screenshot evidence: `aethon-loop11l-timeline-roll-handle-1440.png`, `aethon-loop11l-timeline-roll-handle-mobile-390.png`.
- Product readiness score moved from 54/100 to 55/100.

## 2026-05-04: Loop 11K timeline trim-in gesture

- Added left-edge trim-in resize handle support in the Studio timeline.
- Gesture state converts start-handle pointer deltas into the existing `trimClipStart` reducer/core command path.
- Added desktop/mobile Playwright smoke for trim-in resize with linked video/audio start, duration, and in-point assertions.
- Verified: `pnpm production:check` passed with 91 tests, 5-package typecheck/build, and 30 production Playwright smoke tests.
- Cantos evidence: ADR `0021-loop11k-trim-in-gesture-command-layer.html`, DDR `0028-loop11k-timeline-trim-in-resize-handle.html`.
- Screenshot evidence: `aethon-loop11k-timeline-trim-in-1440.png`, `aethon-loop11k-timeline-trim-in-mobile-390.png`.
- Product readiness score moved from 53/100 to 54/100.

## 2026-05-04: Loop 11J timeline pointer gestures

- Added pointer drag move and trim-out resize handle support in the Studio timeline.
- Gesture state converts pointer deltas into existing reducer/core command actions instead of mutating UI-only geometry.
- Added desktop/mobile Playwright smoke for drag move and resize with linked audio assertions.
- Fixed mobile timeline action/header overflow with constrained grid columns.
- Verified: `pnpm production:check` passed with 91 tests, 5-package typecheck/build, and 28 production Playwright smoke tests.
- Cantos evidence: ADR `0020-loop11j-timeline-pointer-gestures-command-layer.html`, DDR `0027-loop11j-timeline-drag-resize-controls.html`.
- Screenshot evidence: `aethon-loop11j-timeline-drag-resize-1440.png`, `aethon-loop11j-timeline-drag-resize-mobile-390.png`.
- Product readiness score moved from 52/100 to 53/100.

## 2026-05-04: Loop 11I source/program monitor trim workflow

- Added `sourceDurationSeconds` bounds to core edit clips and guarded trim-out, rolling edit, and slip edit from exceeding source media duration.
- Wired Source Monitor `Source Slip +0.5s` and Program Monitor `Program Roll +0.5s` to the shared reducer command model.
- Fixed mobile monitor overflow after Playwright caught program frame hit targets intercepting inspector tabs.
- Verified: `pnpm production:check` passed with 91 tests, 5-package typecheck/build, and 26 production Playwright smoke tests.
- Cantos evidence: ADR `0019-loop11i-source-duration-source-program-trim.html`, DDR `0026-loop11i-source-program-monitor-trim-controls.html`.
- Screenshot evidence: `aethon-loop11i-source-program-trim-1440.png`, `aethon-loop11i-source-program-trim-mobile-390.png`.
- Product readiness score moved from 51/100 to 52/100.

## 2026-05-04: Loop 11H rolling/slip/zoom workflow

- Added core commands for adjacent rolling edit, slip in-point edit, and clamped timeline zoom.
- Wired Studio controls and shortcuts for Roll +0.5s, Slip +0.5s, Zoom -/+, Shift+ArrowRight, Alt+ArrowRight, S, and +/-.
- Fixed timeline header wrapping after Playwright caught ruler pointer interception, and added a zoom-scaled clip lane inner layer.
- Verified: `pnpm production:check` passed with 88 tests, 5-package typecheck/build, and 24 production Playwright smoke tests.
- Cantos evidence: ADR `0018-loop11h-rolling-slip-zoom-command-model.html`, DDR `0025-loop11h-rolling-slip-zoom-controls.html`.
- Screenshot evidence: `aethon-loop11h-rolling-slip-zoom-1440.png`, `aethon-loop11h-rolling-slip-zoom-mobile-390.png`.
- Product readiness score moved from 50/100 to 51/100.

## 2026-05-04: Loop 11G NLE trim/snap/move workflow

- Added core timeline commands for trim in/out, move, snap-to-previous-boundary, linked aligned audio propagation, snap thresholds, locked-track checks, and same-track overlap rejection.
- Wired Studio timeline actions and keyboard shortcuts to the shared command model: Snap, Trim In, Trim Out, Move +1s, V/B/T, bracket trim, and Ctrl/Cmd+Arrow move.
- Added E2E state assertions for clip start, duration, in-point, and linked audio sync across desktop and mobile smoke.
- Verified: `pnpm production:check` passed with 84 tests, 5-package typecheck/build, and 22 production Playwright smoke tests.
- Cantos evidence: ADR `0017-loop11g-timeline-trim-snap-move-command-model.html`, DDR `0024-loop11g-timeline-command-controls-and-shortcuts.html`.
- Screenshot evidence: `aethon-loop11g-timeline-trim-move-1440.png`, `aethon-loop11g-timeline-trim-move-mobile-390.png`.
- Product readiness score moved from 48/100 to 50/100.

## 2026-05-04: Codex-native agent contracts promoted

- All 23 AETHON role contracts now exist under root `agents/*.md`.
- `agents/CODEX_RUNTIME.md` defines Codex execution modes, all-agent wave order, prompt template, and OOM prevention rules.
- `.claude/agents/*.md` remains a Claude compatibility path during hook/discovery migration.
- CapCut MCP was removed from `C:\Users\jusan\.codex\config.toml` because it is not required for the AETHON production goal and adds unnecessary MCP discovery surface.

## 2026-05-04: Loop 11D provider-sim persistence and readback

- Provider-sim evidence now preserves output asset ids, generation run ids, model run ids, rights summaries, validation artifacts, and C2PA status placeholders through core contracts.
- `SupabaseAiControlRepository` can save generated assets and read back a full generation-run evidence bundle.
- DB schema/migration/live catalog checks now enforce project-scoped evidence links for validation, cost, and rights rows.
- Verified: `pnpm production:check` passed with 76 tests, 5-package typecheck/build, and 20 production Playwright smoke tests.
- Product readiness score moved from 42/100 to 46/100.

## 2026-05-04: Loop 11E provider-sim repository completion boundary

- `SupabaseAiControlRepository` now wraps `claim_generation_run` and provides `completeProviderSimulatedRun`.
- Completion uses `lease_owner`, `claim_token`, and `lease_expires_at` guards before terminal run update.
- Generated output asset and deterministic event/validation/cost/rights/export rows are saved through duplicate-safe inserts for retry recovery.
- Verified: `pnpm production:check` passed with 76 tests, 5-package typecheck/build, and 20 production Playwright smoke tests.
- Product readiness score remains 46/100 until this path is proven in a live/staging DB transaction or SQL RPC.

## 2026-05-04: Loop 11F provider-sim SQL completion transaction

- Added `complete_provider_simulated_run` as a `security invoker` SQL RPC for provider-sim terminal completion.
- The RPC validates active worker lease ownership and claim token before writing terminal run state, generated output asset, run events, validation, cost, rights, and export manifest evidence.
- `SupabaseAiControlRepository.completeProviderSimulatedRun` now calls the RPC once and reads back the evidence bundle by run id.
- Verified: `pnpm production:check` passed with 78 tests, 5-package typecheck/build, and 20 production Playwright smoke tests.
- Cantos ADR: `C:\Users\jusan\Desktop\cantos\projects\aethon\adr\0016-loop11f-provider-sim-sql-completion-transaction.html`.
- Product readiness score moved from 46/100 to 48/100; live/local Supabase execution remains pending.

## 2026-05-04: Next session bootstrap updated after Loop 11F

- `NEXT_SESSION_PROMPT.md` now points to Loop 11G: live Supabase runtime evidence first, with NLE trim/snap/move as the fallback if Supabase tooling remains unavailable.
- `session-handoff.md` now records Loop 11F as complete, score 48/100, and the next target selection rule.

## 2026-05-04: Next session bootstrap for Loop 11F

- Added `NEXT_SESSION_PROMPT.md` as the copy-paste prompt for the next Codex session.
- Added `docs/business-plan/loop11f-next-session-ultradetail-plan.md` with the Loop 11F execution plan, agent routing, MCP policy, tests, scoring rules, and documentation checklist.
- `session-handoff.md` now points the next session to both files before implementation.

## 2026-05-04: Loop 11C AI planner, export QC, and DB drift hardening

- Added `@aethon/ai` with deterministic scene planning, seven-element prompt-pair composition, prompt linting, and Claude adviser cache-boundary request construction.
- Export readiness now blocks generated scenes whose validation reports still need review, not only blocking QC failures or missing reports.
- `schema.sql` and `migrations/0001_initial_ai_control.sql` are now protected by a static drift guard in the DB security test suite.
- All 23 role reports were collected through lightweight Codex waves without full-context fork.
- Verified: `pnpm production:check` passed with 70 tests, 5-package typecheck/build, and 20 production Playwright smoke tests.
- Product readiness score moved from 40/100 to 42/100.

## 2026-05-04: Loop 11A/11B editor evidence

- Loop 11A fixed the disabled Export visual affordance and added Playwright style assertions.
- Loop 11B added deterministic split, split-at-playhead, ripple delete, undo, and redo primitives in `packages/core/src/video-editing.ts`, then wired Split/Ripple Delete/Undo/Redo controls into the Studio UI.
- Evidence captured in Cantos ADR/DDR 0013, 0014, 0020, 0021, and 0022, with screenshots under `docs/business-plan/assets/`.
- Verified after Loop 11B: `pnpm production:check` passed with 60 tests and 20 production Playwright smoke tests.

## 2026-05-04: Loop 10B provider catalog and queue contract hardening

- Provider catalog matching changed from loose provider/model text matching to exact `providerKey + modelKey`.
- `GenerationRun` now stores provider capability snapshot fields: capability id, provider key, model key, pricing version, terms URL, and verified-at timestamp.
- Supabase schema and migration now require project-scoped provider capability records before generation runs can be queued.
- Server Actions now upsert the exact server catalog capability before persisted queue inserts/RPC calls, so an empty project DB does not fail the new FK/guard path.
- Queue RPC now blocks non-accepted decisions, non-queued status, AI Off mode, nonzero initial retry count, pre-started runs, stale/deprecated/disabled provider capabilities, expired verification, and non-commercial capabilities.
- Evidence captured:
  - `docs/business-plan/assets/loop-10b-provider-catalog-prod.png`
  - `docs/business-plan/assets/loop-10b-provider-catalog-mobile-prod.png`
- Verified: `pnpm production:check` passed with 46 tests, 4-package typecheck/build, and 18 production Playwright smoke tests.

## 2026-05-03: Loop 10A trust boundary and production smoke upgrade

- Server Actions now parse unknown input at runtime and re-read persisted suggestion/preferences before approval queueing.
- Export readiness now blocks generated-video scenes with missing validation reports.
- Root `production:check` and CI use `@aethon/web smoke:prod` against `next start`.
- Playwright console/pageerror fixture is shared across all e2e tests.
- Verified: `pnpm production:check` passed with 40 tests, 4-package typecheck/build, 18 production smoke.

## 2026-05-03: common agent contract promoted to root `agents/`

- `agents/AGENT_CONTRACT.md` is the Claude/Codex/OMX common SSoT.
- `.claude/agents/AGENT_CONTRACT.md` is a Claude compatibility shim.
- `agents/README.md` documents role migration policy, shim strategy, and harness-axis ownership.
- `.claude/rules/agent-matrix.md`, `CLAUDE.md`, `README.md`, and related skills now prefer root `agents/`.

## 2026-05-03: adviser-first docs and monorepo scaffold

- README/PRD/VISION/ROADMAP aligned to `AI advises. You choose. The timeline remembers.`
- Monorepo scaffold created for `apps/web`, `packages/core`, `packages/ui`, `packages/db`.
- AI Control Center, approval gates, cost/rights/readiness contracts, browser smoke, and DB/RLS harnesses added across prior loops.

## 2026-04-20: 23-agent organization baseline

- Product: `product-lead`
- Frontend: `fe-lead`, `fe-canvas`, `fe-interactions`, `fe-design`
- Backend/AI/Data/QA: `be-orchestrator`, `ai-prompt-engineer`, `ai-consistency`, `ai-video-router`, `data-lead`, `desktop-qa-lead`, `devops-ci`, `observability-lead`
- Evaluators: `fact-checker`, `insight-curator`, `ai-output-validator`, `prompt-linter`, `coherence-reviewer`, `cost-monitor`, `security-auditor`, `ce-reviewer`
- Specialty: `legal-compliance`, `storyboard-director`
