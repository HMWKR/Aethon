# Frontend Insights

> 본 파일은 `fe-lead` 에이전트의 발견/결정을 축적한다.
> 업데이트 규칙: CLAUDE.md "인사이트 분배 프로토콜" 참조.

## 2026-04-20: 에이전트 초기 생성

- **발견**: AETHON 프로젝트 부트스트랩. FE 부서(총괄) 설립.
- **이유**: Project Lead가 AETHON 23 에이전트 조직 구성 과정에서 해당 부서 신설.
- **영향**: Next.js 16 App Router 아키텍처, 상태 관리, RSC 경계 결정이 이 파일에 축적된다.
- **출처**: /agent-architect 실행 (세션 2026-04-20)
- **다음**: 첫 과제 수신 대기.

---

## 2026-05-03: Next.js 웹 스튜디오 첫 화면 스캐폴드 생성

- **발견**: `apps/web`에 Next.js App Router 기반 첫 스튜디오 화면을 생성했다. 화면은 Project Header, Locked Context, Scene Board, AI Control Center, Decision Inspector로 구성된다.
- **이유**: 문서형 레포에서 실제 제품 검증형 레포로 전환하려면 P0에서 바로 확인 가능한 UI 골격이 필요하다.
- **영향**: `apps/web/app/page.tsx`, `globals.css`, `layout.tsx`, `next.config.ts`, `tsconfig.json` 생성. `@aethon/core`의 AI 모드 타입을 웹 화면에서 사용한다.
- **출처**: P0.5 모노레포 부트스트랩 작업.
- **다음**: Phase 1에서 실제 데이터 연결, 모드 변경 인터랙션, 추천 카드 승인 플로우를 붙인다.

## 2026-05-03: AI Control Center 첫 스크린샷 검증 및 Cantos DDR 연결

- **발견**: `http://localhost:3020`에서 AETHON Studio 첫 화면이 정상 렌더링되었다. Playwright 접근성 스냅샷에서 Project summary, Locked references, Scene timeline, AI decision inspector, AI mode principles 영역이 확인되었다.
- **이유**: 문서의 Adviser-first 방향을 실제 UI 증거로 고정해야 다음 구현이 흔들리지 않는다.
- **영향**: 스크린샷 `docs/business-plan/assets/aethon-studio-ai-control-center-1440.png` 생성. Cantos DDR `0016-initial-ai-control-center-studio-shell.html`에 연결.
- **출처**: Playwright 로컬 검증(2026-05-03 14:18 KST).
- **다음**: 모바일/태블릿 캡처와 실제 추천 카드 상태 전환 테스트 추가.

---

## 2026-05-03: AI Control Center를 상호작용 가능한 클라이언트 플로우로 승격

- **발견**: 정적 목업이던 `apps/web/app/page.tsx`를 서버 셸로 줄이고, `apps/web/app/studio-client.tsx`에 전역 모드, 작업별 모드, 씬 선택, 추천 승인/수정/보류 상태 전이를 구현했다.
- **이유**: Adviser-first 철학은 화면에 텍스트로 쓰는 것만으로는 부족하다. 사용자가 추천 근거를 확인하고 선택할 때 지표와 씬 상태가 바뀌어야 실제 제품 흐름이 된다.
- **영향**: Pending/Accepted/Cost/Rights 메트릭이 core 계산 함수와 연결된다. 승인 후 선택된 씬은 `approved`로 바뀌고, 대기 제안이 없다는 상태 카드가 표시된다.
- **출처**: AI Control Center productionization 작업(2026-05-03).
- **다음**: Server Action 결과와 Supabase persistence를 연결하고, task-level mode를 실제 사용자 설정으로 저장한다.

---

## 2026-04-20: Phase 1 사전 지식 시드

### Next.js 16 Cache Components (PPR) 활용 패턴
- **발견**: Next.js 16의 Cache Components(PPR — Partial Prerendering)는 정적 셸 + 동적 슬롯 분리로 LCP 개선. 타임라인 화면은 정적 레이아웃 + 동적 씬 데이터 구조 — PPR 적격.
- **이유**: 30 씬 데이터를 매번 SSR하면 LCP 2.5s 어려움. 정적 셸을 prerender하고 씬은 Suspense로 스트리밍.
- **영향**: `(studio)/page.tsx`는 PPR 활성화. `'use cache'` 디렉티브 + `cacheLife`/`cacheTag`를 씬 단위로 적용. 옛날 `unstable_cache` 사용 금지.
- **출처**: 사전 리서치 + Vercel knowledge-update.
- **다음**: Phase 1 착수 시 PPR 적용 + 측정.

### Server Action 스트리밍 + 옵티미스틱 UI
- **발견**: Server Action은 React 19의 `useActionState` + `useOptimistic`과 결합해 옵티미스틱 UI 가능. duration 인라인 편집·드래그 순서 변경 등에 적용.
- **이유**: AI 호출이 30s 이상 걸리는 작업과 즉시 응답이 필요한 작업을 구분. 즉시 작업은 옵티미스틱, 장시간은 Vercel Queues.
- **영향**: `splitSceneAction`은 큐, `updateSceneDuration`은 옵티미스틱. RSC에 `'use client'` 혼용 금지(Next 16 규칙).
- **출처**: 사전 리서치.
- **다음**: Phase 1 착수 시 패턴 라이브러리화.

### 상태 관리 라이브러리 선택 — Zustand
- **발견**: 타임라인 같은 클라이언트 상태가 많은 화면은 Zustand가 적합(작고, devtools 좋음, persistence 쉬움). Jotai/Redux 검토했으나 보일러플레이트/번들 사이즈 trade-off.
- **이유**: Konva 좌표·줌·드래그 임시 상태는 서버 단일 진실원에 둘 필요 없고 클라이언트 우세. RSC와 분리.
- **영향**: `packages/ui/store/timeline.ts`로 단일 store. SSR 무관한 데이터만 보관.
- **출처**: 사전 리서치.
- **다음**: Phase 1 착수 시 store 설계.

---
