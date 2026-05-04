# Frontend Interactions Insights

## 2026-05-04: Project Bin filtering should keep media selection separate from clip selection

- **발견**: Media search/tag filtering changes the visible Project Bin list, but timeline clip selection still has to preserve the selected clip/source relationship.
- **결정**: Loop 11U keeps Project Bin filter state local to the Studio reducer and continues to use `selectedMediaSourceId` separately from `selectedClipId`. Filtering can hide non-matching tiles without mutating timeline selection or clip source metadata.
- **영향**: Imported source selection, Source Monitor readout, and timeline clip selection remain stable while users search `noir` or narrow to the `imported` tag.
- **검증**: Desktop/mobile production smoke covers import, filter result count, hidden non-matching source, active imported tile, and reload persistence.

## 2026-05-04: media import selection should not mutate timeline clip context

- **발견**: Project Bin import는 source/reference 선택 UX이고, timeline clip selection과 동일하게 취급하면 Program Monitor, playhead, inspector context가 의도치 않게 바뀔 수 있다.
- **결정**: Loop 11S는 `selectedMediaSourceId`를 별도 상태로 두고, timeline clip 선택 시에는 clip의 `sourceAssetId`로 media selection을 동기화한다. Project Bin tile 클릭은 Source Monitor만 imported source로 갱신한다.
- **영향**: Imported reference를 검토하면서도 현재 timeline clip/playhead context는 유지된다. Source Monitor는 selected source metadata를, Program Monitor는 timeline/program context를 계속 분리해 보여준다.
- **검증**: Desktop/mobile production smoke가 import, active tile, Source Monitor readout, reload 후 tile 복원을 확인한다.
- **다음**: Drag-to-timeline 또는 replace-source 기능을 추가할 때도 source selection과 timeline edit action을 명시적으로 분리한다.

## 2026-05-04: range scrollbars must match core scroll precision

- **발견**: Loop 11R production smoke가 range `step=0.1`일 때 browser가 `max=2.92`를 `2.9`로 양자화해 scrollbar value와 core maxScroll이 어긋나는 문제를 잡았다.
- **결정**: Timeline scrollbar는 `step=0.01`을 사용하고, 조작은 `set-timeline-scroll` reducer action으로만 전달한다. Smoke도 DOM value 직접 주입 대신 실제 focus + `End` 키 입력으로 검증한다.
- **영향**: Scrollbar, scroll buttons, readout, minimap window, reload persistence가 모두 `Window 00:00:02:22 - 00:00:14:14` 상태를 동일하게 표현한다.
- **검증**: Desktop/mobile production smoke 36개가 통과했고, navigator interaction test가 scrollbar max/value, minimap window style, reload 후 value persistence를 확인한다.
- **다음**: Range 기반 UI를 추가할 때는 core clamp precision과 input step을 먼저 맞춘다.

## 2026-05-04: ripple trim-start needs linked start and end propagation

- **발견**: start-side ripple은 선택 clip의 head를 줄이는 동시에 downstream closure를 해야 하므로, start-aligned linked clips와 end-aligned linked clips를 다르게 처리해야 한다.
- **결정**: `rippleTrimClipStart`는 start-aligned clips의 in-point와 duration을 함께 바꾸고, end-aligned clips는 duration만 줄인다. UI는 `ripple-trim-clip-start-to-time` action으로만 core command를 호출한다.
- **영향**: direct manipulation은 move, trim-out, trim-in, roll boundary, ripple trim-end, ripple trim-start까지 command-backed 상태가 되었다.
- **검증**: Core tests가 downstream closure와 backward trim rejection을 검증하고, Playwright smoke가 desktop/mobile에서 selected clip, linked keyframe, room tone, downstream video/audio state를 검증한다.
- **다음**: 남은 FE interaction debt는 media metadata hydration, zoom/scroll ergonomics, trim-mode affordance grouping이다.

## 2026-05-04: ripple trim needs a core command before a gesture handle

- **발견**: ripple trim은 선택 clip geometry만 바꾸는 trim과 달리 downstream clip 이동을 동반하므로 UI gesture에서 직접 좌표를 밀면 track overlap, linked audio sync, source-duration guard가 깨질 수 있다.
- **결정**: 먼저 `rippleTrimClipEnd` core primitive를 만들고, Studio의 ripple-end handle은 pointer delta를 `ripple-trim-clip-end-to-time` reducer action으로만 전달한다.
- **영향**: direct manipulation은 move, trim-out, trim-in, roll boundary, ripple trim-end까지 command-backed 상태가 되었다. 남은 interaction debt는 ripple trim-start와 metadata/zoom ergonomics 중심이다.
- **검증**: Core tests가 downstream shift와 source-duration rejection을 검증하고, Playwright smoke가 desktop/mobile에서 selected clip duration, room tone duration, downstream video/audio start를 검증한다.
- **다음**: ripple trim-start를 추가할 때도 affected linked clip과 downstream shift 범위를 core에서 먼저 정의한다.

## 2026-05-04: roll boundary gestures should share the trim gesture pipeline

- **발견**: rolling edit이 toolbar/keyboard/program monitor에는 있었지만 timeline boundary에는 직접 조작 affordance가 없어 professional NLE parity가 덜 닫혀 있었다.
- **결정**: 이전 same-track clip이 있는 clip에만 compact roll-start handle을 표시하고, pointer delta를 `roll-clip-start-boundary-to-time` reducer action으로 보낸다. Reducer는 core `rollEditBoundary`를 호출한다.
- **영향**: direct manipulation은 move, trim-out, trim-in, roll boundary까지 command-backed 상태가 되었고, remaining gesture debt는 ripple 중심으로 줄었다.
- **검증**: Playwright smoke가 desktop/mobile에서 roll handle을 +0.5초 이동한 뒤 previous clip duration 5.50, room tone duration 11.10, selected/linked clip start 11.10, duration 3.50, in-point 0.50을 검증한다.
- **다음**: ripple trim-start도 pointer delta -> reducer action -> core command 흐름으로 구현하고, 필요하면 core에 start-side ripple primitive를 먼저 추가한다.

## 2026-05-04: trim-in gestures should use the same pointer-to-command contract

- **발견**: trim-out resize만 있으면 timeline direct manipulation이 한쪽 edge에 치우치고, incoming edge 조정은 toolbar/keyboard에 의존하게 된다.
- **결정**: start resize handle도 drag move/trim-out과 같은 gesture state와 reducer action 경로를 사용한다. `trim-clip-start-to-time`은 core `trimClipStart`를 호출해 start, duration, source in-point, linked audio를 함께 갱신한다.
- **영향**: timeline direct manipulation은 move, trim-out, trim-in까지 command-backed 상태가 되었고, roll gesture도 같은 패턴으로 확장했다. 남은 직접 조작 debt는 ripple 중심이다.
- **검증**: Playwright smoke가 desktop/mobile에서 `clip-video-03` start handle을 +0.5초 이동한 뒤 video/audio start 11.10, duration 3.50, in-point 0.50을 검증한다.
- **다음**: ripple trim-start도 DOM-only resize가 아니라 pointer delta -> reducer action -> core command 흐름으로 구현한다.

## 2026-05-04: timeline gestures should convert pointer deltas into command actions

- **발견**: direct manipulation을 UI-local state로 만들면 toolbar, keyboard, monitor controls와 다른 편집 경로가 생긴다.
- **결정**: drag move와 trim-out resize handle은 pointer delta를 seconds로 변환한 뒤 `move-clip-to-time`, `trim-clip-end-to-time` reducer action으로 보낸다. reducer는 기존 `moveClipToTime`, `trimClipEnd` core command를 호출한다.
- **영향**: linked audio, overlap rejection, source-duration guard, history sync가 gesture에서도 동일하게 적용된다.
- **검증**: Playwright smoke가 desktop/mobile에서 clip-video-03을 +1.0s drag move하고 trim-out을 -0.5s resize한 뒤 video/audio `data-start-seconds`와 `data-duration-seconds`를 확인했다.
- **다음**: ripple drag, rolling boundary drag도 같은 pointer-delta-to-command 패턴으로 확장한다.

## 2026-05-04: source/program monitor controls should reuse timeline command actions

- **발견**: monitor 버튼이 별도 UI handler를 만들면 linked audio propagation, undo/error semantics, source-duration guard가 timeline toolbar/keyboard와 갈라질 위험이 있다.
- **결정**: Source Monitor의 `Source Slip +0.5s`와 Program Monitor의 `Program Roll +0.5s`는 기존 reducer action인 `slip-selected-clip-forward`, `roll-selected-boundary-forward`를 그대로 dispatch한다.
- **영향**: e2e는 monitor 버튼 클릭 후 selected video/audio의 `data-start-seconds`, `data-duration-seconds`, `data-in-point-seconds`를 같은 DOM contract로 검증한다.
- **검증**: 새 Playwright smoke가 desktop/mobile에서 source slip 후 in-point 0.50, program roll 후 이전 clip duration 5.50 및 selected/linked audio start 11.10, duration 3.50, in-point 1.00을 확인했다.
- **다음**: drag/resize gesture도 별도 mutation을 만들지 말고 pointer delta를 core command action으로 변환하는 thin UI layer로 유지한다.

## 2026-05-04: rolling/slip/zoom controls need command parity and keyboard paths

- **발견**: advanced NLE controls are high-risk because they combine state transitions, linked clip propagation, keyboard access, and dense toolbar layout.
- **결정**: Roll +0.5s, Slip +0.5s, Zoom -/+ buttons and Shift+ArrowRight, Alt+ArrowRight, S, +/- shortcuts all dispatch reducer actions backed by core commands.
- **영향**: invalid edits still resolve through `TimelineEditError` handling, while valid rolling and slip operations update linked audio in the same browser workflow.
- **검증**: Playwright smoke asserts previous clip duration, room tone duration, selected clip start/duration/in-point, linked audio in-point, zoom readout, and slip tool state across desktop and mobile.
- **다음**: source/program trim mode should reuse the same action layer and add keyboard focus expectations before pointer polish.

## 2026-05-04: timeline command shortcuts need state-level assertions

- **발견**: tool hotkeys alone are weak evidence; keyboard shortcuts must change timeline state or active tool and be asserted from stable DOM contracts.
- **결정**: Studio shortcuts now map V/B/T to select/blade/trim, brackets to trim in/out, and Ctrl/Cmd+Arrow to clip move. Timeline command buttons share the same reducer actions as shortcuts.
- **영향**: UI interactions no longer duplicate edit logic. TimelineEditError from overlap/invalid trim is caught at the reducer boundary and leaves state unchanged, so keyboard repeats do not crash the editor.
- **검증**: Playwright smoke selects `clip-video-03`, moves it with linked audio, snaps it back, trims in/out, changes tools via keyboard, and moves it again via Ctrl+Arrow on both desktop and mobile projects.
- **다음**: rolling/slip/drag resize should expose the same stable state attributes and include focus/keyboard paths before visual polish.

## 2026-05-03: interaction smoke should graduate from selection to editing commands

- **발견**: 현재 interaction smoke는 clip selection, keyboard activation, tool state persistence를 검증하지만 실제 편집 명령은 없다.
- **결정**: 다음 interaction loop는 command dispatch, undo/redo, keyboard shortcut, focus-visible state를 함께 다룬다.
- **영향**: UI button/selector 계약은 유지하되, user-visible 결과가 timeline clip geometry/state로 바뀌어야 한다.
- **검증**: production `next start` smoke 18 passed with console/pageerror fixture.
- **다음**: blade/trim 버튼이 실제 timeline command를 실행하도록 core command API와 e2e assertion을 연결한다.

> 본 파일은 `fe-interactions` 에이전트의 발견/결정을 축적한다.
> 업데이트 규칙: CLAUDE.md "인사이트 분배 프로토콜" 참조.

## 2026-04-20: 에이전트 초기 생성

- **발견**: AETHON 프로젝트 부트스트랩. Interactions Worker 신설.
- **이유**: 인라인 핀·비교 슬라이더·dnd-kit·Framer Motion 전담.
- **영향**: 인라인 편집 UX(S3 지표 ≤2.5회 수렴)의 엔지니어링 기반 결정이 여기 축적된다.
- **출처**: /agent-architect 실행 (세션 2026-04-20)
- **다음**: 첫 과제 수신 대기.

---

## 2026-04-20: Phase 1 사전 지식 시드

### dnd-kit 접근성
- **발견**: dnd-kit은 KeyboardSensor + AccessibilityAnnouncer 기본 제공. 씬 드래그를 화살표 키로도 가능하게 하려면 Sensor 등록 필수.
- **이유**: PRD US-M1-7(키보드 화살표로 씬 이동) 충족.
- **영향**: `<DndContext sensors={[useSensor(PointerSensor), useSensor(KeyboardSensor, ...)]}>` 패턴 표준화.
- **출처**: 사전 리서치.
- **다음**: Phase 1 드래그 구현 시 키보드 시나리오 테스트.

### 인라인 핀 영역 좌표 정규화
- **발견**: 핀 영역은 `{ x, y, w, h }`를 모두 0~1 정규화. 줌/리사이즈/디바이스 픽셀 비율과 무관하게 일관.
- **이유**: M3 핀이 줌 변경 후에도 정확한 영역에 그려져야 함.
- **영향**: `packages/core/types/Pin.ts`에 정규화 좌표 타입 강제. inpaint_pins JSONB 스키마와 일치.
- **출처**: 사전 리서치.
- **다음**: Phase 3 시작 시 변환 유틸 + 단위 테스트.

### Framer Motion 60fps 보장
- **발견**: Framer Motion의 `animate()` API는 GPU 변환(transform/opacity)만 사용. layout 애니메이션은 `layoutId` + 자동 FLIP. 핀 마커·비교 슬라이더 모션에 적합.
- **이유**: paint를 트리거하는 속성(width/height/top/left)은 60fps 깨짐.
- **영향**: 핀 마커 배치는 transform translate, 슬라이더는 transform scaleX/translateX.
- **출처**: 사전 리서치.
- **다음**: Phase 3 구현 시 모션 가이드라인 PR.

---

## 2026-04-20: Phase 1 사전 지식 시드

### dnd-kit 접근성
- **발견**: dnd-kit은 KeyboardSensor + AccessibilityAnnouncer 기본 제공. 씬 드래그를 화살표 키로도 가능하게 하려면 Sensor 등록 필수.
- **이유**: PRD US-M1-7(키보드 화살표로 씬 이동) 충족.
- **영향**: `<DndContext sensors={[useSensor(PointerSensor), useSensor(KeyboardSensor, ...)]}>` 패턴 표준화.
- **출처**: 사전 리서치.
- **다음**: Phase 1 드래그 구현 시 키보드 시나리오 테스트.

### 인라인 핀 영역 좌표 정규화
- **발견**: 핀 영역은 `{ x, y, w, h }`를 모두 0~1 정규화. 줌/리사이즈/디바이스 픽셀 비율과 무관하게 일관.
- **이유**: M3 핀이 줌 변경 후에도 정확한 영역에 그려져야 함.
- **영향**: `packages/core/types/Pin.ts`에 정규화 좌표 타입 강제. inpaint_pins JSONB 스키마와 일치.
- **출처**: 사전 리서치.
- **다음**: Phase 3 시작 시 변환 유틸 + 단위 테스트.

### Framer Motion 60fps 보장
- **발견**: Framer Motion의 `animate()` API는 GPU 변환(transform/opacity)만 사용. layout 애니메이션은 `layoutId` + 자동 FLIP. 핀 마커·비교 슬라이더 모션에 적합.
- **이유**: paint를 트리거하는 속성(width/height/top/left)은 60fps 깨짐.
- **영향**: 핀 마커 배치는 transform translate, 슬라이더는 transform scaleX/translateX.
- **출처**: 사전 리서치.
- **다음**: Phase 3 구현 시 모션 가이드라인 PR.

---
