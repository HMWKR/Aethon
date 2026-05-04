# Desktop & QA Insights

## 2026-05-05: export evidence screenshots must prove artifact-level provenance

- **발견**: Loop 11W Export inspector evidence는 단순 blocker 상태가 아니라 render artifact id, checksum, artifact URI, generated-content label, and C2PA attachment status가 한 화면에 보여야 의미가 있다.
- **결정**: Screenshot capture는 Export tab을 열고 `export-manifest-evidence` block을 viewport 안으로 스크롤한 뒤 desktop 1440px와 mobile 390px를 모두 저장한다. 두 번째 캡처 세트는 C2PA verification/policy/signature/signer/hash rows가 실제 viewport에 보이도록 맞춘다.
- **영향**: `docs/business-plan/assets/aethon-loop11w-render-artifact-proof-1440.png`, `docs/business-plan/assets/aethon-loop11w-render-artifact-proof-mobile-390.png`, `docs/business-plan/assets/aethon-loop11w-c2pa-render-proof-1440.png`, `docs/business-plan/assets/aethon-loop11w-c2pa-render-proof-mobile-390.png`가 Loop 11W visual proof다. Evidence capture 서버는 최종 검증 후 종료한다.
- **검증**: Production smoke 38개가 desktop/mobile Export inspector evidence를 검증했고, screenshot capture에서 render artifact/provenance/C2PA policy/signature fields를 확인했다. Cantos에는 DDR 0041과 screenshot links를 추가했다. Playwright MCP는 `file://` Cantos DDR 직접 탐색이 차단되어 product evidence screenshots와 Cantos link evidence를 병행했다.

## 2026-05-04: mobile pointer smoke should scroll exact handles into view

- **발견**: Loop 11U Project Bin filter UI가 모바일 전체 페이지 높이를 늘리면서 ripple handle pointer smoke가 handle을 viewport 안에 명시적으로 넣지 않으면 좌표가 빗나갈 수 있었다.
- **결정**: Mobile pointer tests는 drag 대상 handle에 `scrollIntoViewIfNeeded()`를 적용한 뒤 bounding box를 읽는다.
- **영향**: UI 자체는 정상이며, production smoke는 긴 모바일 편집 화면에서 실제 조작 대상이 보이는 상태를 전제로 더 안정적으로 동작한다.
- **검증**: 초기 smoke는 mobile ripple end/start 2개가 실패했고, 테스트 보강 후 desktop/mobile 38개 production smoke가 통과했다.

## 2026-05-04: inspector evidence can be hidden by internal scroll

- **발견**: Loop 11T desktop screenshot에서 Export inspector의 내부 scroll 위치 때문에 새 `Manifest evidence` 블록이 첫 캡처에 보이지 않았다. UI가 정상이어도 evidence screenshot은 target block을 실제 viewport에 넣어야 한다.
- **결정**: Inspector/side panel 증거는 `data-testid` target으로 `scrollIntoViewIfNeeded()`를 실행한 뒤 desktop/mobile screenshot을 캡처한다.
- **영향**: 최종 Loop 11T screenshots는 `export-manifest-evidence` block을 직접 보여주며, asset/model/validation/cost/rights/generated label/C2PA readout이 확인된다.
- **검증**: Screenshot script는 console/page errors 0을 확인했고, 캡처용 production server listener를 종료했다.

## 2026-05-04: local evidence ports can be stale even when screenshots use a new build

- **발견**: Loop 11S screenshot capture에서 port `3032`에 이전 Next server가 남아 있어 server HTML과 hydrated client bundle이 달라지는 현상이 있었다. 새 포트 `3033`에서 최신 build를 띄우자 `media-import-input`이 정상 노출됐다.
- **결정**: UI 증거 캡처 전에는 target port의 listener start time 또는 feature selector count를 확인한다. 오래된 listener가 있으면 건드리지 않고 새 포트를 사용한다.
- **영향**: Screenshot evidence는 최신 build 기준으로 desktop/mobile 모두 `Import Media`, imported tile, Source Monitor readout을 포함한다.
- **검증**: Screenshot script는 console/page errors 0을 확인했고, 새 production server는 캡처 후 종료했다.
- **다음**: 반복 캡처 루프에서는 `Get-NetTCPConnection`으로 포트 소유 프로세스를 먼저 확인한다.

## 2026-05-04: Loop 11R navigator evidence must include range precision and mobile layout

- **발견**: Timeline navigator는 visual affordance라 typecheck/build만으로 충분하지 않았다. Production smoke가 `step=0.1` range rounding regression을 잡아 `2.92` max scroll이 `2.9`로 잘리는 것을 확인했다.
- **결정**: Navigator QA는 desktop/mobile production smoke에서 range keyboard 조작, `Window` readout, minimap window style, reload persistence를 같이 본다. Screenshot evidence는 별도 production `next start` 서버에서 desktop/mobile로 저장한다.
- **영향**: Loop 11R evidence는 `docs/business-plan/assets/aethon-loop11r-timeline-navigator-1440.png`와 `docs/business-plan/assets/aethon-loop11r-timeline-navigator-mobile-390.png`를 포함한다.
- **검증**: `$env:AETHON_E2E_PORT='3031'; pnpm production:check` passed with 97 unit/source/security tests, 5-package typecheck/build, and 36 production Playwright smoke tests.
- **다음**: UI range/slider를 추가할 때는 browser-native step rounding을 smoke에 포함한다.

## 2026-05-04: Loop 10B production evidence captured with smoke plus screenshots

- **발견**: Playwright MCP browser가 기존 Chrome profile lock으로 직접 열리지 않았다. 같은 production `next start` 서버에 대해 Playwright CLI screenshot으로 증거를 남겼다.
- **결정**: MCP가 lock 상태일 때는 실패를 기록하고, `pnpm production:check`의 18개 production smoke와 CLI screenshot을 evidence fallback으로 사용한다.
- **영향**: UI 변경이 포함된 루프는 `docs/business-plan/assets/loop-10b-provider-catalog-prod.png`와 `docs/business-plan/assets/loop-10b-provider-catalog-mobile-prod.png`처럼 desktop/mobile 증거를 남긴다.
- **출처**: Loop 10B provider catalog + queue contract hardening.
- **검증**: `pnpm production:check` passed, Playwright screenshot desktop/mobile files created.
- **다음**: MCP profile lock이 반복되면 isolated session 옵션을 사용할 수 있는 MCP 실행 경로를 별도 확인한다.

## 2026-05-03: browser smoke is now production-start based

- **발견**: `next dev` smoke는 production build/runtime drift를 잡지 못한다.
- **결정**: `smoke:prod`를 추가해 `next start`를 띄우고, root production gate와 CI가 이를 사용하게 했다.
- **운영 메모**: Windows 로컬에서 Playwright worker OOM이 발생해 smoke workers를 1로 고정했다. 안정성이 병렬성보다 우선이다.
- **검증**: `pnpm production:check` passed, production desktop/mobile smoke 18 passed.
- **다음**: UI 변경마다 screenshot evidence를 `docs/business-plan/assets/`에 남기고, Tauri scaffold가 생기면 desktop shell smoke를 별도 추가한다.

> 본 파일은 `desktop-qa-lead` 에이전트의 발견/결정을 축적한다.
> 업데이트 규칙: CLAUDE.md "인사이트 분배 프로토콜" 참조.

## 2026-04-20: 에이전트 초기 생성

- **발견**: AETHON 프로젝트 부트스트랩. Desktop & QA Lead 신설.
- **이유**: Tauri 2.0 셸·Rust IPC·네이티브 FS·Playwright E2E·플랫폼 분기 어댑터 전담.
- **영향**: 웹/데스크톱 분기 어댑터 계약, Tauri allowlist, Playwright 시나리오 결정이 여기 축적된다.
- **출처**: /agent-architect 실행 (세션 2026-04-20)
- **다음**: 첫 과제 수신 대기.

---

## 2026-04-20: Phase 1 사전 지식 시드

### Tauri 2.0 IPC 보안
- **발견**: Tauri 2.0은 명령(`#[tauri::command]`)별 권한 정책 분리(capability system). 파일 시스템·네이티브 FFmpeg 호출은 명시적 권한 부여 필수.
- **이유**: 웹 프론트가 임의 OS 명령 실행 못하게.
- **영향**: `apps/desktop/src-tauri/capabilities/`에 권한 명세. fs-tauri 어댑터는 허용 경로만.
- **출처**: 사전 리서치 [추정] — Phase 6 시작 전 fact-checker 검증.
- **다음**: Phase 6 셸 셋업 시 capability 명세.

### Playwright 다중 윈도우 테스트
- **발견**: Playwright의 `BrowserContext.pages()` + `context.on('page', ...)` 이벤트로 다중 윈도우 추적. Tauri 멀티 윈도우(타임라인 + 프리뷰 분리) 테스트에 적합.
- **이유**: P7 멀티 윈도우 검증.
- **영향**: 테스트 헬퍼 `awaitWindow(role)` 표준. RisksR4 완화.
- **출처**: 사전 리서치.
- **다음**: Phase 7 시나리오 작성.

### 네이티브 FFmpeg 빌드 — sidecar 패턴
- **발견**: Tauri sidecar 패턴으로 OS별 사전 빌드된 FFmpeg 바이너리를 번들. 직접 빌드보다 단순. macOS는 universal binary, Windows는 x64.
- **이유**: 사용자 머신에 FFmpeg 설치 강요 안함. 경험 단순화.
- **영향**: GitHub Actions 매트릭스 빌드에 sidecar 다운로드 단계 추가.
- **출처**: 사전 리서치.
- **다음**: Phase 7 native render 어댑터 시 통합.

---

## 2026-04-20: Phase 1 사전 지식 시드

### Tauri 2.0 IPC 보안
- **발견**: Tauri 2.0은 명령(`#[tauri::command]`)별 권한 정책 분리(capability system). 파일 시스템·네이티브 FFmpeg 호출은 명시적 권한 부여 필수.
- **이유**: 웹 프론트가 임의 OS 명령 실행 못하게.
- **영향**: `apps/desktop/src-tauri/capabilities/`에 권한 명세. fs-tauri 어댑터는 허용 경로만.
- **출처**: 사전 리서치 [추정] — Phase 6 시작 전 fact-checker 검증.
- **다음**: Phase 6 셸 셋업 시 capability 명세.

### Playwright 다중 윈도우 테스트
- **발견**: Playwright의 `BrowserContext.pages()` + `context.on('page', ...)` 이벤트로 다중 윈도우 추적. Tauri 멀티 윈도우(타임라인 + 프리뷰 분리) 테스트에 적합.
- **이유**: P7 멀티 윈도우 검증.
- **영향**: 테스트 헬퍼 `awaitWindow(role)` 표준. RisksR4 완화.
- **출처**: 사전 리서치.
- **다음**: Phase 7 시나리오 작성.

### 네이티브 FFmpeg 빌드 — sidecar 패턴
- **발견**: Tauri sidecar 패턴으로 OS별 사전 빌드된 FFmpeg 바이너리를 번들. 직접 빌드보다 단순. macOS는 universal binary, Windows는 x64.
- **이유**: 사용자 머신에 FFmpeg 설치 강요 안함. 경험 단순화.
- **영향**: GitHub Actions 매트릭스 빌드에 sidecar 다운로드 단계 추가.
- **출처**: 사전 리서치.
- **다음**: Phase 7 native render 어댑터 시 통합.

---
