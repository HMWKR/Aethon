# AI Consistency Insights

## 2026-05-03: generated clips require validation evidence before export

- **발견**: generated-video scene에 validation report가 없으면 실제 품질 확인 없이 export가 열릴 수 있다.
- **결정**: generated-video scene id 목록을 export readiness에 넘기고, report missing을 blocker로 처리한다.
- **영향**: 이후 S1 캐릭터 일관성, identity similarity, hand anatomy, temporal flicker 같은 QC는 report 존재뿐 아니라 typed metric schema로 올라가야 한다.
- **검증**: core missing-report test 추가, production smoke 18 passed.
- **다음**: `ValidationCheck`에 metric kind/operator/unit/confidence/frameRange/artifactAssetId를 추가한다.

> 본 파일은 `ai-consistency` 에이전트의 발견/결정을 축적한다.
> 업데이트 규칙: CLAUDE.md "인사이트 분배 프로토콜" 참조.

## 2026-04-20: 에이전트 초기 생성

- **발견**: AETHON 프로젝트 부트스트랩. AI Consistency Engineer 신설.
- **이유**: IP-Adapter·고정값 주입·FLUX Fill·이미지 5모델 라우팅(FLUX/Nano Banana/Ideogram/DALL-E 3/SDXL+ControlNet) 전담.
- **영향**: S1 지표(얼굴 코사인 유사도 ≥0.80) 달성 기반, 모델별 특성 매트릭스 결정이 여기 축적된다.
- **출처**: /agent-architect 실행 (세션 2026-04-20)
- **다음**: 첫 과제 수신 대기.

---

## 2026-05-03: 일관성 엔진은 점수는 자동, 재생성은 승인 중심

- **발견**: 캐릭터/브랜드 일관성 점수 계산은 저위험 자동 검사로 둘 수 있지만, 이미지 재생성·인페인팅·레퍼런스 강도 변경은 기본적으로 사용자 승인 후 실행해야 한다.
- **이유**: 부분수정은 창작 의도와 비용이 직접 얽히므로 AI가 마음대로 바꾸면 신뢰가 깨진다. 점수와 리스크를 먼저 보여주는 것이 숙련 창작자에게 더 유용하다.
- **영향**: 인라인 핀 UX는 "바로 재생성"보다 "수정 후보/영향 영역/비용/원본 보존"을 먼저 표시한다. Auto Mode는 사용자가 낮은 일관성 점수 재시도를 명시 허용한 경우에만 사용한다.
- **출처**: 사용자 피드백(2026-05-03) 및 AI Control Center DDR.
- **다음**: `inpaint_pins`에 `suggestion_id`, `approved_by`, `before_asset_id`, `after_asset_id` 연결 검토.

---

## 2026-04-20: Phase 1 사전 지식 시드

### 5개 이미지 모델 강·약점 매트릭스
- **발견**: 시장 추정치 — FLUX+IP-Adapter(일관성 최강, 속도 중간) / Nano Banana(고속 고품질, 일관성 중간) / Ideogram(텍스트 정확) / DALL-E 3(프롬프트 이해 최강, 편집 약함) / SDXL+ControlNet(구도 제어 정밀). 단가/응답시간은 fact-checker 정기 갱신 대상.
- **이유**: 씬마다 잘하는 AI가 다르다는 핵심 통찰. 라우팅 규칙의 근거 데이터.
- **영향**: `packages/ai/router/select-image-model.ts`의 입력 변수 = (has_text, character_density, complexity, budget_priority, speed_priority).
- **출처**: 사전 리서치 [추정] — fact-checker 검증 필요.
- **다음**: Phase 2 시작 시 5개 모델 PoC 호출 + 응답 시간 측정.

### IP-Adapter 가중치 튜닝 (0.6~0.8)
- **발견**: IP-Adapter weight 0.6은 다양성·약한 일관성, 0.8은 강한 일관성·낮은 다양성. 권장 시작점 0.7. 캐릭터 클로즈업은 0.8, 와이드샷은 0.6.
- **이유**: S1 ≥ 0.80 달성 + 다양한 씬 표현 동시 충족.
- **영향**: 카메라 앵글에 따라 가중치 자동 조정 룰. PRD AC-M2-1.
- **출처**: 사전 리서치.
- **다음**: Phase 2 A/B 테스트로 최적값 탐색.

### FLUX Fill vs Nano Banana Edit 비교
- **발견**: FLUX Fill은 마스크 영역만 정확 재생성, 영역 경계 자연스러움 우수. Nano Banana Edit는 자연어 편집("이 부분을 푸른색으로") 강점, 영역 외 영향 가능.
- **이유**: 인라인 핀(M3)에서 두 모델 trade-off. 정밀한 마스크 → FLUX Fill, 자연어 편집 → Nano Banana Edit.
- **영향**: 사용자가 영역만 그렸으면 FLUX Fill, 영역 + 댓글이 "자연어 편집형"이면 Nano Banana Edit를 추천 후보로 제시한다.
- **출처**: 사전 리서치.
- **다음**: Phase 3 두 모델 호출 + 결과 비교 측정.

### S1 측정 스크립트 — 코사인 유사도
- **발견**: 동일 캐릭터 10 씬 → 각 이미지 임베딩(예: CLIP/ArcFace) → 평균 코사인 유사도. 0.80 = 사람이 "같은 캐릭터"로 인식하는 임계.
- **이유**: PRD S1 정량 지표.
- **영향**: `scripts/measure-consistency.ts`에 임베딩 모델 + 임계 정의.
- **출처**: 사전 리서치.
- **다음**: Phase 2 측정 스크립트 작성.

---

## 2026-04-20: Phase 1 사전 지식 시드

### 5개 이미지 모델 강·약점 매트릭스
- **발견**: 시장 추정치 — FLUX+IP-Adapter(일관성 최강, 속도 중간) / Nano Banana(고속 고품질, 일관성 중간) / Ideogram(텍스트 정확) / DALL-E 3(프롬프트 이해 최강, 편집 약함) / SDXL+ControlNet(구도 제어 정밀). 단가/응답시간은 fact-checker 정기 갱신 대상.
- **이유**: 씬마다 잘하는 AI가 다르다는 핵심 통찰. 라우팅 규칙의 근거 데이터.
- **영향**: `packages/ai/router/select-image-model.ts`의 입력 변수 = (has_text, character_density, complexity, budget_priority, speed_priority).
- **출처**: 사전 리서치 [추정] — fact-checker 검증 필요.
- **다음**: Phase 2 시작 시 5개 모델 PoC 호출 + 응답 시간 측정.

### IP-Adapter 가중치 튜닝 (0.6~0.8)
- **발견**: IP-Adapter weight 0.6은 다양성·약한 일관성, 0.8은 강한 일관성·낮은 다양성. 권장 시작점 0.7. 캐릭터 클로즈업은 0.8, 와이드샷은 0.6.
- **이유**: S1 ≥ 0.80 달성 + 다양한 씬 표현 동시 충족.
- **영향**: 카메라 앵글에 따라 가중치 자동 조정 룰. PRD AC-M2-1.
- **출처**: 사전 리서치.
- **다음**: Phase 2 A/B 테스트로 최적값 탐색.

### FLUX Fill vs Nano Banana Edit 비교
- **발견**: FLUX Fill은 마스크 영역만 정확 재생성, 영역 경계 자연스러움 우수. Nano Banana Edit는 자연어 편집("이 부분을 푸른색으로") 강점, 영역 외 영향 가능.
- **이유**: 인라인 핀(M3)에서 두 모델 trade-off. 정밀한 마스크 → FLUX Fill, 자연어 편집 → Nano Banana Edit.
- **영향**: 사용자가 영역만 그렸으면 FLUX Fill, 영역 + 댓글이 "자연어 편집형"이면 Nano Banana Edit를 추천 후보로 제시한다.
- **출처**: 사전 리서치.
- **다음**: Phase 3 두 모델 호출 + 결과 비교 측정.

### S1 측정 스크립트 — 코사인 유사도
- **발견**: 동일 캐릭터 10 씬 → 각 이미지 임베딩(예: CLIP/ArcFace) → 평균 코사인 유사도. 0.80 = 사람이 "같은 캐릭터"로 인식하는 임계.
- **이유**: PRD S1 정량 지표.
- **영향**: `scripts/measure-consistency.ts`에 임베딩 모델 + 임계 정의.
- **출처**: 사전 리서치.
- **다음**: Phase 2 측정 스크립트 작성.

---
