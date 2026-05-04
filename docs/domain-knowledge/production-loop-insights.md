# Production Loop Insights

## 2026-05-05: Loop 11W adds deterministic render artifact proof and local provenance attachment

- **발견**: Loop 11T의 manifest evidence와 Loop 11V의 local Supabase runtime evidence 이후에도 Export inspector는 실제 render artifact id/URI/checksum과 C2PA attachment evidence를 직접 보여주지 못했다. 단순 `c2paStatus`만으로는 최종 export provenance가 검증 가능하다고 말할 수 없다.
- **결정**: Loop 11W는 production signer를 가장하지 않고, deterministic local render artifact proof를 먼저 export contract에 추가했다. `ExportManifest`는 `renderArtifact`와 `c2paAttachment`를 가질 수 있고, readiness는 ready preview에 render artifact가 없거나 attached C2PA가 verified attachment evidence 없이 선언되면 blocker로 처리한다.
- **구현**: `createRenderArtifactProof`와 `createLocalC2paAttachment`를 core에 추가하고 provider-sim success path, seed manifest, DB first-class export columns, repository readback mapping, Studio Export inspector, production smoke를 연결했다. DB는 `render_artifact`, `c2pa_attachment`, checksum/source/C2PA hash columns와 ready/attached constraints를 갖는다.
- **검증**: `pnpm --filter @aethon/core test`, `pnpm --filter @aethon/db test`, `pnpm --filter @aethon/web typecheck`, `pnpm --filter @aethon/web build`, `$env:AETHON_E2E_PORT='3031'; pnpm --filter @aethon/web smoke:prod`, `$env:AETHON_E2E_PORT='3031'; pnpm production:check` 통과. Full gate는 103 unit/source/security tests, 5-package typecheck/build, 38 production Playwright smoke를 통과했다. Local Supabase reset 후 `pnpm supabase:verify`도 render/C2PA 컬럼과 provider-sim runtime evidence까지 통과했다. Desktop/mobile screenshots는 render artifact id, checksum, artifact URI, generated-content label, C2PA attachment status, C2PA verification/policy/signature/signer/hash rows를 확인한다.
- **Cantos**: ADR `C:\Users\jusan\Desktop\cantos\projects\aethon\adr\0033-loop11w-deterministic-render-artifact-local-provenance.html`, DDR `C:\Users\jusan\Desktop\cantos\projects\aethon\ddr\0040-loop11w-export-render-artifact-evidence.html`, DDR `C:\Users\jusan\Desktop\cantos\projects\aethon\ddr\0041-loop11w-c2pa-verification-readout-evidence.html`에 local attestation 결정과 C2PA verification readout 증거를 기록했다.
- **점수 갱신**: Export/QC/rights/provenance를 8->9로 올리고 product readiness를 67/100에서 68/100으로 갱신했다.
- **다음**: 100% exit에는 production C2PA signer, 실제 render output file, stored media verification, durable media storage/real thumbnail extraction, 승인된 staging Supabase evidence가 남아 있다.

## 2026-05-05: Loop 11V proves local Supabase RLS and provider-sim runtime behavior

- **발견**: 이번 세션에서 Supabase CLI를 root dev dependency로 설치하고 Docker Desktop Linux daemon을 실행해 local Supabase runtime path를 열었다. Live catalog check가 기존 schema의 broad role grant drift를 잡았고, 이를 explicit revoke + least grant로 수정했다.
- **결정**: Loop 11V는 UI fallback이 아니라 Supabase runtime evidence path로 진행했다. `supabase/config.toml`과 CLI migration을 추가하고, `pnpm supabase:verify`를 root gate로 만들어 RLS catalog와 provider-sim runtime SQL을 함께 실행한다.
- **구현**: `packages/db/verification/provider-sim-runtime-check.sql`은 authenticated role/JWT claim을 설정해 adviser decision queue, generation run claim, successful completion, same-token retry idempotency, different-worker active lease rejection, stale lease rejection, failed completion no-export, owner RLS isolation, fixture cleanup을 검증한다.
- **검증**: `pnpm supabase:verify`, `pnpm --filter @aethon/db test`, `pnpm --filter @aethon/db typecheck`, `$env:AETHON_E2E_PORT='3031'; pnpm production:check` 통과. Full gate는 100 unit/source/security tests, 5-package typecheck/build, 38 production Playwright smoke를 통과했다.
- **Cantos**: ADR `C:\Users\jusan\Desktop\cantos\projects\aethon\adr\0032-loop11v-local-supabase-runtime-verification.html`와 DDR `C:\Users\jusan\Desktop\cantos\projects\aethon\ddr\0039-loop11v-supabase-runtime-evidence.html`에 결정/evidence를 남겼다.
- **점수 갱신**: Provider catalog/queue/execution safety를 8->9, Data/auth/security/compliance를 5->7로 올리고 product readiness를 64/100에서 67/100으로 갱신했다.
- **다음**: 승인된 staging Supabase target이 생기기 전까지 production write는 하지 않는다. 다음 P0 제품 slice는 live/generated-content C2PA + reproducible render artifact proof 또는 durable media storage/real thumbnail extraction 중 가장 작은 항목이다.

## 2026-05-04: Loop 11U adds browser-local media search and tags

- **발견**: Supabase CLI가 없고 Docker Desktop Linux daemon도 실행 중이 아니어서 live/local DB runtime proof는 계속 안전하게 진행할 수 없었다. Loop 11S import는 Project Bin에 media를 넣을 수 있었지만, 많아진 source를 검색하거나 reference tag로 좁히는 흐름은 없었다.
- **결정**: Loop 11U는 검증 가능한 fallback으로 browser-local media search/tag slice를 구현했다. `SourceMediaMetadata`에 `tags`와 `thumbnailLabel`을 추가하고, Studio Project Bin은 search input, tag filter, result count, deterministic thumbnail label을 표시한다.
- **구현**: Seed media에는 generated/uploaded/audio/reference tags와 thumbnail labels를 부여했다. Imported media는 filename/type에서 `imported`, `video/audio/image`, `noir`, `reference`, `take` 같은 deterministic tags를 추론하고 localStorage restore 시 tags/thumbnail label을 보존한다.
- **검증**: `pnpm --filter @aethon/core test`, `pnpm --filter @aethon/web test`, `pnpm --filter @aethon/web typecheck`, `pnpm --filter @aethon/web build`, `$env:AETHON_E2E_PORT='3031'; pnpm --filter @aethon/web smoke:prod`, `$env:AETHON_E2E_PORT='3031'; pnpm production:check` 통과. Full gate는 99 unit/source/security tests, 5-package typecheck/build, 38 production Playwright smoke를 통과했다.
- **스크린샷**: `docs/business-plan/assets/aethon-loop11u-media-search-tags-1440.png`, `docs/business-plan/assets/aethon-loop11u-media-search-tags-mobile-390.png`에서 import 후 `noir` search + `imported` tag filter + `1 of 6 sources` + thumbnail label을 확인했다.
- **점수 갱신**: Media ingest/assets/search 축을 3->4로 올리고 product readiness를 63/100에서 64/100으로 갱신했다.
- **다음**: Supabase local/staging target이 확인되면 provider-sim SQL RPC runtime evidence로 돌아간다. 계속 불가하면 live/generated-content C2PA/render artifact proof 또는 durable media storage/real thumbnail extraction 중 가장 작은 slice를 진행한다.

## 2026-05-04: Loop 11T expands export manifest evidence

- **발견**: Supabase CLI가 없고 Docker Desktop Linux daemon도 실행 중이 아니어서 live/local DB runtime proof는 계속 안전하게 진행할 수 없었다. Export Gate는 blockers와 audit은 보여줬지만 asset/model-run/validation/cost/rights evidence id와 generated-content label을 직접 노출하지 않았다.
- **결정**: Loop 11T는 P0 fallback으로 export manifest evidence expansion을 구현했다. `ExportManifest`에 validation/cost/rights evidence ids, generated-content label, provenance summary를 추가하고, `evaluateExportReadiness`가 누락 evidence를 blocker/warning으로 판정하게 했다.
- **구현**: Provider-sim 성공 manifest는 asset id, model run id, validation report id, cost ledger id, rights manifest id, generated label, C2PA status를 채운다. DB repository는 기존 `rights_summary` JSON 경계에 확장 provenance를 저장해 live migration 없이 readback shape를 보존한다. Studio Export inspector는 `Manifest evidence` 블록으로 ids와 C2PA status를 표시한다.
- **검증**: `pnpm --filter @aethon/core test`, `pnpm --filter @aethon/db test`, `pnpm --filter @aethon/db typecheck`, `pnpm --filter @aethon/web test`, `pnpm --filter @aethon/web typecheck`, `pnpm --filter @aethon/web build`, `$env:AETHON_E2E_PORT='3031'; pnpm --filter @aethon/web smoke:prod`, `$env:AETHON_E2E_PORT='3031'; pnpm production:check` 통과. Full gate는 99 unit/source/security tests, 5-package typecheck/build, 38 production Playwright smoke를 통과했다.
- **Cantos**: ADR `C:\Users\jusan\Desktop\cantos\projects\aethon\adr\0030-loop11t-export-manifest-evidence-contract.html`와 DDR `C:\Users\jusan\Desktop\cantos\projects\aethon\ddr\0037-loop11t-export-manifest-evidence-inspector.html`에 결정/evidence를 남겼다.
- **스크린샷**: `docs/business-plan/assets/aethon-loop11t-export-manifest-evidence-1440.png`, `docs/business-plan/assets/aethon-loop11t-export-manifest-evidence-mobile-390.png`에서 manifest evidence id와 generated label을 확인했다.
- **점수 갱신**: Export/QC/rights/provenance 축을 7->8로 올리고 product readiness를 62/100에서 63/100으로 갱신했다.
- **다음**: Supabase local/staging target이 확인되면 provider-sim SQL RPC runtime evidence로 돌아간다. 계속 불가하면 media thumbnail/tag/search refinement 또는 real C2PA/render artifact proof 중 가장 작은 slice를 진행한다.

## 2026-05-04: Loop 11S adds browser-local media import persistence

- **발견**: Supabase CLI가 없고 Docker Desktop Linux daemon도 실행 중이 아니어서 live/local DB runtime proof는 계속 안전하게 진행할 수 없었다. Loop 11O 이후 Project Bin은 seeded media metadata만 보여줬고, 실제 editor import/reload 흐름은 없었다.
- **결정**: Loop 11S는 P0 fallback으로 browser-local media/reference import를 구현했다. 파일 binary를 저장하거나 cloud upload라고 주장하지 않고, `SourceMediaMetadata` shape의 metadata-only import를 versioned localStorage에 유지한다.
- **구현**: Studio Project Bin에 `Import Media` file input, browser-local import count, imported tile selection, active asset affordance를 추가했다. Imported source는 filename+size deterministic id를 쓰고 video/audio/image를 `uploaded-video`, `uploaded-audio`, `uploaded-image`로 분류한다. Source Monitor는 selected imported source의 type, duration, metadata provenance를 표시한다.
- **검증**: `pnpm --filter @aethon/core test`, `pnpm --filter @aethon/web test`, `pnpm --filter @aethon/web typecheck`, `pnpm --filter @aethon/web build`, `$env:AETHON_E2E_PORT='3031'; pnpm --filter @aethon/web smoke:prod` 통과. Smoke는 desktop/mobile에서 import, active tile, Source Monitor readout, reload persistence를 검증한다.
- **Cantos**: ADR `C:\Users\jusan\Desktop\cantos\projects\aethon\adr\0029-loop11s-browser-local-media-import-persistence-contract.html`와 DDR `C:\Users\jusan\Desktop\cantos\projects\aethon\ddr\0036-loop11s-media-import-project-bin-evidence.html`에 결정/evidence를 남겼다.
- **스크린샷**: `docs/business-plan/assets/aethon-loop11s-media-import-persistence-1440.png`, `docs/business-plan/assets/aethon-loop11s-media-import-persistence-mobile-390.png`에서 imported `noir reference take` tile과 Source Monitor metadata readout을 확인했다.
- **점수 갱신**: Media ingest/assets/search 축을 2->3으로 올리고 product readiness를 61/100에서 62/100으로 갱신했다.
- **다음**: Supabase local/staging target이 확인되면 provider-sim SQL RPC runtime evidence로 돌아간다. 이 항목의 fallback이었던 export manifest evidence expansion은 Loop 11T에서, media search/tags는 Loop 11U에서 완료됐다.

## 2026-05-04: Loop 11R adds timeline scrollbar and minimap navigation

- **발견**: Supabase CLI가 없고 Docker Desktop Linux daemon도 실행 중이 아니어서 live/local DB runtime proof는 계속 안전하게 진행할 수 없었다. Loop 11Q 이후 dense timeline navigation에는 reload persistence가 있었지만 직접 조작 가능한 scrollbar/minimap affordance가 없었다.
- **결정**: Loop 11R은 P0 fallback으로 timeline navigator를 구현했다. 새 scrollbar와 minimap window는 별도 UI state를 만들지 않고 기존 `scrollSeconds`, `setTimelineScroll`, `getTimelineVisibleRange` 계약을 그대로 사용한다.
- **구현**: Studio timeline은 ruler와 track stack 사이에 `timeline-navigator`를 렌더링한다. Minimap은 full sequence clip coverage와 visible window를 표시하고, range scrollbar는 `set-timeline-scroll` reducer action으로만 core scroll state를 갱신한다. Production smoke가 잡은 `step=0.1` 양자화 문제는 `step=0.01`로 수정했다.
- **검증**: `pnpm --filter @aethon/core test`, `pnpm --filter @aethon/web test`, `pnpm --filter @aethon/web typecheck`, `pnpm --filter @aethon/web build`, `$env:AETHON_E2E_PORT='3031'; pnpm --filter @aethon/web smoke:prod`, `$env:AETHON_E2E_PORT='3031'; pnpm production:check` 통과. Full gate는 97 unit/source/security tests, 5-package typecheck/build, 36 production Playwright smoke를 통과했다.
- **Cantos**: ADR `C:\Users\jusan\Desktop\cantos\projects\aethon\adr\0028-loop11r-timeline-navigator-scrollbar-minimap-contract.html`와 DDR `C:\Users\jusan\Desktop\cantos\projects\aethon\ddr\0035-loop11r-timeline-navigator-scrollbar-minimap-evidence.html`에 결정/evidence를 남겼다.
- **스크린샷**: `docs/business-plan/assets/aethon-loop11r-timeline-navigator-1440.png`, `docs/business-plan/assets/aethon-loop11r-timeline-navigator-mobile-390.png`에서 `Zoom 125%`, scrolled `Window 00:00:02:22 - 00:00:14:14`, scrollbar, minimap window를 확인했다.
- **점수 갱신**: Professional NLE editing baseline을 17->18로 올리고 product readiness를 60/100에서 61/100으로 갱신했다.
- **다음**: Supabase local/staging target이 확인되면 provider-sim SQL RPC runtime evidence로 돌아간다. 계속 불가하면 media/reference import and project bin persistence 또는 export manifest evidence expansion 중 가장 작은 P0 slice를 진행한다.

## 2026-05-04: Loop 11Q persists timeline viewport after reload

- **발견**: Loop 11P로 zoom/scroll readout은 생겼지만 reload 후 `Zoom 100%`와 시작 window로 돌아가 dense editing context가 끊겼다. Supabase CLI와 Docker Desktop Linux daemon blocker는 계속 유지되어 DB runtime evidence는 진행할 수 없었다.
- **결정**: Loop 11Q는 P0 fallback으로 timeline viewport persistence를 구현했다. 전체 workspace나 edit history를 저장하지 않고 `zoom`과 `scrollSeconds`만 versioned localStorage snapshot으로 저장한다.
- **구현**: Studio는 mount 시 snapshot을 읽고 `restore-timeline-viewport` reducer action을 통해 `setTimelineZoom` 다음 `setTimelineScroll`로 복원한다. 저장값이 오래되거나 범위를 벗어나도 core clamp가 visible range를 정리한다.
- **검증**: `pnpm --filter @aethon/web typecheck`, `pnpm --filter @aethon/web build`, targeted desktop/mobile production smoke 통과. Smoke는 `Zoom 125%`, `Window 00:00:02:22 - 00:00:14:14` 상태에서 reload 후 같은 readout이 유지되는지 검증한다.
- **Cantos**: ADR `C:\Users\jusan\Desktop\cantos\projects\aethon\adr\0027-loop11q-timeline-viewport-persistence-contract.html`와 DDR `C:\Users\jusan\Desktop\cantos\projects\aethon\ddr\0034-loop11q-timeline-viewport-reload-persistence.html`에 결정 기록을 남겼다.
- **점수 갱신**: Professional NLE editing baseline을 16->17로 올리고 product readiness를 59/100에서 60/100으로 갱신했다.
- **다음**: Supabase local/staging target이 확인되면 provider-sim SQL RPC runtime evidence로 돌아간다. 계속 불가하면 timeline scrollbar/minimap, media import persistence, or export manifest evidence 중 가장 작은 P0 slice를 진행한다.

## 2026-05-04: Loop 11P adds deterministic timeline viewport scroll

- **발견**: Supabase CLI 부재와 Docker Desktop Linux daemon 미실행으로 live/local DB runtime evidence를 안전하게 만들 수 없었다. 기존 3020 Next dev server도 권한 문제로 종료되지 않아 production smoke는 3031 포트로 우회해야 했다.
- **결정**: Loop 11P는 planned fallback인 professional NLE timeline zoom/scroll slice로 진행했다. Timeline scroll을 UI-only overflow로 두지 않고 `scrollSeconds`, `setTimelineScroll`, `getTimelineVisibleRange`를 core workspace contract로 승격했다.
- **구현**: Studio timeline의 ruler, clip projection, playhead, pointer gesture math, scroll buttons, and `Window` readout이 같은 visible range를 사용한다. Mobile selection readout은 2-column grid로 조정해 Selected/Scene/Zoom/Window 값이 겹치지 않게 했다.
- **검증**: `pnpm --filter @aethon/core test`, `pnpm --filter @aethon/web typecheck`, `pnpm --filter @aethon/web build`, targeted production smoke, `$env:AETHON_E2E_PORT='3031'; pnpm production:check` 통과. Full gate는 97 unit/source/security tests, 5-package typecheck/build, 36 production Playwright smoke를 통과했다.
- **Cantos**: ADR `C:\Users\jusan\Desktop\cantos\projects\aethon\adr\0026-loop11p-timeline-viewport-scroll-contract.html`와 DDR `C:\Users\jusan\Desktop\cantos\projects\aethon\ddr\0033-loop11p-timeline-zoom-scroll-readout.html`에 결정 기록을 남겼다.
- **스크린샷**: `docs/business-plan/assets/aethon-loop11p-timeline-zoom-scroll-window-1440.png`, `docs/business-plan/assets/aethon-loop11p-timeline-zoom-scroll-window-mobile-390.png`에서 `Zoom 125%`와 `Window 00:00:02:22 - 00:00:14:14`를 확인했다.
- **점수 갱신**: Professional NLE editing baseline을 15->16으로 올리고 product readiness를 58/100에서 59/100으로 갱신했다.
- **다음**: 이 항목의 next fallback이었던 viewport persistence는 Loop 11Q에서 완료됐다. 이후에는 Supabase runtime evidence 또는 timeline scrollbar/minimap, media import persistence, export manifest evidence 중 가장 작은 P0 slice로 이어간다.

## 2026-05-04: Loop 11O hydrates source durations from media metadata

- **발견**: Supabase CLI가 없고 Docker Desktop Linux daemon도 실행 중이 아니어서 live/local DB runtime proof는 계속 안전하게 진행할 수 없었다. 기존 3020 Next dev server도 응답하지 않고 종료 권한이 없어 dev smoke 재사용이 막혔다.
- **결정**: Loop 11O는 planned fallback 중 media metadata-backed source-duration hydration을 진행했다. Source duration을 clip literal로만 두면 real import/provider result로 넘어갈 때 trim/slip/roll guard의 근거가 불명확해진다.
- **구현**: `SourceMediaMetadata`, `sourceAssetId`, `hydrateWorkspaceSourceDurations`를 core에 추가했고, seed workspace는 provider-result/file-probe metadata에서 `sourceDurationSeconds`와 `sourceType`을 주입받는다. Studio Project Bin은 media source tile을 렌더링하고, Clip Inspector는 source asset, source duration, metadata provenance를 표시한다.
- **검증**: `pnpm --filter @aethon/core test`, `pnpm --filter @aethon/web typecheck`, targeted production smoke, `$env:AETHON_E2E_PORT='3031'; pnpm production:check` 통과. Full gate는 96 unit/source/security tests, 5-package typecheck/build, 36 production Playwright smoke를 통과했다.
- **Cantos**: ADR `C:\Users\jusan\Desktop\cantos\projects\aethon\adr\0025-loop11o-media-metadata-source-duration-hydration.html`와 DDR `C:\Users\jusan\Desktop\cantos\projects\aethon\ddr\0032-loop11o-source-duration-metadata-readout.html`에 결정 기록을 남겼다.
- **스크린샷**: `docs/business-plan/assets/aethon-loop11o-media-metadata-source-duration-1440.png`, `docs/business-plan/assets/aethon-loop11o-media-metadata-source-duration-mobile-390.png`에서 manual close-up source duration `00:00:08:00`과 `file-probe` provenance를 확인했다.
- **점수 갱신**: Media ingest/assets/search 축을 1->2로 올리고 product readiness를 57/100에서 58/100으로 갱신했다.
- **다음**: 이 항목의 fallback이었던 richer zoom/scroll slice는 Loop 11P에서 완료됐다. 이후에는 Supabase runtime evidence 또는 다음 P0 fallback slice로 이어간다.

## 2026-05-04: Loop 11N adds ripple trim-start gestures

- **발견**: Supabase CLI와 Docker Desktop Linux daemon blocker가 유지되어 live/local DB runtime proof는 계속 안전하게 실행할 수 없었다.
- **결정**: Loop 11N은 remaining NLE direct manipulation debt 중 ripple trim-start를 core command부터 구현했다. Start-side ripple은 linked start/end propagation과 downstream closure가 필요하므로 UI-only geometry로 처리하지 않는다.
- **구현**: `rippleTrimClipStart`는 selected clip의 timeline start를 유지한 채 duration을 줄이고 in-point를 앞으로 밀며, start-aligned linked clips는 in-point+duration을 같이 조정하고 end-aligned linked clips는 duration을 줄인다. Downstream clips는 같은 delta만큼 앞으로 이동한다. Studio는 `timeline-clip-*-ripple-start` handle로 pointer delta를 reducer action에 전달한다.
- **검증**: `pnpm --filter @aethon/core test`, `pnpm --filter @aethon/web typecheck`, `pnpm --filter @aethon/web smoke`, `pnpm production:check` 통과. Full gate는 core 52, ai 8, db 29, web 6 tests와 production Playwright smoke 36개를 통과했다.
- **Cantos**: ADR `C:\Users\jusan\Desktop\cantos\projects\aethon\adr\0024-loop11n-ripple-trim-start-command-and-gesture.html`와 DDR `C:\Users\jusan\Desktop\cantos\projects\aethon\ddr\0031-loop11n-timeline-ripple-start-handle.html`에 결정 기록을 남겼다.
- **스크린샷**: `docs/business-plan/assets/aethon-loop11n-timeline-ripple-start-handle-1440.png`, `docs/business-plan/assets/aethon-loop11n-timeline-ripple-start-handle-mobile-390.png`를 저장했다.
- **점수 갱신**: Professional NLE editing baseline을 14->15로 올리고 product readiness를 56/100에서 57/100으로 갱신했다.
- **다음**: Supabase local/staging target이 확인되면 provider-sim SQL RPC runtime evidence로 돌아간다. 계속 불가하면 real media metadata-backed source-duration hydration 또는 zoom/scroll slice 중 가장 작은 항목을 진행한다.

## 2026-05-04: Loop 11M adds ripple trim-end gestures

- **발견**: Supabase CLI와 Docker Desktop daemon blocker가 유지되어 live/local DB runtime proof는 여전히 안전하게 실행할 수 없었다.
- **결정**: Loop 11M은 remaining NLE direct manipulation debt 중 ripple trim-end를 core command부터 구현했다. Ripple은 downstream clip shift가 포함되므로 UI-only geometry가 아니라 `rippleTrimClipEnd` core primitive가 책임져야 한다.
- **구현**: `rippleTrimClipEnd`는 clip end 변경 delta만큼 affected linked clip duration을 바꾸고, downstream clips를 같은 delta로 이동한다. Source duration 초과와 timeline before-zero 이동은 core에서 차단한다. Studio는 `timeline-clip-*-ripple-end` handle로 pointer delta를 reducer action에 전달한다.
- **검증**: `pnpm --filter @aethon/core test`, `pnpm --filter @aethon/web typecheck`, `pnpm --filter @aethon/web smoke`, `pnpm production:check` 통과. Full gate는 core 50, ai 8, db 29, web 6 tests와 production Playwright smoke 34개를 통과했다.
- **Cantos**: ADR `C:\Users\jusan\Desktop\cantos\projects\aethon\adr\0023-loop11m-ripple-trim-command-and-gesture.html`와 DDR `C:\Users\jusan\Desktop\cantos\projects\aethon\ddr\0030-loop11m-timeline-ripple-trim-handle.html`에 결정 기록을 남겼다.
- **스크린샷**: `docs/business-plan/assets/aethon-loop11m-timeline-ripple-handle-1440.png`, `docs/business-plan/assets/aethon-loop11m-timeline-ripple-handle-mobile-390.png`를 저장했다.
- **점수 갱신**: Professional NLE editing baseline을 13->14로 올리고 product readiness를 55/100에서 56/100으로 갱신했다.
- **다음**: Supabase local/staging target이 확인되면 provider-sim SQL RPC runtime evidence로 돌아간다. 계속 불가하면 ripple trim-start, real media metadata-backed source-duration hydration, 또는 zoom/scroll slice 중 가장 작은 항목을 진행한다.

## 2026-05-04: Loop 11L adds roll boundary pointer gestures

- **발견**: Supabase CLI는 계속 없고 Docker Desktop Linux daemon도 실행 중이 아니어서 `rls-catalog-check.sql`과 provider-sim SQL RPC runtime proof를 안전하게 실행할 수 없었다.
- **결정**: Loop 11L은 planned fallback으로 roll boundary direct manipulation을 진행했다. Roll handle은 UI-local geometry가 아니라 `roll-clip-start-boundary-to-time` reducer action을 거쳐 core `rollEditBoundary` command를 호출한다.
- **구현**: 이전 same-track clip이 있는 timeline clip에 compact `timeline-clip-*-roll-start` handle을 노출했다. Pointer delta는 현재 lane scale 기준 seconds로 변환되고 0.1초 단위로 반올림되어 adjacent boundary time으로 전달된다.
- **검증**: `pnpm --filter @aethon/web typecheck`, `pnpm --filter @aethon/web smoke`, `pnpm production:check` 통과. Full gate는 core 48, ai 8, db 29, web 6 tests와 production Playwright smoke 32개를 통과했다.
- **Cantos**: ADR `C:\Users\jusan\Desktop\cantos\projects\aethon\adr\0022-loop11l-roll-boundary-gesture-command-layer.html`와 DDR `C:\Users\jusan\Desktop\cantos\projects\aethon\ddr\0029-loop11l-timeline-roll-boundary-handle.html`에 결정 기록을 남겼다.
- **스크린샷**: `docs/business-plan/assets/aethon-loop11l-timeline-roll-handle-1440.png`, `docs/business-plan/assets/aethon-loop11l-timeline-roll-handle-mobile-390.png`를 저장했다.
- **점수 갱신**: Professional NLE editing baseline을 12->13으로 올리고 product readiness를 54/100에서 55/100으로 갱신했다.
- **다음**: Supabase local/staging target이 확인되면 provider-sim SQL RPC runtime evidence로 돌아간다. 계속 불가하면 ripple trim-start, real media metadata-backed source-duration hydration, 또는 zoom/scroll slice 중 가장 작은 항목을 진행한다.

## 2026-05-04: Loop 11K adds trim-in resize gestures

- **발견**: Supabase CLI는 여전히 없고 Docker Desktop daemon도 실행 중이 아니어서 live/local DB runtime evidence를 안전하게 만들 수 없었다.
- **결정**: Loop 11K는 planned fallback인 NLE direct manipulation slice로 진행했다. Timeline start resize handle은 UI-local geometry가 아니라 `trim-clip-start-to-time` reducer action을 거쳐 core `trimClipStart` command를 호출한다.
- **구현**: timeline clip의 left edge에 `timeline-clip-*-resize-start` handle을 추가했고, pointer delta를 현재 zoom scale 기준 seconds로 변환해 0.1초 단위로 반올림한 뒤 start/duration/in-point와 linked audio를 함께 갱신한다.
- **검증**: `pnpm --filter @aethon/web typecheck`, `pnpm --filter @aethon/web smoke`, `pnpm production:check` 통과. Full gate는 core 48, ai 8, db 29, web 6 tests와 production Playwright smoke 30개를 통과했다.
- **Cantos**: ADR `C:\Users\jusan\Desktop\cantos\projects\aethon\adr\0021-loop11k-trim-in-gesture-command-layer.html`와 DDR `C:\Users\jusan\Desktop\cantos\projects\aethon\ddr\0028-loop11k-timeline-trim-in-resize-handle.html`에 결정 기록을 남겼다.
- **스크린샷**: `docs/business-plan/assets/aethon-loop11k-timeline-trim-in-1440.png`, `docs/business-plan/assets/aethon-loop11k-timeline-trim-in-mobile-390.png`를 저장했다.
- **점수 갱신**: Professional NLE editing baseline을 11->12로 올리고 product readiness를 53/100에서 54/100으로 갱신했다.
- **다음**: Supabase local/staging target이 확인되면 provider-sim SQL RPC runtime evidence로 돌아간다. 계속 불가하면 ripple trim-start 또는 real media metadata-backed source-duration hydration 중 가장 작은 slice를 진행한다.

## 2026-05-04: Loop 11J adds pointer drag and resize timeline gestures

- **발견**: Supabase CLI는 여전히 없고 Docker Desktop daemon도 실행 중이 아니었다. Supabase SQL MCP는 노출됐지만 target이 local/dev인지 확인되지 않아 DB write는 보류해야 했다.
- **결정**: DB runtime evidence 대신 planned fallback인 direct manipulation NLE slice를 진행했다. UI pointer delta는 0.1초 단위로 변환하되, 실제 상태 변경은 `moveClipToTime`과 `trimClipEnd`를 호출하는 reducer/core command layer에 위임했다.
- **구현**: timeline clip drag move와 trim-out resize handle을 추가했다. Linked audio는 기존 core linked edit propagation으로 같이 이동/리사이즈된다. 모바일 timeline action bar는 2열 grid와 `minmax(0, 1fr)` constraint로 viewport overflow를 막았다.
- **검증**: `pnpm --filter @aethon/web smoke`, `pnpm production:check` 통과. Full gate는 core 48, ai 8, db 29, web 6 tests와 production Playwright smoke 28개를 통과했다.
- **Cantos**: ADR `C:\Users\jusan\Desktop\cantos\projects\aethon\adr\0020-loop11j-timeline-pointer-gestures-command-layer.html`와 DDR `C:\Users\jusan\Desktop\cantos\projects\aethon\ddr\0027-loop11j-timeline-drag-resize-controls.html`에 결정 기록을 남겼다.
- **스크린샷**: `docs/business-plan/assets/aethon-loop11j-timeline-drag-resize-1440.png`, `docs/business-plan/assets/aethon-loop11j-timeline-drag-resize-mobile-390.png`를 저장했다.
- **점수 갱신**: Professional NLE editing baseline을 10->11로 올리고 product readiness를 52/100에서 53/100으로 갱신했다.
- **다음**: Supabase local/staging target이 확인되면 provider-sim SQL RPC runtime evidence로 돌아간다. 계속 불가하면 ripple trim-start 또는 real media metadata-backed source-duration hydration 중 가장 작은 slice를 진행한다.

## 2026-05-04: Loop 11I adds source/program monitor commands and source-duration bounds

- **발견**: Supabase CLI가 계속 없어 live/local DB runtime evidence는 진행할 수 없었지만, NLE fallback에서 source media 길이 초과 편집을 막는 핵심 안전 장치가 아직 비어 있었다.
- **결정**: `EditClip.sourceDurationSeconds`를 선택 필드로 추가하고 trim-out, rolling edit, slip edit이 source duration을 넘으면 실패하도록 core guard를 추가했다.
- **구현**: Source Monitor의 `Source Slip +0.5s`와 Program Monitor의 `Program Roll +0.5s` 버튼을 기존 reducer action에 연결했다. 모바일에서는 desktop grid row가 남아 program frame이 inspector 클릭을 가로막는 회귀가 발생해 `editor-grid` row reset, monitor width constraint, safe-area pointer rule로 수정했다.
- **검증**: `pnpm --filter @aethon/core test`, `pnpm --filter @aethon/web smoke`, `pnpm production:check` 통과. Full gate는 core 48, ai 8, db 29, web 6 tests와 production Playwright smoke 26개를 통과했다.
- **Cantos**: ADR `C:\Users\jusan\Desktop\cantos\projects\aethon\adr\0019-loop11i-source-duration-source-program-trim.html`와 DDR `C:\Users\jusan\Desktop\cantos\projects\aethon\ddr\0026-loop11i-source-program-monitor-trim-controls.html`에 결정 기록을 남겼다.
- **스크린샷**: `docs/business-plan/assets/aethon-loop11i-source-program-trim-1440.png`, `docs/business-plan/assets/aethon-loop11i-source-program-trim-mobile-390.png`를 저장했다.
- **점수 갱신**: Professional NLE editing baseline을 9->10으로 올리고 product readiness를 51/100에서 52/100으로 갱신했다.
- **다음**: Supabase CLI/local/staging target이 준비되면 provider-sim SQL RPC와 `rls-catalog-check.sql` runtime evidence로 돌아간다. 계속 불가하면 drag/resize gesture, real media metadata-backed source-duration hydration, richer zoom/scroll 중 가장 작은 독립 slice를 진행한다.

## 2026-05-04: Loop 11H adds rolling, slip, and zoom evidence

- **발견**: Loop 11G 이후에도 professional NLE parity는 direct manipulation 이전 단계에서 rolling edit, slip edit, zoom state/projection이 비어 있었다.
- **결정**: `rollEditBoundary`, `slipClipInPoint`, `setTimelineZoom`을 core command model에 추가하고 Studio UI/단축키는 같은 reducer action을 사용하게 했다.
- **구현**: Roll +0.5s, Slip +0.5s, Zoom -/+, Shift+ArrowRight roll, Alt+ArrowRight slip, S slip tool, +/- zoom shortcut을 추가했다. Playwright가 action bar wrap이 ruler 클릭을 가로막는 문제를 잡아 `timeline-header`를 auto row로 바꿨고, clip lane은 zoom-scaled inner layer를 사용한다.
- **검증**: `pnpm --filter @aethon/core test`, `pnpm --filter @aethon/web smoke`, `pnpm production:check` 통과. Full gate는 core 45, ai 8, db 29, web 6 tests와 production Playwright smoke 24개를 통과했다.
- **Cantos**: ADR `C:\Users\jusan\Desktop\cantos\projects\aethon\adr\0018-loop11h-rolling-slip-zoom-command-model.html`와 DDR `C:\Users\jusan\Desktop\cantos\projects\aethon\ddr\0025-loop11h-rolling-slip-zoom-controls.html`에 결정 기록을 남겼다.
- **스크린샷**: `docs/business-plan/assets/aethon-loop11h-rolling-slip-zoom-1440.png`, `docs/business-plan/assets/aethon-loop11h-rolling-slip-zoom-mobile-390.png`를 저장했다.
- **점수 갱신**: Professional NLE editing baseline을 8->9로 올리고 product readiness를 50/100에서 51/100으로 갱신했다.
- **다음**: Supabase CLI/local/staging target이 준비되면 provider-sim SQL RPC와 `rls-catalog-check.sql` runtime evidence로 돌아간다. 계속 불가하면 drag/resize gestures, source/program trim mode, source-duration bounds, richer zoom/scroll 중 작은 slice를 진행한다.

## 2026-05-04: Loop 11G completes the NLE trim/snap/move fallback slice

- **발견**: Supabase CLI가 워크스페이스에서 사용할 수 없어 Live/local DB runtime evidence는 계속 차단되었지만, NLE P0 fallback은 독립적으로 점수를 올릴 수 있었다.
- **결정**: `packages/core/src/video-editing.ts`에 trim start/end, move, snap-to-previous-boundary, snap threshold, locked-track guard, same-track overlap rejection, aligned linked-audio propagation을 추가했다.
- **구현**: Studio UI는 Snap, Trim In, Trim Out, Move +1s 버튼과 V/B/T, bracket trim, Ctrl/Cmd+Arrow move 단축키를 core command model에 연결했다.
- **검증**: `pnpm --filter @aethon/core test`, `pnpm --filter @aethon/web typecheck`, `pnpm --filter @aethon/web test`, `pnpm --filter @aethon/web smoke`, `pnpm production:check` 통과. Full gate는 core 41, ai 8, db 29, web 6 tests와 production Playwright smoke 22개를 통과했다.
- **Cantos**: ADR `C:\Users\jusan\Desktop\cantos\projects\aethon\adr\0017-loop11g-timeline-trim-snap-move-command-model.html`와 DDR `C:\Users\jusan\Desktop\cantos\projects\aethon\ddr\0024-loop11g-timeline-command-controls-and-shortcuts.html`에 결정 기록을 남겼다.
- **스크린샷**: `docs/business-plan/assets/aethon-loop11g-timeline-trim-move-1440.png`, `docs/business-plan/assets/aethon-loop11g-timeline-trim-move-mobile-390.png`를 저장했다.
- **점수 갱신**: Professional NLE editing baseline을 6->8로 올리고 product readiness를 48/100에서 50/100으로 갱신했다.
- **다음**: Supabase CLI/local/staging target이 준비되면 provider-sim SQL RPC와 `rls-catalog-check.sql` runtime evidence로 돌아간다. 계속 불가하면 rolling/slip/zoom/drag-resize/source-program trim mode 중 가장 작은 NLE slice를 진행한다.

## 2026-05-04: Loop 11F promotes provider-sim completion to SQL RPC transaction

- **발견**: Loop 11E의 repository boundary는 여러 Supabase JS write로 terminal run update, output asset, events, validation, cost, rights, export manifest를 저장했다. 이 구조는 retry나 worker timeout 상황에서 DB transaction 단위 evidence를 증명하기 어렵다.
- **결정**: `complete_provider_simulated_run` SQL RPC를 추가해 active lease, `claim_token`, terminal status, output asset, append-only events, validation/cost/rights/export evidence를 하나의 Postgres transaction으로 묶었다. Same claim token 재시도는 기존 claimed event를 기준으로 terminal run을 반환하고 duplicate evidence rows를 만들지 않는다.
- **구현**: `packages/db/schema.sql`, `packages/db/migrations/0001_initial_ai_control.sql`, `packages/db/verification/rls-catalog-check.sql`, `packages/db/src/ai-control-repository.ts`, `packages/db/src/schema-security.test.ts`를 갱신했다.
- **검증**: `pnpm --filter @aethon/core test`, `pnpm --filter @aethon/db test`, `pnpm --filter @aethon/db typecheck`, `pnpm production:check` 통과. Full gate는 core 35, ai 8, db 29, web 6 tests, 5-package typecheck/build, production Playwright smoke 20 passed.
- **Cantos**: ADR `C:\Users\jusan\Desktop\cantos\projects\aethon\adr\0016-loop11f-provider-sim-sql-completion-transaction.html`에 SQL completion transaction 결정을 기록했다.
- **점수 갱신**: Provider execution 7->8, Observability/cost 3->4로 올려 product readiness를 48/100으로 갱신했다. Supabase CLI가 없어 live/local DB 실행은 아직 미실행이므로 Data/security 축은 5로 유지한다.
- **다음**: Supabase CLI 또는 staging 연결이 준비되면 `rls-catalog-check.sql`과 provider-sim claim/completion/idempotency runtime cases를 실제 DB에서 실행한다.

## 2026-05-04: Loop 11C closes AI planner, export QC, and DB drift gaps

- **발견**: all-agent wave가 공통으로 지적한 가장 즉시 해결 가능한 gap은 `packages/ai` 비어 있음, validation `needs-review` report가 export ready로 새는 문제, `schema.sql`과 initial migration drift였다.
- **결정**: 실제 provider 호출은 하지 않고 deterministic/mock-first AI planner와 prompt gate를 먼저 만든다. Export는 validation warning/not-run 상태를 waiver 없이 ready로 보지 않는다. DB schema draft와 migration은 정적 drift test로 묶는다.
- **구현**: `@aethon/ai` workspace package를 추가하고 `planScenes`, `composePromptPair`, `lintPromptPair`, `buildClaudeAdviserRequest`를 만들었다. `packages/core/src/production-readiness.ts`는 `needs-review` validation report를 export blocker로 처리한다. `packages/db/src/schema-security.test.ts`는 schema/migration 동기화를 검사한다.
- **검증**: `pnpm production:check` passed. Coverage: core 32 tests, ai 8 tests, db 24 tests, web 6 tests, 5-package typecheck/build, production Playwright smoke 20 passed.
- **Cantos/Playwright 증거**: Cantos ADR `0015-loop11c-deterministic-ai-planner-export-qc-drift-gates.html`와 DDR `0023-loop11c-production-gate-70-tests-20-smoke.html`를 생성했고, Playwright MCP screenshots `docs/business-plan/assets/aethon-cantos-adr-0015-loop11c-1440.png`, `docs/business-plan/assets/aethon-cantos-ddr-0023-loop11c-gate-1440.png`를 남겼다.
- **점수 갱신**: AI-native planning/adviser layer는 6에서 7로, Export/QC/provenance는 5에서 6으로 올렸다. Product readiness는 42/100이다. Provider execution, live RLS, desktop shell, media bin, C2PA/export manifest evidence가 없어 더 올리지 않는다.
- **다음**: provider-sim worker가 append-only `generation_run_events`를 실제로 쓰고, result asset -> validation report -> cost ledger -> rights manifest -> export manifest까지 한 경로로 생성해야 한다.

## 2026-05-04: MCP startup timeout is an execution-surface failure, not a code failure

- **발견**: Wave D spawn 중 `Starting MCP servers (0/9)` 이후 timeout이 반복되면 subagent가 코드 실행에 실패한 것이 아니라 Codex가 다수 MCP 서버를 동시에 cold-start하다가 startup deadline을 넘긴 것이다.
- **원인**: CapCut MCP는 이미 제거됐지만 MCP list에는 `cantos`, `context7`, `notionApi`, `playwright`, `xcodebuildmcp`, `figma`, `supabase`, `vercel` 등 9개 표면이 남아 있었다. all-agent spawn과 MCP startup이 겹치면 `npx` 기반/원격 OAuth 기반 서버가 동시에 대기하면서 timeout과 대량 shutdown을 유발한다.
- **결정**: all-agent wave는 MCP-cold로 실행한다. subagent prompt에는 MCP 사용을 요구하지 않고, main Codex가 agent 결과 회수 후 Cantos/Playwright만 필요한 순간에 순차 실행한다.
- **재발 방지**: MCP timeout이 난 세션은 다음 wave 동시성을 6에서 3으로 낮춘다. 비필수 MCP 비활성화는 사용자 승인 후 전역 config에서만 수행한다.
- **사용자 결정**: 이후 실행 기본값은 all-agent wave가 아니라 relevant-agent routing이다. 전체 23개 역할은 기준 roster로 유지하지만, 실제 작업에는 해당 slice에 필요한 1-3개 agent만 선택한다.

## 2026-05-04: Loop 11D starts provider-sim execution evidence in core

- **발견**: append-only `generation_run_events`와 claim primitive는 이미 있지만, provider 실행 결과가 validation/cost/rights/export evidence로 이어지는 테스트 가능한 경로가 없었다.
- **결정**: live provider, secret, Supabase write 없이 core pure function으로 provider-sim path를 먼저 만든다. 이 함수는 queued run을 claim/running/succeeded 또는 failed로 전이하고, 성공 시 validation report, spent cost ledger, cleared rights manifest, export readiness를 생성한다.
- **구현**: `packages/core/src/provider-sim.ts`와 `packages/core/src/provider-sim.test.ts`를 추가했다. `simulateProviderRun`은 성공 이벤트 `claimed -> running -> succeeded`, 실패 이벤트 `claimed -> running -> failed`, validation review blocker 전파를 검증한다.
- **검증**: `pnpm --filter @aethon/core test` passed with 35 tests. `pnpm --filter @aethon/core typecheck` passed.
- **점수 보류**: Product readiness는 42/100 유지. 아직 DB/repository persistence, output asset table linkage, export manifest 저장, C2PA/generated label이 없으므로 Provider/Export 축을 추가 상승시키지 않는다.

## 2026-05-04: Loop 11D closes provider-sim evidence persistence/readback

- **발견**: provider-sim core 결과는 validation/cost/rights/export evidence를 만들었지만 DB mapper가 `generation_run_id`, `asset_id`, `asset_ids`, `model_runs`, `rights_summary`를 비우고 있어 저장 후 증거 체인이 끊길 수 있었다.
- **결정**: core evidence 타입에 `runId`, `assetId`, `assetIds`, `modelRunIds`, `rightsSummary`, `artifactAssetIds`, `c2paStatus`를 추가하고 provider-sim에서 채운다. DB repository는 generated result asset을 저장하고, run 기준 evidence bundle을 다시 읽을 수 있어야 한다.
- **구현**: `packages/core/src/production-readiness.ts`, `packages/core/src/provider-sim.ts`, `packages/db/src/ai-control-repository.ts`, `packages/db/src/schema-types.ts`, `packages/db/schema.sql`, `packages/db/migrations/0001_initial_ai_control.sql`, `packages/db/verification/rls-catalog-check.sql`를 보강했다.
- **검증**: `pnpm production:check` passed. Coverage: core 35 tests, ai 8 tests, db 27 tests, web 6 tests, 5-package typecheck/build, production Playwright smoke 20 passed.
- **점수 갱신**: Provider execution 6->7, Export/QC/provenance 6->7, Data/security 4->5, Observability/cost 2->3으로 올려 product readiness를 46/100으로 갱신했다.
- **다음**: Loop 11E는 단일 atomic provider-sim worker/RPC boundary를 만들어 claim, asset save, event insert, evidence insert가 retry 상황에서 부분 저장으로 남지 않게 해야 한다.

## 2026-05-04: Loop 11E adds retry-safe provider-sim repository boundary

- **발견**: provider-sim evidence 저장 primitive가 있어도 worker가 직접 여러 메서드를 호출하면 stale lease overwrite와 duplicate evidence insert가 생길 수 있다.
- **결정**: `SupabaseAiControlRepository`에 `claimGenerationRunForWorker`와 `completeProviderSimulatedRun`을 추가한다. Completion은 claimed event의 `actorId/claimToken`과 active lease 조건을 확인한 뒤 terminal run update를 수행하고, evidence rows는 deterministic id 기준 `ignoreDuplicates`로 저장한다.
- **구현**: `packages/db/src/ai-control-repository.ts`가 claim RPC wrapper, claimed-run conditional completion, generated output asset save, duplicate-safe event/validation/cost/rights/export writes, run evidence readback을 한 경계로 제공한다.
- **검증**: `pnpm production:check` passed. Coverage: core 35 tests, ai 8 tests, db 27 tests, web 6 tests, 5-package typecheck/build, production Playwright smoke 20 passed.
- **점수 보류**: Product readiness는 46/100 유지. 아직 이 경계는 Supabase JS repository boundary이며, 단일 SQL transaction/RPC와 live Supabase execution evidence가 없으므로 추가 상승시키지 않는다.
- **다음**: 실제 local/staging Supabase에서 claim/completion path를 실행하거나, SQL RPC로 completion bundle을 단일 transaction화한다.

## 2026-05-04: Codex all-agent work needs root role contracts and lightweight waves

- **발견**: 긴 세션 전체를 `fork_context:true`로 여러 Codex subagent에 복제하면 메모리 실패가 발생할 수 있다. 문제는 "모든 agent를 깨우는 것" 자체가 아니라 full-context fork 방식이다.
- **결정**: 23개 역할은 모두 활성 roster로 유지하되, `agents/*.md`를 root-level SSoT로 승격하고 `agents/CODEX_RUNTIME.md`의 최대 6-role 경량 wave로 실행한다.
- **운영 정리**: CapCut MCP는 AETHON goal 달성에 필수 의존이 아니므로 user 동의하에 Codex 전역 config에서 제거했다. 백업은 `C:\Users\jusan\.codex\config.toml.bak-20260504-035827`이다.
- **Cantos/Playwright 증거**: Cantos ADR `0013-codex-native-agent-contracts-lightweight-waves.html`, Cantos DDR `0020-loop11a-codex-agent-editor-readiness-evidence.html`, Playwright MCP screenshots `aethon-loop11a-codex-agent-scorecard-before-1440.png`, `aethon-loop11a-codex-agent-scorecard-before-mobile-390.png`, `aethon-cantos-adr-0013-codex-agent-contracts-1440.png`를 남겼다.
- **Loop 11A 구현**: FE-design P0였던 disabled Export visual affordance를 수정했다. `Export master` disabled 상태는 primary teal이 아니라 muted/dashed/not-allowed로 보이며, Playwright smoke가 computed style을 검증한다.
- **검증**: `pnpm --filter @aethon/web typecheck`, `pnpm --filter @aethon/web build`, `AETHON_E2E_PORT=3020 pnpm --filter @aethon/web smoke:prod` 통과. 이후 전체 `pnpm production:check`도 통과했다. Coverage: core 25 tests, db 23 tests, web 6 tests, 4-package typecheck/build, production smoke 18 passed.
- **추가 증거**: Cantos DDR `0021-loop11a-disabled-export-affordance-fix.html`, Playwright MCP screenshots `aethon-loop11a-disabled-export-after-1440.png`, `aethon-loop11a-disabled-export-after-mobile-390.png`, `aethon-loop11a-disabled-export-after-export-tab-1440.png`.
- **점수 갱신**: product production readiness는 37/100에서 38/100으로 갱신했다. Export/QC/provenance 축이 4에서 5로 상승했지만, manifest/C2PA/render evidence가 없어 더 올리지 않는다.
- **Loop 11B 구현**: core timeline edit primitive를 추가했다. `splitClipAtTime`, `splitClipAtPlayhead`, `rippleDeleteClip`, `TimelineHistory`, `applyTimelineEdit`, `undoTimelineEdit`, `redoTimelineEdit`가 `EditingWorkspace`를 deterministic state transition으로 바꾼다. Web UI는 Split/Ripple Delete/Undo/Redo 버튼을 core command model에 연결했다.
- **Loop 11B 검증**: `pnpm production:check` 통과. Coverage: core 31 tests, db 23 tests, web 6 tests, 4-package typecheck/build, production Playwright smoke 20 passed. 신규 smoke는 desktop/mobile에서 split → ripple delete → undo → redo를 검증한다.
- **Cantos/Playwright 증거 2**: Cantos ADR `0014-core-timeline-edit-primitives-before-ui-wiring.html`, Cantos DDR `0022-loop11b-timeline-edit-workflow-evidence.html`, screenshots `aethon-loop11b-timeline-split-after-1440.png`, `aethon-loop11b-timeline-ripple-delete-after-1440.png`.
- **점수 갱신 2**: Professional NLE baseline은 4에서 6으로 올렸다. Split/ripple/undo가 core+UI+Playwright로 증명됐지만, trim/snap/move/keyboard shortcuts/linked audio가 아직 없어 더 올리지 않는다. Product readiness는 40/100이다.
- **영향**: 앞으로 all-agent audit은 모든 역할을 빠짐없이 실행하지만, prompt에는 active goal, role file, relevant files, output schema만 전달한다.
- **다음**: `docs/business-plan/aethon-100-percent-production-scorecard.md`로 객관 scorecard를 만들고, agent wave 결과를 구현 backlog로 수렴한다.

## 2026-05-03: Loop 10A closed server-action trust and export evidence gaps

- **발견**: agent wave가 반복해서 같은 리스크를 지적했다. persisted Server Action이 client-provided `suggestion`, `gate`, `preferences`를 그대로 믿으면 provider/model/cost/rights 근거가 조작될 수 있고, generated scene의 validation report가 누락되면 export gate가 이를 보지 못할 수 있다.
- **결정**: Server Action 입력을 `unknown`으로 받고 runtime parser로 검증한다. persisted path에서는 DB의 suggestion/preferences를 다시 읽고 서버에서 approval gate를 재계산한다. generated-video scene에는 validation report를 필수로 두고 missing report를 export blocker로 처리한다.
- **구현**: `apps/web/app/actions/ai-control.ts`, `packages/db/src/ai-control-repository.ts`, `packages/core/src/production-readiness.ts`, `apps/web/app/studio-client.tsx`, Playwright production config와 fixture를 보강했다.
- **검증**: `pnpm production:check` 통과. core 18, db 17, web 5 tests; 4-package typecheck/build; production `next start` Playwright smoke 18 passed.
- **다음**: Loop 10B는 provider catalog exact matching, queue lease/idempotency, append-only run events를 먼저 다룬다.

## 2026-05-03: Production smoke must run against built Next output

- **발견**: 기존 production gate의 browser smoke는 `next dev`를 사용해 build output/runtime drift를 잡지 못했다.
- **결정**: root `production:check`와 CI Browser smoke를 `@aethon/web smoke:prod`로 바꾸고 `next start` 기반 Playwright config를 추가했다.
- **운영 메모**: Windows 로컬에서는 Playwright 2 workers가 Node OOM을 유발할 수 있어 smoke workers를 1로 고정했다.
- **검증**: production `next start` desktop/mobile 18 smoke passed.

## 2026-05-03: Loop 9 began DB-backed adviser decision persistence and competitor-based NLE benchmarking

- **발견**: Loop 8의 UI/e2e decision flow는 제품 철학을 증명했지만, DB persistence는 아직 `recordDecision`과 `createGenerationRun`이 분리되어 audit만 남고 run 생성이 실패하는 partial state 가능성이 있었다.
- **결정**: `record_ai_decision_and_queue_generation_run` RPC를 schema/migration에 추가해 AI decision audit update와 generation run insert를 하나의 security-invoker DB transaction으로 묶었다. 같은 suggestion에서 approved generation run이 중복 생성되지 않도록 `generation_runs_approved_suggestion_once_idx`도 추가했다.
- **구현**: `SupabaseAiControlRepository.recordDecisionAndCreateGenerationRun`을 추가하고, `approveAndQueueGenerationRunAction`은 run이 생성되는 경우 이 단일 repository boundary를 사용한다. live catalog check도 RPC, execute grant, dedupe index를 확인한다.
- **경쟁 기준**: Runway, Adobe Premiere, CapCut, Higgsfield와 GitHub 고스타 OSS(`remotion`, `lossless-cut`, `ffmpeg.wasm`, `shotcut`, `kdenlive`, `olive`)를 기준으로 `docs/business-plan/open-source-video-editor-benchmark-2026-05-03.md`를 추가했다. 결론은 다음 product loop가 cosmetic UI가 아니라 실제 timeline edit primitive여야 한다는 것이다.
- **검증**: `pnpm --filter @aethon/db test` 17개 통과, `pnpm --filter @aethon/db typecheck` 통과, `pnpm --filter @aethon/web test` 3개 통과. 전체 gate는 `pnpm production:check`로 재검증한다.
- **다음**: Loop 10A는 split/trim/ripple/undo 중 하나를 실제 state transition과 Playwright smoke로 구현한다.

## 2026-05-03: Common agent contract now covers all harness axes

- **발견**: 공용 에이전트 계약 승격은 단순 디렉터리 정리가 아니라 하네스 축 업데이트다. 루트 `agents/`가 없으면 Codex 스킬, Claude 호환 경로, OMX 표면이 서로 다른 SSoT를 참조할 수 있다.
- **결정**: `agents/AGENT_CONTRACT.md`를 canonical contract로 고정하고 CE/AC/GC/EL/SI 축별 요구사항을 명시했다. `.claude/agents/AGENT_CONTRACT.md`는 shim으로 낮춰 중복 정책을 제거했다.
- **스킬 정렬**: `$architect`, `agent-architect`, `production-loop`, `think-teams`가 project-local `agents/`를 우선 탐색하고, `.claude/agents/`를 runtime adapter로 취급하도록 보강했다.
- **영향**: agent wave 기록은 앞으로 role mapped/emulated/spawned 상태를 구분해야 하며, Playwright 같은 deferred MCP는 `tool_search` 이후 unavailable 판정한다.
- **검증**: `rg`로 legacy agent path 잔존 참조가 없음을 확인했고, 주요 문서의 SSoT 표현을 `agents/AGENT_CONTRACT.md` 중심으로 정렬했다. Codex harness evaluator는 8.5/10 strong을 유지했고, `pnpm production:check`는 33 unit/source tests, 4-package typecheck/build, 18 Playwright smoke를 통과했다.
- **다음**: 개별 role 파일을 실제 `agents/` 하위로 이동할지 여부는 Claude hook/discovery 감사 후 shim/sync 전략과 함께 결정한다.

## 2026-05-03: Loop 8C made adviser decisions a tested export-gate workflow

- **발견**: AETHON의 핵심 제품 철학은 clip 선택 자체가 아니라 "AI가 제안하고, 편집자가 결정하며, export gate가 그 결정을 기억한다"는 흐름이다. 기존 smoke는 화면 존재와 일부 interaction은 잡았지만, `Approve / Edit Apply / Hold`가 pending count와 export readiness에 어떻게 반영되는지 충분히 증명하지 못했다.
- **결정**: `apps/web/app/studio-client.tsx`에 `ai-inspector`, `clip-inspector`, `export-inspector`, `metric-pending`, `metric-accepted`, `export-master-button`, `inspector-tab-*`, `tool-*`, `selection-readout` 등 안정적인 UI 계약을 보강했다. timeline clip 선택 시 inspector가 clip context로 전환되도록 `select-clip` reducer도 보강했다.
- **검증 범위**: `apps/web/tests/e2e/studio.smoke.spec.ts`는 desktop/mobile 합산 18개 smoke를 검증한다. 신규 흐름은 explicit adviser decision, 모든 AI suggestion 처리 후에도 QC/rights/preview blocker로 export disabled 유지, risky generated clip validation context, tool rail state persistence를 포함한다.
- **증거**: `docs/business-plan/assets/aethon-loop8-adviser-decision-export-1440.png`, `docs/business-plan/assets/aethon-loop8-adviser-decision-export-mobile-390.png`, `docs/business-plan/loop8-adviser-decision-export-gate-ddr-2026-05-03.html`.
- **검증**: `pnpm --filter @aethon/web typecheck` 통과, `pnpm --filter @aethon/web test` 3개 통과, `pnpm --filter @aethon/web smoke` 18개 통과, `pnpm production:check` 통과. 전체 gate 기준 core 17, db 13, web 3, Playwright 18.
- **운영 메모**: Playwright MCP는 브라우저 profile lock으로 사용할 수 없어 동일 Playwright runtime으로 로컬 screenshot과 console error 0 증거를 저장했다. 외부 DDR 전송은 보안 검토에서 거부되어 repo 내부 로컬 DDR로 대체했다.
- **다음**: Loop 9는 Supabase live RLS catalog check, DB-backed adviser decision persistence, 또는 실제 timeline edit operation(trim/split/ripple/undo) 중 하나로 production risk를 줄인다.

## 2026-05-03: Loop 8B expanded editor interaction smoke and cleaned local orchestration residue

- **발견**: 기존 Playwright smoke는 화면 존재와 export blocker만 확인했기 때문에, clip 선택 후 Source Monitor, Program Monitor, Clip Inspector가 같은 맥락을 공유하는지 증명하지 못했다.
- **결정**: timeline clip을 안정적인 `data-testid="timeline-clip-{clip.id}"`와 `aria-label`을 가진 버튼 계약으로 고정하고, clip 선택 시 `selectedClipId`, `selectedSceneId`, `workspace.playheadSeconds`를 함께 동기화한다.
- **검증 범위**: `apps/web/tests/e2e/studio.smoke.spec.ts`를 workflow smoke로 확장해 clip 선택, keyboard activation, inspector tab 전환, AI mode 조작, adviser decision, export gate 지속 차단, validation context, tool 변경, desktop/mobile no-overlap을 검증한다.
- **증거**: `docs/business-plan/assets/aethon-loop8b-interaction-smoke-1440.png`, `docs/business-plan/assets/aethon-loop8b-interaction-smoke-mobile-390.png`.
- **운영 정리**: legacy local orchestration directory는 tracked 파일이 아닌 로컬 잔존물로 확인되어 삭제했고, 재노출 방지를 위해 tracked `.gitignore`가 아니라 `.git/info/exclude`에 local-only ignore 규칙을 추가했다.
- **검증**: `pnpm --filter @aethon/web typecheck` 통과, `pnpm --filter @aethon/web smoke` 18개 통과.
- **다음**: `pnpm production:check`로 전체 gate를 다시 통과시키고, Loop 8A(Supabase live RLS) 또는 Loop 8C(repository/server action tests) 중 남은 production risk를 줄인다.

## 2026-05-03: Playwright MCP tools are deferred and must be surfaced with tool_search

- **발견**: `@playwright` 플러그인은 설치/등록되어 있어도 기본 tool 목록에는 보이지 않을 수 있다. `tool_search`로 `playwright browser automation screenshot click navigate MCP tools`를 검색하면 `mcp__playwright__` namespace가 노출된다.
- **이유**: Codex Desktop의 일부 MCP 도구는 deferred metadata로 보관되어 필요 시 검색 후 현재 턴에 노출된다. 도구가 안 보인다고 곧바로 설치 문제로 판단하면 혼동이 생긴다.
- **영향**: browser evidence가 필요한 루프에서는 먼저 `tool_search`로 Playwright 도구를 노출하고, 이후 `browser_navigate`, `browser_snapshot`, `browser_take_screenshot`을 사용한다.
- **출처**: Loop 8B 중 `@playwright`가 보이지 않는 문제를 점검하면서 확인.
- **다음**: 공용 agent contract와 QA 인사이트에 “deferred tool discovery first” 규칙을 반영한다.

## 2026-05-03: Loop 7 prepared live Supabase catalog RLS verification

- **Discovery**: Supabase CLI is not installed in this workspace, while Docker is available. Live RLS execution is therefore blocked by tooling setup, not by the schema itself.
- **Decision**: Added `packages/db/verification/rls-catalog-check.sql`, a PostgreSQL catalog verification script that raises exceptions when readiness tables, RLS, owner policies, ledger grants, or append grants drift.
- **Catalogs**: The script checks `pg_class.relrowsecurity`, `pg_policies`, and `information_schema.role_table_grants`.
- **Test coverage**: `packages/db/src/schema-security.test.ts` now verifies that the live catalog script covers all required readiness tables and catalog checks.
- **Verification**: `pnpm production:check` passed with 33 unit/security tests, 4-package typecheck, 4-package build, and 4 Playwright smoke tests.
- **Cantos**: ADR `0012-supabase-catalog-rls-verification-sql.html` records the decision and notes the Supabase CLI blocker.
- **Next**: Loop 8 should either install/configure Supabase CLI with explicit approval and run the catalog SQL, or continue increasing app-level production behavior around editor interactions.

## 2026-05-03: Loop 6 added Playwright browser smoke to the production gate

- **Discovery**: TypeScript, unit tests, and build can pass while the editor UI or export gate breaks in the browser. Production readiness needed automated browser proof, not only manual Playwright MCP screenshots.
- **Decision**: Added `@playwright/test`, `apps/web/playwright.config.ts`, and `apps/web/tests/e2e/studio.smoke.spec.ts`.
- **Coverage**: Smoke checks desktop and mobile editor load, console errors, Project Bin, Source Monitor, Program Monitor, Sequence timeline, Play button, Export Gate readiness, blocker copy, and disabled Export master button.
- **Test separation**: Added `apps/web/vitest.config.ts` so Vitest does not import Playwright e2e specs.
- **CI**: GitHub Actions installs Chromium, runs `pnpm --filter @aethon/web smoke`, and uploads Playwright report plus failure traces.
- **Verification**: `pnpm --filter @aethon/web smoke` passed 4 tests. `pnpm production:check` passed 32 unit/security tests, 4-package typecheck, 4-package build, and 4 browser smoke tests.
- **Cantos**: ADR `0011-browser-smoke-in-production-gate.html` records the browser gate decision.
- **Next**: Loop 7 should add either live Supabase RLS verification or richer editor interaction smoke: selecting clips, switching inspector tabs, accepting a suggestion, and confirming generation remains gated by approval.

## 2026-05-03: Loop 5 added a repeatable production gate

- **Discovery**: Separate manual commands were not enough for a production loop. The project needed one local command and a CI workflow that runs the same quality gates.
- **Decision**: Added root `pnpm production:check` and `.github/workflows/production-gate.yml`.
- **CI**: GitHub Actions uses Ubuntu, Node 24, pnpm 10.10.0, `pnpm install --frozen-lockfile`, then visible `Test`, `Typecheck`, and `Build` steps.
- **Docs**: README now documents the local gate, CI platform difference, and secret/env boundary. `NEXT_PUBLIC_*` values are documented as public, not secret storage.
- **Verification**: `pnpm production:check` passed, covering 32 tests, 4-package typecheck, and 4-package production build.
- **Cantos**: ADR `0010-production-check-gate-and-ci-workflow.html` records the production gate decision.
- **Next**: Loop 6 should add a Playwright smoke gate to the production check or CI: main studio route, console errors 0, key panels visible, export gate disabled when blockers exist.

## 2026-05-03: Loop 4 added DB/RLS and server-action guardrail tests

- **Discovery**: Loop 3 made the schema safer, but production readiness still needed a repeatable verification harness. Manual review alone would miss future drift between `schema.sql`, migrations, and server action guardrails.
- **Decision**: Added `packages/db/src/schema-security.test.ts` and `apps/web/app/actions/ai-control.test.ts`.
- **Coverage**: The DB harness checks readiness tables, RLS enabled, table-specific owner policies, append-oriented ledger grants, destructive SQL absence, and Clerk JWT `sub` trust boundary across both `schema.sql` and `migrations/0001_initial_ai_control.sql`.
- **Coverage**: The web harness checks that persisted generation queue paths do not accept a client-provided `userId` and that decision audit is recorded before generation run creation.
- **Verification**: `pnpm test` passed 32 tests, `pnpm typecheck` passed 4 packages, and `pnpm build` passed 4 packages.
- **Cantos**: ADR `0009-static-rls-security-harness-before-local-supabase.html` records the guardrail harness decision.
- **Next**: Loop 5 should move from static checks to live Supabase local/catalog verification with two user contexts, or, if local Supabase is unavailable, add a typed SQL catalog parser fixture for `pg_policies` expectations.

## 2026-05-03: Loop 3 persisted production readiness contracts in Supabase

- **Discovery**: Loop 2 core/UI contracts needed matching database persistence before real provider execution. Otherwise SceneSpec, capability, validation, rights, cost, and export readiness would split across code and UI state.
- **Decision**: Added Supabase tables for `provider_capability_versions`, `scene_specs`, `validation_reports`, `cost_ledger_entries`, and `rights_manifest_entries`, then expanded `export_manifests` with preview status, ledger/right entry ids, final decision audit, and updated_at.
- **Security**: Server actions now derive persisted user identity from `requireAethonUserId()` instead of trusting client-provided `userId`. Ledger-like validation/cost/rights tables use select/insert grants rather than broad update/delete grants.
- **Repository**: `SupabaseAiControlRepository` now exposes persistence methods for scene specs, provider capabilities, validation reports, cost ledger entries, rights manifest entries, and export manifests.
- **Verification**: `pnpm --filter @aethon/core test` passed 17 tests, `pnpm typecheck` passed 4 packages, and `pnpm build` passed 4 packages.
- **Cantos**: ADR `0008-persist-production-readiness-contracts.html` records the data/security persistence decision.
- **Next**: Loop 4 should add database/RLS verification harnesses: userId spoof prevention, cross-project access denial, no unapproved generation run insert, and audit table update/delete denial.

## 2026-05-03: Loop 2 added production readiness gates before AI execution and export

- **Discovery**: A professional AI video editor cannot rely on an attractive timeline alone. It needs explicit contracts for who approved an AI action, which provider capability is being used, which QC checks failed, which assets need rights review, and whether export is allowed.
- **Decision**: Added `packages/core/src/production-readiness.ts` with `SceneSpec`, `ProviderCapability`, `ValidationReport`, `CostLedgerEntry`, `RightsManifestEntry`, `ExportManifest`, and `evaluateExportReadiness`.
- **Reason**: The product philosophy is adviser-led. AI should help the editor see better choices and missed risks, but the editor remains responsible for approval and final publishing.
- **Impact**: `apps/web/app/studio-client.tsx` now shows provider capability in AI Adviser, SceneSpec and validation reports in Clip Inspector, and blocker/warning lists in Export Gate. Export is disabled unless readiness is `ready`.
- **Verification**: `pnpm --filter @aethon/core test` passed 17 tests, `pnpm typecheck` passed 4 packages, `pnpm build` passed 4 packages, Playwright console errors were 0.
- **Evidence**: `docs/business-plan/assets/aethon-loop2-ai-inspector-1440.png`, `docs/business-plan/assets/aethon-loop2-clip-inspector-1440.png`, `docs/business-plan/assets/aethon-loop2-export-gate-1440.png`, `docs/business-plan/assets/aethon-loop2-mobile-390.png`.
- **Cantos**: `0019-loop2-production-readiness-gates.html` records the DDR with visual diff, readout, and dark-pattern review.
- **Next**: Loop 3 should persist these contracts in Supabase with `scene_specs`, `provider_capability_versions`, `validation_reports`, `cost_ledger_entries`, and `rights_manifest_entries` so UI, server actions, and RLS share one schema.

## 2026-05-03: Loop 1 fixed the product surface around a professional editor workspace

- **발견**: AETHON의 중심 화면은 AI Control Center가 아니라 AI Video IDE + 전문 영상 편집기여야 한다. Loop 1에서 Project Bin, IDE Context, Source Monitor, Program Monitor, AI/Clip/Export Inspector, Tool Rail, Multitrack Timeline을 실제 웹 화면으로 재구성했다.
- **이유**: 사용자는 AI 자동화를 선호하는 것이 아니라, AI가 놓친 선택지와 리스크를 보여주고 최종 책임은 편집자가 갖는 구조를 요구했다.
- **영향**: `apps/web/app/studio-client.tsx`, `apps/web/app/globals.css`, `packages/core/src/video-editing.ts`, `packages/core/src/seed.ts`, `packages/core/src/ai-control.test.ts`가 Loop 1의 핵심 변경 파일이다.
- **검증**: `pnpm --filter @aethon/core test` 13개 통과, `pnpm typecheck` 4개 패키지 통과, `pnpm build` 통과, Playwright console error 0, desktop/mobile screenshots 저장.
- **Cantos**: `0018-premiere-capcut-editor-workspace-loop-1.html`에 visual_diff와 screenshot evidence를 기록했다.
- **다음**: Loop 2는 SceneSpec, provider capability registry, validation report, cost/rights manifest를 1급 도메인 모델로 추가한다.
