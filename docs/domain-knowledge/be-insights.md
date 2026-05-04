# Backend Insights

## 2026-05-05: provider-sim RPC is locally proven across retry and lease failure cases

- **발견**: `complete_provider_simulated_run`의 성공 path만으로는 worker 안전성을 충분히 증명할 수 없다. active lease를 가진 다른 worker, 만료된 lease, same claim token 재시도, failed terminal path가 실제 DB에서 함께 확인되어야 한다.
- **결정**: `packages/db/verification/provider-sim-runtime-check.sql`을 backend worker runtime harness로 추가했다. 이 스크립트는 authenticated role + `request.jwt.claims`를 실제로 설정하고, adviser decision queue RPC, claim RPC, completion RPC를 순서대로 실행한다.
- **검증 범위**: same-token claim retry는 claimed event를 중복 생성하지 않는다. same-token completion retry는 terminal evidence row를 중복 생성하지 않는다. 다른 worker와 stale lease completion은 worker lease guard에서 거부된다. failed provider-sim completion은 failed event를 남기되 export manifest를 만들지 않는다.
- **영향**: backend worker가 future queue에서 `claim_generation_run` -> external/provider-sim execution -> `complete_provider_simulated_run` 순서로 붙을 근거가 생겼다. 실제 provider 호출, queue polling, retry interval, backoff, observability dashboard는 아직 별도 구현 대상이다.
- **출처**: Loop 11V local Supabase runtime evidence.
- **다음**: 외부 provider adapter를 붙일 때 `claim_token`을 provider idempotency key와 연결하고, retry/backoff policy를 operation config로 분리한다.

## 2026-05-04: provider-sim worker completion now has a single RPC boundary

- **발견**: worker completion은 stale lease, different worker, retry duplicate, partial evidence writes를 동시에 다루는 backend orchestration boundary다.
- **결정**: `SupabaseAiControlRepository.completeProviderSimulatedRun`이 다중 write 대신 `complete_provider_simulated_run` RPC를 한 번 호출하도록 변경했다. RPC payload는 기존 mapper를 재사용해 asset, events, validation, cost, rights, export manifest를 DB shape로 보낸다.
- **영향**: backend worker는 claim RPC 이후 completion RPC 하나만 호출하면 되고, 성공 후에는 `getGenerationRunEvidence`로 run 기준 evidence bundle을 readback한다. Failed provider-sim run은 terminal event만 남기고 export manifest를 만들지 않는다.
- **출처**: Loop 11F SQL provider-sim transaction.
- **다음**: 실제 worker가 붙을 때 queue retry policy와 stale lease reclaim interval을 운영 설정으로 분리한다.

## 2026-05-04: provider-sim needs one retry-safe worker boundary after evidence contracts

- **발견**: provider-sim core는 `claimed -> running -> succeeded/failed`와 evidence bundle을 만들 수 있고 DB repository도 asset/evidence 저장과 readback을 지원한다. 남은 backend risk는 이 여러 write를 하나의 worker transaction/RPC로 묶지 않으면 retry 중 partial state가 남는다는 점이다.
- **결정**: 다음 backend slice는 새 provider 기능을 늘리는 것이 아니라 `claim -> save output asset -> append events -> save validation/cost/rights/export evidence -> read back evidence`를 하나의 idempotent boundary로 만든다.
- **영향**: Server Action이나 background worker가 provider-sim을 호출해도 duplicate run/event/evidence를 만들지 않아야 하며, 다른 worker의 active lease를 덮어쓰면 안 된다.
- **출처**: Loop 11D provider-sim persistence/readback.
- **개선 2026-05-04**: `claimGenerationRunForWorker`와 `completeProviderSimulatedRun` repository boundary를 추가했다. Completion은 `lease_owner`, `claim_token`, `lease_expires_at` 조건을 걸고, event/evidence writes는 deterministic id + `ignoreDuplicates`로 재시도 중복을 줄인다.
- **다음**: 같은 claim token 재실행, 다른 worker active lease 차단, terminal evidence 중복 저장 방지, 짧은 lease 실패를 live DB 또는 repository integration test로 검증한다.

## 2026-05-03: Server Actions need runtime schemas and canonical re-read before paid work

- **발견**: TypeScript 타입은 Server Action 호출 표면의 런타임 검증이 아니다. provider 실행 전에 forged `gate`, `preferences`, `suggestion`을 차단해야 한다.
- **결정**: AI control actions가 `unknown` input을 parse하고, persisted path에서는 stored suggestion/preferences를 재조회한 뒤 gate를 서버에서 재계산한다.
- **영향**: 클라이언트 UI는 preview/evaluation payload를 보낼 수 있지만, DB persistence와 provider queue는 서버 canonical state에서만 파생되어야 한다.
- **검증**: web action guardrail tests 5 passed, `pnpm production:check` passed.
- **다음**: provider capability exact validation을 approve-and-queue 경계에 추가한다.

> 본 파일은 `be-orchestrator` 에이전트의 발견/결정을 축적한다.
> 업데이트 규칙: CLAUDE.md "인사이트 분배 프로토콜" 참조.

## 2026-05-03: approve-and-queue는 단일 repository boundary로 호출한다

- **발견**: Server Action에서 `recordDecision` 후 `createGenerationRun`을 순차 호출하면 백엔드 orchestration이 DB transaction 경계보다 위에 머물러 partial state와 retry 중복을 만들 수 있다.
- **이유**: Adviser-first 제품에서 AI 실행 승인과 큐 등록은 하나의 의도다. 실패하면 둘 다 실패해야 하고, 재시도 시 같은 approved suggestion이 중복 실행되지 않아야 한다.
- **영향**: `approveAndQueueGenerationRunAction`은 generation run이 생기는 경로에서 `recordDecisionAndCreateGenerationRun`만 호출한다. run이 만들어지지 않는 blocked path는 decision만 기록한다.
- **출처**: Loop 9 DB-backed adviser decision persistence.
- **다음**: 외부 provider queue를 붙일 때 idempotency key를 RPC/queue payload까지 확장한다.

---

## 2026-04-20: 에이전트 초기 생성

- **발견**: AETHON 프로젝트 부트스트랩. Backend Orchestrator 신설.
- **이유**: Server Actions·3-tier AI 오케스트레이션·긴 작업 큐 전담.
- **영향**: AI 폴백 전략, Vercel Queues 활용 경계, 인증 진입점 결정이 여기 축적된다.
- **출처**: /agent-architect 실행 (세션 2026-04-20)
- **다음**: 첫 과제 수신 대기.

---

## 2026-05-03: AI 실행 전 승인 게이트가 백엔드 표준이다

- **발견**: AETHON의 Server Action/Route Handler는 외부 AI 호출 전에 프로젝트 전역 모드, 작업별 모드, 비용/권리 임계값을 확인해야 한다.
- **이유**: Adviser-first 제품에서는 추천 생성과 실제 provider 호출이 다른 단계다. 비용 발생, 외부 업로드, 최종 export는 사용자가 책임 있게 선택해야 한다.
- **영향**: 백엔드 계약은 `createSuggestion -> approveSuggestion -> startGenerationRun` 3단 구조가 적합하다. `generation_runs.trigger_mode`와 `ai_suggestions.user_decision`을 함께 기록한다.
- **출처**: 사용자 피드백(2026-05-03), PRD 1.1, `packages/db/schema.sql`.
- **다음**: 첫 Server Action 구현 시 승인 게이트 헬퍼와 Zod 스키마를 공통화.

---

## 2026-05-03: AI Control Server Action 경계 생성

- **발견**: `apps/web/app/actions/ai-control.ts`에 `evaluateAiSuggestionAction`, `recordAiSuggestionDecisionAction` 서버 액션 경계를 만들었다. 현재는 DB 저장 없이 core 순수 함수를 호출해 gate/audit record를 반환한다.
- **이유**: React 클라이언트가 정책을 직접 복제하면 웹/데스크톱/백엔드 간 규칙이 갈라진다. Server Action 경계를 먼저 두면 Supabase 연결 시 persistence만 추가하면 된다.
- **영향**: 이후 `approveSuggestion -> generation_runs` 전환 시 action 내부에서 Clerk 세션, RLS, 비용/권리 gate를 검사하는 구조로 확장한다.
- **출처**: AI Control Center productionization 작업(2026-05-03).
- **다음**: Zod 입력 검증과 Supabase insert/update를 연결한다.

---

## 2026-04-20: Phase 1 사전 지식 시드

### Server Action 에러 폴백 패턴
- **발견**: Server Action 내부 AI 호출이 실패하면 `try/catch` + 사용자 친화 메시지 + 재시도 큐 등록의 3단 패턴이 표준. `unstable_rethrow`로 redirect/notFound는 통과.
- **이유**: AI 프로바이더 일시 오류(429/503)에 사용자 경험을 깨지 않게.
- **영향**: 모든 Server Action에 `withFallback()` 래퍼 + Sentry 캡처. PRD AC-M4-5 폴백 모델 패턴.
- **출처**: 사전 리서치.
- **다음**: Phase 1 첫 Server Action 작성 시 래퍼 표준화.

### Vercel Queues — AI 호출 큐
- **발견**: Vercel Queues(Public Beta)는 Fluid Compute 기반 at-least-once 큐. 30s 이상 걸리는 영상 변환·인페인팅에 적합. Idempotency Key로 중복 처리 방지.
- **이유**: 30 씬 동시 영상 변환은 Server Action 직접 호출로 불가(타임아웃). 비동기 큐 + Realtime polling 표준.
- **영향**: `apps/web/api/video/route.ts`는 큐 등록만, 실제 처리는 워커 함수. PRD AC-M4-1.
- **출처**: 사전 리서치 + Vercel knowledge-update.
- **다음**: Phase 4 큐 통합 시 Idempotency 패턴 정착.

### Idempotency Key 정책
- **발견**: 모든 외부 API 호출(영상 모델 / 인페인팅 / 결제)에 idempotency key 필수. 형식: `{userId}:{sceneId}:{action}:{timestamp_minute}`. 사용자 더블클릭/네트워크 재시도 보호.
- **이유**: AI 모델 호출은 비싼 작업(씬당 $0.01~$1). 중복 호출 방지가 비용 직결.
- **영향**: 모든 AI 호출 어댑터에 idempotency key 인자 강제. cost-monitor와 연계.
- **출처**: 사전 리서치.
- **다음**: Phase 2 어댑터 작성 시 키 생성 유틸.

---

## 2026-04-20: Phase 1 사전 지식 시드

### Server Action 에러 폴백 패턴
- **발견**: Server Action 내부 AI 호출이 실패하면 `try/catch` + 사용자 친화 메시지 + 재시도 큐 등록의 3단 패턴이 표준. `unstable_rethrow`로 redirect/notFound는 통과.
- **이유**: AI 프로바이더 일시 오류(429/503)에 사용자 경험을 깨지 않게.
- **영향**: 모든 Server Action에 `withFallback()` 래퍼 + Sentry 캡처. PRD AC-M4-5 폴백 모델 패턴.
- **출처**: 사전 리서치.
- **다음**: Phase 1 첫 Server Action 작성 시 래퍼 표준화.

### Vercel Queues — AI 호출 큐
- **발견**: Vercel Queues(Public Beta)는 Fluid Compute 기반 at-least-once 큐. 30s 이상 걸리는 영상 변환·인페인팅에 적합. Idempotency Key로 중복 처리 방지.
- **이유**: 30 씬 동시 영상 변환은 Server Action 직접 호출로 불가(타임아웃). 비동기 큐 + Realtime polling 표준.
- **영향**: `apps/web/api/video/route.ts`는 큐 등록만, 실제 처리는 워커 함수. PRD AC-M4-1.
- **출처**: 사전 리서치 + Vercel knowledge-update.
- **다음**: Phase 4 큐 통합 시 Idempotency 패턴 정착.

### Idempotency Key 정책
- **발견**: 모든 외부 API 호출(영상 모델 / 인페인팅 / 결제)에 idempotency key 필수. 형식: `{userId}:{sceneId}:{action}:{timestamp_minute}`. 사용자 더블클릭/네트워크 재시도 보호.
- **이유**: AI 모델 호출은 비싼 작업(씬당 $0.01~$1). 중복 호출 방지가 비용 직결.
- **영향**: 모든 AI 호출 어댑터에 idempotency key 인자 강제. cost-monitor와 연계.
- **출처**: 사전 리서치.
- **다음**: Phase 2 어댑터 작성 시 키 생성 유틸.

---
