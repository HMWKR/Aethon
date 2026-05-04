# AI Video Router Insights

## 2026-05-04: provider catalog queue gate is now exact-key and freshness based

- **발견**: `provider` 이름이나 `model` 문자열을 느슨하게 포함 비교하면 Runway/Seedance, Kling/Kuaishou 같은 조합에서 잘못된 provider가 queue될 수 있다.
- **결정**: `ProviderCapability`에 `providerKey`, `modelKey`, `status`, `sourceUrl`, `verificationTtlDays`, `termsRisk`를 추가하고, queue는 `providerKey + modelKey` exact match와 active/fresh/commercial guard를 통과해야 한다.
- **영향**: AI adviser가 추천 카드를 만들 수는 있지만, 실제 `generation_runs` 생성은 검증된 catalog snapshot 없이는 차단된다. 이는 사용자가 선택 책임을 유지하되 잘못된 provider/model 호출을 시스템이 방지하는 방향과 맞다.
- **출처**: Loop 10B provider catalog + queue contract hardening.
- **검증**: `pnpm production:check` 통과. Core provider catalog tests 21 passed.
- **다음**: 9개 영상 provider 전체를 source URL, terms URL, pricing version, TTL, region, deprecated/sunset 필드까지 실제 최신 근거로 확장해야 한다.

## 2026-05-03: provider/model matching must become exact and versioned before live routing

- **발견**: 현재 provider registry는 일부 provider만 있고, loose substring matching으로 provider/model mismatch가 잘못 통과할 수 있다.
- **결정**: 다음 router loop에서는 provider catalog를 versioned data로 분리하고 `providerKey + modelKey` exact match를 사용한다.
- **영향**: Runway/Kling/Veo/Seedance/Grok/Luma/Pika/Hailuo/Sora의 terms, pricing, deprecated/sunset, `lastVerifiedAt`이 queue gate 입력이 되어야 한다.
- **검증**: 이번 루프에서는 live provider 호출 없이 server trust/export evidence gate만 보강했다.
- **다음**: queue insert 전 SceneSpec + ProviderCapability + cost/rights/region validation을 필수화한다.

> 본 파일은 `ai-video-router` 에이전트의 발견/결정을 축적한다.
> 업데이트 규칙: CLAUDE.md "인사이트 분배 프로토콜" 참조.

## 2026-04-20: 에이전트 초기 생성

- **발견**: AETHON 프로젝트 부트스트랩. AI Video Router 신설.
- **이유**: 영상 9모델(Runway/Kling/Veo 3/Seedance/Grok/Luma/Pika 2.5/Hailuo/Sora 2) 라우팅·FFmpeg Export 전담.
- **영향**: 씬 특성→모델 매핑 규칙, 모델별 응답시간/비용/품질 매트릭스, 웹/데스크톱 Export 분기 결정이 여기 축적된다.
- **출처**: /agent-architect 실행 (세션 2026-04-20)
- **다음**: 첫 과제 수신 대기.

---

## 2026-05-03: 영상 모델 라우팅은 기본적으로 추천 카드다

- **발견**: AETHON의 영상 모델 선택은 기본적으로 자동 선택이 아니라 Adviser Mode 추천 카드다. 라우터는 1순위 모델, 대체 모델 2개 이상, 비용, 예상 품질, 권리/외부 전송 리스크를 산출하고 사용자가 승인해야 실행된다.
- **이유**: AI 영상을 이미 만들어 본 창작자는 모델 선택권을 잃는 것을 싫어한다. AETHON의 차별점은 대신 결정하는 것이 아니라 사용자가 놓친 선택지를 보이게 하는 것이다.
- **영향**: `select-model.ts`는 `selectedModel` 단일 반환보다 `recommendations[]`, `reason`, `costEstimate`, `riskFlags`, `requiresApproval` 구조가 적합하다. Auto Mode는 사용자가 작업별로 명시 허용한 경우에만 실행된다.
- **출처**: 사용자 피드백(2026-05-03) 및 PRD 1.1.
- **다음**: Phase 4 구현 전 추천 카드 타입과 `ai_suggestions` 저장 계약 확정.

---

## 2026-04-20: Phase 1 사전 지식 시드

### 9개 영상 모델 강·약점/가격/응답시간 표 (시장 추정 — fact-checker 검증 대상)
- **발견**: 추정 매트릭스:
  - **Runway Gen-3 Alpha**: 시네마틱 우수, 5초 제한, 비쌈. 영화적 전환 씬.
  - **Kling 2.0**: 최대 10초, 디테일 높음, 인물 모션 어색 가능. 풍경/배경.
  - **Veo 3**: 오디오 동시, 롱폼 60s+, 접근 제한. 롱 테이크 대사.
  - **Seedance**: 빠르고 저렴, 품질 편차. 대량 초안/폴백.
  - **Grok Imagine**: 독특한 스타일화, 일관성 약함. 아티스틱.
  - **Luma Dream Machine**: 카메라 무브 부드러움, 짧음. 드리프트/팬닝.
  - **Pika 2.5**: 캐릭터 일관성 강함. 캐릭터 클로즈업.
  - **Hailuo MiniMax**: 감정 표현 우수, 아시아 스타일 편향. 감정 고조 씬.
  - **Sora 2**: 최고 품질, 비싸고 대기 김. 하이라이트.
- **이유**: 씬 특성 → 모델 매핑의 데이터 근거.
- **영향**: `packages/ai/router/select-video-model.ts` 의사결정 트리. 단가/응답시간은 fact-checker 분기별 갱신.
- **출처**: 사전 리서치 [추정].
- **다음**: Phase 4 시작 전 fact-checker 매트릭스 갱신.

### 추천 라우팅 트리 (Decision Tree)
- **발견**: 우선순위 순서 — (1) duration > 10s + 오디오 → veo3, 오디오 없음 → kling. (2) emotion=battle 또는 camera=action → runway. (3) shot_type=close-up + 캐릭터 1+ → pika. (4) camera_movement=panning/drift → luma. (5) budget_priority=low → seedance. (6) is_highlight → sora2. (7) 기본값 → runway.
- **이유**: 결정 트리 형태가 가장 명확하고 사용자 설명("AI 추천 이유" 툴팁)에 적합.
- **영향**: `model_selection_reason` 필드에 트리 분기 이유 자연어로 저장.
- **출처**: 4-Frame + 사전 리서치.
- **다음**: Phase 4 구현 시 트리 분기 결과를 단위 테스트.

### 재시도 + 폴백 정책
- **발견**: API 오류 4xx → 사용자 알림 + 정지. 5xx → 자동 재시도 1회. 두 번 실패 → 폴백 모델(Seedance 기본). 폴백 사용 시 사용자에게 알림 + model_selection_reason 갱신.
- **이유**: 다중 모델 의존 환경에서 단일 장애에도 작업 진행.
- **영향**: PRD AC-M4-5. cost-monitor와 협업해 폴백 비용 추적.
- **출처**: 사전 리서치.
- **다음**: Phase 4 구현 시 정책 단위 테스트.

---

## 2026-04-20: Phase 1 사전 지식 시드

### 9개 영상 모델 강·약점/가격/응답시간 표 (시장 추정 — fact-checker 검증 대상)
- **발견**: 추정 매트릭스:
  - **Runway Gen-3 Alpha**: 시네마틱 우수, 5초 제한, 비쌈. 영화적 전환 씬.
  - **Kling 2.0**: 최대 10초, 디테일 높음, 인물 모션 어색 가능. 풍경/배경.
  - **Veo 3**: 오디오 동시, 롱폼 60s+, 접근 제한. 롱 테이크 대사.
  - **Seedance**: 빠르고 저렴, 품질 편차. 대량 초안/폴백.
  - **Grok Imagine**: 독특한 스타일화, 일관성 약함. 아티스틱.
  - **Luma Dream Machine**: 카메라 무브 부드러움, 짧음. 드리프트/팬닝.
  - **Pika 2.5**: 캐릭터 일관성 강함. 캐릭터 클로즈업.
  - **Hailuo MiniMax**: 감정 표현 우수, 아시아 스타일 편향. 감정 고조 씬.
  - **Sora 2**: 최고 품질, 비싸고 대기 김. 하이라이트.
- **이유**: 씬 특성 → 모델 매핑의 데이터 근거.
- **영향**: `packages/ai/router/select-video-model.ts` 의사결정 트리. 단가/응답시간은 fact-checker 분기별 갱신.
- **출처**: 사전 리서치 [추정].
- **다음**: Phase 4 시작 전 fact-checker 매트릭스 갱신.

### 추천 라우팅 트리 (Decision Tree)
- **발견**: 우선순위 순서 — (1) duration > 10s + 오디오 → veo3, 오디오 없음 → kling. (2) emotion=battle 또는 camera=action → runway. (3) shot_type=close-up + 캐릭터 1+ → pika. (4) camera_movement=panning/drift → luma. (5) budget_priority=low → seedance. (6) is_highlight → sora2. (7) 기본값 → runway.
- **이유**: 결정 트리 형태가 가장 명확하고 사용자 설명("AI 추천 이유" 툴팁)에 적합.
- **영향**: `model_selection_reason` 필드에 트리 분기 이유 자연어로 저장.
- **출처**: 4-Frame + 사전 리서치.
- **다음**: Phase 4 구현 시 트리 분기 결과를 단위 테스트.

### 재시도 + 폴백 정책
- **발견**: API 오류 4xx → 사용자 알림 + 정지. 5xx → 자동 재시도 1회. 두 번 실패 → 폴백 모델(Seedance 기본). 폴백 사용 시 사용자에게 알림 + model_selection_reason 갱신.
- **이유**: 다중 모델 의존 환경에서 단일 장애에도 작업 진행.
- **영향**: PRD AC-M4-5. cost-monitor와 협업해 폴백 비용 추적.
- **출처**: 사전 리서치.
- **다음**: Phase 4 구현 시 정책 단위 테스트.

---
