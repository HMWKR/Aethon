# Observability Insights

## 2026-05-05: export provenance hashes are observability keys

- **발견**: Loop 11W 이후 export manifest는 render artifact checksum, source manifest hash, C2PA manifest hash를 가진다. 이 값들은 단순 UI 표시가 아니라 provider run, validation, rights, export row, stored artifact를 연결하는 correlation key가 된다.
- **결정**: 향후 render/provider worker 로그와 failure event는 `generation_run_id`, `export_manifest_id`, `render_artifact_checksum`, `source_manifest_hash`, `c2pa_manifest_hash`를 함께 기록해야 한다.
- **영향**: 사용자가 "이 export가 어떤 입력과 어떤 검증으로 만들어졌는지"를 물었을 때 UI, DB, worker log, artifact storage를 같은 해시 축으로 추적할 수 있다.
- **검증**: Loop 11W core/db tests와 local Supabase provider-sim runtime fixture가 checksum/hash fields를 검증한다.
- **다음**: 실제 render output 저장이 들어오면 artifact probe result, signer verification result, storage object id를 append-only run event에도 포함한다.

## 2026-05-03: generation run history needs append-only events

- **발견**: `generation_runs.audit_trail`은 row JSONB snapshot이라 실제 provider lifecycle 감사 로그로는 약하다.
- **결정**: 다음 backend/data loop는 `generation_run_events` append-only table을 추가하고 queued/running/webhook/succeeded/failed/cancelled 이벤트를 분리해야 한다.
- **영향**: cost ledger, rights evidence, output asset ingest, export manifest의 `model_runs`가 run/event id와 연결되어야 사용자-visible history를 재구성할 수 있다.
- **다음**: provider worker를 붙이기 전에 event schema와 idempotency key를 확정한다.

> 본 파일은 `observability-lead` 에이전트의 발견/결정을 축적한다.
> 업데이트 규칙: CLAUDE.md "인사이트 분배 프로토콜" 참조.

## 2026-04-20: 에이전트 초기 생성

- **발견**: AETHON 프로젝트 부트스트랩. Observability Lead 신설.
- **이유**: Vercel Analytics·Sentry·AI 프로바이더 응답시간·세션 사이즈 추적·Grafana/Datadog 대시보드 전담.
- **영향**: 모델별 p50/p95/p99 SLO, 알림 룰(실패율 5%/p95 60s), 이상 탐지 패턴이 여기 축적된다.
- **출처**: /agent-architect 실행 (세션 2026-04-20)
- **다음**: 첫 과제 수신 대기.

---

## 2026-05-03: AI 모드별 제품 학습 지표가 필요하다

- **발견**: AETHON은 Auto 실행률보다 Adviser 추천 수락률, 기각 사유, Off 사용률, 승인 전 비용 경고 빈도를 추적해야 한다.
- **이유**: 사용자가 AI를 신뢰하는 지점과 거부하는 지점이 제품 개선의 핵심 데이터다. 단순 생성 횟수만 보면 자동화 편향으로 흐를 수 있다.
- **영향**: 관측 이벤트는 `suggestion_viewed`, `suggestion_accepted`, `suggestion_edited`, `suggestion_dismissed`, `auto_gate_blocked`, `manual_override_used`가 필요하다. PII와 창작 의도 원문은 마스킹/집계한다.
- **출처**: 사용자 피드백(2026-05-03), AI Control Center DDR.
- **다음**: Phase 1에서 이벤트 네이밍과 개인정보 마스킹 정책 확정.

---

## 2026-04-20: Phase 1 사전 지식 시드

### Sentry 샘플링 — 비용 vs 가시성
- **발견**: Sentry trace 샘플링은 Production 10%, Preview 100%, Development 0%. 에러는 100% 캡처. AI 호출 같은 비싼 트랜잭션은 sample by route.
- **이유**: Production 100% 샘플링은 트랜잭션 단가가 비쌈. 에러는 빠짐 없이.
- **영향**: `sentry.client.config.ts`에 환경별 정책. AI 호출 라우트는 별도 sampleRate.
- **출처**: 사전 리서치.
- **다음**: Phase 5 Production 배포 시 샘플링 적용 + 30일 비용 측정.

### Vercel Analytics 대시보드 + Web Vitals
- **발견**: Vercel Analytics는 Web Vitals(LCP/INP/CLS) 자동 수집. Speed Insights와 결합해 페이지별 성능 추적. 무료 티어 사용량 제한 확인 필요.
- **이유**: PRD N-01/N-02 LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1 검증.
- **영향**: `apps/web/app/layout.tsx`에 `<Analytics />` + `<SpeedInsights />` 컴포넌트.
- **출처**: 사전 리서치 + Vercel knowledge-update.
- **다음**: Phase 5 출시 직전 대시보드 설정.

### AI 응답 시간 SLO
- **발견**: SLO 정의 — 씬 분할 p95 ≤ 30s, 이미지 생성 p95 ≤ 30s, 인페인팅 p95 ≤ 20s, 영상 변환 p95 ≤ 120s. 위반 시 cost-monitor + 사용자 알림.
- **이유**: PRD 비기능 요구사항 + 사용자 기대 관리.
- **영향**: 각 AI 라우트에 시간 측정 + Sentry transaction. SLO 위반 알람 설정.
- **출처**: 사전 리서치.
- **다음**: Phase 4 구현 시 SLO 측정 통합.

---

## 2026-04-20: Phase 1 사전 지식 시드

### Sentry 샘플링 — 비용 vs 가시성
- **발견**: Sentry trace 샘플링은 Production 10%, Preview 100%, Development 0%. 에러는 100% 캡처. AI 호출 같은 비싼 트랜잭션은 sample by route.
- **이유**: Production 100% 샘플링은 트랜잭션 단가가 비쌈. 에러는 빠짐 없이.
- **영향**: `sentry.client.config.ts`에 환경별 정책. AI 호출 라우트는 별도 sampleRate.
- **출처**: 사전 리서치.
- **다음**: Phase 5 Production 배포 시 샘플링 적용 + 30일 비용 측정.

### Vercel Analytics 대시보드 + Web Vitals
- **발견**: Vercel Analytics는 Web Vitals(LCP/INP/CLS) 자동 수집. Speed Insights와 결합해 페이지별 성능 추적. 무료 티어 사용량 제한 확인 필요.
- **이유**: PRD N-01/N-02 LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1 검증.
- **영향**: `apps/web/app/layout.tsx`에 `<Analytics />` + `<SpeedInsights />` 컴포넌트.
- **출처**: 사전 리서치 + Vercel knowledge-update.
- **다음**: Phase 5 출시 직전 대시보드 설정.

### AI 응답 시간 SLO
- **발견**: SLO 정의 — 씬 분할 p95 ≤ 30s, 이미지 생성 p95 ≤ 30s, 인페인팅 p95 ≤ 20s, 영상 변환 p95 ≤ 120s. 위반 시 cost-monitor + 사용자 알림.
- **이유**: PRD 비기능 요구사항 + 사용자 기대 관리.
- **영향**: 각 AI 라우트에 시간 측정 + Sentry transaction. SLO 위반 알람 설정.
- **출처**: 사전 리서치.
- **다음**: Phase 4 구현 시 SLO 측정 통합.

---
