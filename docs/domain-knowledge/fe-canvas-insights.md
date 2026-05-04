# Frontend Canvas Insights

## 2026-05-04: timeline navigator must project the full sequence and visible window

- **발견**: Loop 11Q 이후 zoom/scroll 상태는 유지됐지만, dense timeline에서 현재 window가 전체 sequence 중 어디인지 바로 볼 수 없었다.
- **결정**: Loop 11R은 ruler와 track stack 사이에 minimap을 넣고, full sequence clip coverage와 visible window overlay를 같은 `getTimelineVisibleRange` 값에서 계산한다.
- **영향**: Scroll buttons, `Window` readout, clip lane projection, playhead, scrollbar, minimap window가 모두 같은 core-visible range를 공유한다.
- **검증**: `aethon-loop11r-timeline-navigator-1440.png`와 `aethon-loop11r-timeline-navigator-mobile-390.png`에서 `Zoom 125%`, scrolled window, minimap overlay가 desktop/mobile 모두 보이는 것을 확인했다.
- **다음**: 실제 thumbnails/markers를 minimap에 얹더라도 minimap 자체가 별도 timeline state를 만들지 않게 유지한다.

## 2026-05-04: timeline viewport persistence must stay narrow

- **발견**: Zoom/scroll navigation이 reload마다 초기화되면 professional editor의 dense timeline context가 끊긴다. 반대로 full workspace를 localStorage에 저장하면 edit history, AI state, provider state까지 부정확하게 저장할 위험이 있다.
- **결정**: Loop 11Q는 `aethon.timelineViewport.v1`에 `zoom`과 `scrollSeconds`만 저장하고, 복원은 `setTimelineZoom`과 `setTimelineScroll`을 통해 core clamp를 거치게 했다.
- **영향**: Reload 후에도 `Zoom 125%`와 scrolled `Window 00:00:02:22 - 00:00:14:14`가 유지되지만, clip edits나 AI decisions는 local snapshot에 섞이지 않는다.
- **검증**: desktop/mobile production smoke가 zoom/scroll 후 reload하고 같은 readout을 확인한다.
- **다음**: 실제 project persistence가 들어오면 storage key를 project-scoped로 바꾸고, scrollbar/minimap도 같은 visible-range contract를 사용한다.

## 2026-05-04: timeline viewport scroll needs one core-visible range

- **발견**: Zoom만 lane scale로 처리하면 ruler label, clip projection, playhead, pointer gesture delta, and user readout이 서로 다른 timeline 기준을 가질 수 있다.
- **결정**: Loop 11P는 `scrollSeconds`와 `getTimelineVisibleRange`를 core editing workspace contract로 두고 Studio timeline 렌더링과 gesture math를 모두 같은 visible range에서 계산하게 했다.
- **영향**: Scroll left/right buttons, `Window` readout, ruler ticks, clip positions, and playhead all describe the same zoomed viewport. Mobile selection readout은 2-column grid로 정리해 dense timeline 상태가 겹치지 않는다.
- **검증**: `aethon-loop11p-timeline-zoom-scroll-window-1440.png`와 `aethon-loop11p-timeline-zoom-scroll-window-mobile-390.png`에서 `Zoom 125%`와 `Window 00:00:02:22 - 00:00:14:14`가 desktop/mobile 모두 보이는 것을 확인했다.
- **다음**: viewport persistence는 Loop 11Q에서 추가됐다. scrollbar or minimap을 추가할 때도 core visible range를 단일 기준으로 유지하고 screenshot evidence를 gate에 포함한다.

## 2026-05-04: media source duration readouts need same-context evidence

- **발견**: Source duration이 core guard에만 있으면 editor가 selected clip의 trim/slip 가능 범위를 어떤 media source에서 읽었는지 확인할 수 없다.
- **결정**: Project Bin에는 media source metadata tile을, Clip Inspector에는 source asset/source duration/metadata provenance row를 배치해 timeline 선택 context 안에서 같은 metadata를 확인하게 했다.
- **영향**: Clip Inspector는 selected clip의 `sourceAssetId`를 media source label과 연결하고 `sourceDurationSeconds`를 timecode로 보여준다. This keeps source-bound editing evidence close to the timeline decision surface without adding a modal.
- **검증**: `aethon-loop11o-media-metadata-source-duration-1440.png`와 `aethon-loop11o-media-metadata-source-duration-mobile-390.png`에서 manual close-up source duration `00:00:08:00`과 `file-probe` provenance가 desktop/mobile 모두 보이는 것을 확인했다.
- **다음**: 실제 file probe/import가 들어오면 같은 readout row를 유지하고 metadata source만 persisted/probed 값으로 교체한다.

## 2026-05-04: start and end ripple markers need edge separation

- **발견**: ripple-start marker가 trim-start bar와 roll-start badge 근처에 배치되면 좁은 clip에서 edge affordance가 겹칠 수 있다.
- **결정**: ripple-start marker는 start edge에서 24px 안쪽 bottom marker로 배치하고, ripple-end marker는 right bottom marker로 유지해 trim edge bars와 roll top badge를 피한다.
- **영향**: selected clip 하나에 trim, roll, ripple-start, ripple-end affordance가 공존하지만 label과 hit target을 완전히 덮지 않는다.
- **검증**: `aethon-loop11n-timeline-ripple-start-handle-1440.png`와 `aethon-loop11n-timeline-ripple-start-handle-mobile-390.png`에서 marker가 desktop/mobile viewport 안에 보이는 것을 확인했다.
- **다음**: full trim-mode UI에서는 compact markers를 explicit mode-specific handles로 재정렬한다.

## 2026-05-04: ripple handles should be visually distinct from trim and roll

- **발견**: timeline clip edge에 trim, roll, ripple affordance가 함께 놓이면 사용자가 같은 resize 계열 조작을 구분하기 어렵다.
- **결정**: ripple-end handle은 bottom-right compact marker로 두고, trim edge bar와 roll top-left badge와 시각적 위치를 분리했다.
- **영향**: move/trim/roll/ripple affordance가 한 clip에 공존해도 label과 기존 handles를 완전히 가리지 않는다.
- **검증**: `aethon-loop11m-timeline-ripple-handle-1440.png`와 `aethon-loop11m-timeline-ripple-handle-mobile-390.png`에서 ripple marker가 desktop/mobile viewport 안에 보이는 것을 확인했다.
- **다음**: trim-mode UI를 formalize할 때 현재 compact markers를 explicit tool-mode affordance로 재정렬한다.

## 2026-05-04: compact boundary handles need visual containment checks

- **발견**: roll boundary handle은 trim-in handle과 같은 clip edge 근처에 놓이므로 affordance가 겹치거나 label을 가리는지 desktop/mobile screenshot으로 확인해야 한다.
- **결정**: roll handle은 top-left compact badge로 배치하고 기존 start/end trim handles는 edge bars로 유지한다. 이전 same-track clip이 있는 clip에만 표시해 첫 clip의 의미 없는 boundary affordance를 줄인다.
- **영향**: timeline canvas는 move, trim, roll affordance를 동시에 표시하면서도 clip label과 inspector/timeline boundaries를 침범하지 않는다.
- **검증**: `aethon-loop11l-timeline-roll-handle-1440.png`와 `aethon-loop11l-timeline-roll-handle-mobile-390.png`에서 selected clip과 roll handle이 viewport 안에 유지되는 것을 확인했다.
- **다음**: ripple gesture나 zoom/scroll 개선을 추가할 때도 full-page desktop/mobile screenshot을 evidence gate로 둔다.

## 2026-05-04: symmetric timeline handles need screenshot proof on mobile

- **발견**: trim-in handle을 추가하면 clip label, start handle, end handle이 같은 narrow lane 안에서 경쟁하므로 mobile screenshot으로 overflow와 hit target을 다시 확인해야 한다.
- **결정**: start/end handles는 absolute edge affordance로 고정하고, clip text는 기존 width constraint 안에 남긴다. Mobile timeline grid constraint는 Loop 11J의 `minmax(0, 1fr)` 패턴을 유지한다.
- **영향**: timeline canvas는 direct move, trim-out, trim-in affordance를 동시에 표시하면서도 inspector/export gate와 겹치지 않는다.
- **검증**: `aethon-loop11k-timeline-trim-in-1440.png`와 `aethon-loop11k-timeline-trim-in-mobile-390.png`에서 start handle과 action bar가 viewport 안에 유지되는 것을 확인했다.
- **다음**: ripple gesture나 zoom/scroll 개선을 추가할 때도 desktop/mobile screenshot review를 gate에 포함한다.

## 2026-05-04: direct timeline gestures need mobile min-width constraints

- **발견**: pointer drag/resize evidence screenshot을 확인하자 mobile timeline action bar가 content min-width 때문에 viewport 밖으로 밀리는 문제가 드러났다.
- **결정**: mobile timeline panel/header/track/ruler에 `minmax(0, 1fr)`, `min-width: 0`, `max-width: 100%` constraint를 추가하고 action bar를 2열 grid로 제한했다.
- **영향**: direct manipulation controls와 dense timeline toolbar가 같은 mobile viewport에서 함께 보이며, gesture smoke가 inspector/export gate와 충돌하지 않는다.
- **검증**: bounding-box inspection 후 `pnpm --filter @aethon/web smoke`와 `pnpm production:check`를 재실행했다.
- **다음**: ripple gesture를 추가할 때도 screenshot review를 gate에 포함한다.

## 2026-05-04: source/program monitor frames must reset desktop grid rows on mobile

- **발견**: Source/Program monitor command rows를 추가한 뒤 Playwright mobile smoke가 program frame이 inspector tabs 클릭을 가로막는 회귀를 잡았다. 원인은 모바일에서도 `.editor-grid`의 desktop `grid-template-rows`가 남아 `monitor-stack`이 310px row에 갇힌 것이었다.
- **결정**: 모바일에서는 editor grid rows를 `auto`로 재정의하고 monitor grid/panel/frame 폭을 100%/max-width 100%로 제한했다. decorative safe area는 pointer target에서 제외했다.
- **영향**: monitor frame이 inspector 위로 흘러넘치지 않고, mobile source/program controls도 viewport 안에서 클릭 가능하게 유지된다.
- **검증**: bounding-box script로 inspector tab center의 top hit target이 버튼으로 돌아온 것을 확인했고, `pnpm --filter @aethon/web smoke`와 `pnpm production:check`가 통과했다.
- **다음**: drag/resize gesture 추가 시에도 desktop row/min-content overflow가 mobile hit target을 가로막지 않는지 Playwright no-overlap과 click tests를 먼저 둔다.

## 2026-05-04: rolling and zoom need layout evidence, not only state tests

- **발견**: Roll/Slip/Zoom 버튼을 추가하자 고정 높이 timeline header가 버튼 wrap을 수용하지 못해 ruler가 pointer event를 가로막았다. Playwright smoke가 이 UI regression을 포착했다.
- **결정**: timeline header를 `auto` grid row로 전환하고 최소 높이만 유지했다. clip lane은 `workspace.zoom`을 CSS custom property로 받아 inner layer 폭을 조정한다.
- **영향**: rolling/slip/zoom state tests와 브라우저 visual interaction이 같은 루프에서 검증된다. 향후 버튼 수가 더 늘면 action bar를 메뉴/아이콘 그룹으로 분리해야 한다.
- **검증**: production Playwright smoke 24개와 screenshot evidence `aethon-loop11h-rolling-slip-zoom-1440.png`, `aethon-loop11h-rolling-slip-zoom-mobile-390.png`.
- **다음**: drag/resize gesture는 pointer geometry를 UI에만 두고 실제 state change는 core command API로 위임한다.

## 2026-05-04: timeline geometry now has trim, move, snap, and linked-audio state evidence

- **발견**: professional NLE baseline은 버튼 존재가 아니라 clip geometry가 core state와 브라우저에서 동일하게 바뀌는지로 판단해야 한다.
- **결정**: `EditClip` geometry를 바꾸는 trim start/end, move, snap-to-previous-boundary를 core pure functions로 먼저 고정하고, Studio timeline은 `data-start-seconds`, `data-duration-seconds`, `data-in-point-seconds`로 E2E 검증 가능한 상태를 노출한다.
- **영향**: linked audio가 primary video와 시작/끝/길이가 정렬된 경우 같은 delta를 적용하므로 timeline canvas가 video/audio sync를 깨지 않는다. 같은 트랙 overlap은 core에서 차단한다.
- **검증**: `packages/core/src/video-editing.test.ts` 11개 timeline command tests와 production Playwright smoke 22개가 통과했다.
- **다음**: drag/resize gesture를 추가할 때도 pointer 위치 계산은 이 core command API에만 위임하고, UI는 geometry projection과 accessibility affordance에 집중한다.

## 2026-05-03: NLE baseline now needs a real timeline command model

- **발견**: 경쟁 제품 기준에서 AETHON의 다음 UI 병목은 더 많은 panel이 아니라 split/trim/ripple/undo 같은 실제 timeline state transition이다.
- **결정**: 다음 FE loop는 visual tool toggle이 아니라 command model과 smokeable edit primitive를 만들어야 한다.
- **영향**: clip selection/playhead sync는 이미 smoke로 고정됐다. 다음은 selected clip을 실제로 split 또는 trim하고 undo/redo history에 남기는 계약이다.
- **검증**: 현재 production smoke는 selection, inspector sync, export gate, overlap을 검증한다.
- **다음**: `splitClipAtPlayhead` 또는 `trimClipEdge`를 core pure function + Playwright workflow로 추가한다.

> 본 파일은 `fe-canvas` 에이전트의 발견/결정을 축적한다.
> 업데이트 규칙: CLAUDE.md "인사이트 분배 프로토콜" 참조.

## 2026-04-20: 에이전트 초기 생성

- **발견**: AETHON 프로젝트 부트스트랩. Canvas Worker 신설.
- **이유**: Konva.js 타임라인/씬 카드/프리뷰 전문 워커 필요.
- **영향**: 타임라인 렌더링 성능(30씬 60fps), 드래그 인터랙션 결정이 여기 축적된다.
- **출처**: /agent-architect 실행 (세션 2026-04-20)
- **다음**: 첫 과제 수신 대기.

---

## 2026-04-20: Phase 1 사전 지식 시드

### Konva 30+ 노드 성능 — 가상화 패턴
- **발견**: Konva Stage는 노드 30개까지는 일반 렌더로 60fps 유지 가능하나, 50+ 진입 시 가상화 필수. 화면 밖 씬은 Layer에서 제거하고 줌/스크롤 시 동적 재구성.
- **이유**: 5분 영상 = 평균 30~40 씬, 사용자가 더 만들면 50+. 미리 가상화 패턴을 표준화.
- **영향**: `packages/ui/timeline/VirtualizedStage.tsx` 컴포넌트 표준. AC-M1-5 60fps 보장의 근거.
- **출처**: 사전 리서치.
- **다음**: Phase 1 착수 시 PoC + 60fps 측정.

### 줌/패닝 좌표계
- **발견**: Konva의 Stage는 `scale()` + `position()`으로 줌/팬 표현. 정규화 좌표(원본 0~1)로 저장해 줌 레벨과 무관하게 일관 유지.
- **이유**: 인라인 핀(M3) 영역 좌표가 줌 레벨에 의존하면 줌 변경 시 위치 어긋남.
- **영향**: 모든 인라인 핀 좌표는 `{ x, y, w, h } 0~1` 정규화 강제. PRD AC-M3-1.
- **출처**: 사전 리서치.
- **다음**: Phase 3 핀 구현 시 정규화 변환 유틸 작성.

### GPU 가속 — Konva `pixelRatio` + WebGL 검토
- **발견**: Konva는 기본 Canvas2D. 30씬 + 드래그 60fps 미달성 시 `pixelRatio` 조정 또는 WebGL Layer 검토. 단, WebGL은 인라인 핀 영역 픽킹이 복잡.
- **이유**: 1차는 Canvas2D + 가상화 + 메모이제이션. WebGL은 마지막 옵션.
- **영향**: Phase 1 60fps 미달성 시 WebGL 도입 결정 라운드.
- **출처**: 사전 리서치.
- **다음**: Phase 1 측정 결과로 결정.

---
