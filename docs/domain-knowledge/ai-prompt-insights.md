# AI Prompt Insights

> 본 파일은 `ai-prompt-engineer` 에이전트의 발견/결정을 축적한다.
> 업데이트 규칙: CLAUDE.md "인사이트 분배 프로토콜" 참조.

## 2026-04-20: 에이전트 초기 생성

- **발견**: AETHON 프로젝트 부트스트랩. AI Prompt Engineer 신설.
- **이유**: Claude Sonnet 4.6 + Prompt Caching, 씬 구성 제안(30씬 후보), 프롬프트 후보 합성(7요소) 전담.
- **영향**: 캐시 경계, 씬 분할 JSON 스키마, 7요소 합성 템플릿 결정이 여기 축적된다.
- **출처**: /agent-architect 실행 (세션 2026-04-20)
- **다음**: 첫 과제 수신 대기.

---

## 2026-05-03: 씬 분할과 프롬프트 합성은 후보 제안으로 표현한다

- **발견**: 스크립트/기획표 입력 후 AI가 바로 타임라인을 확정하는 UX보다, 25~35개 씬 후보를 생성하고 사용자가 합치기/삭제/순서 변경을 승인하는 UX가 AETHON 철학과 맞다.
- **이유**: 사용자는 AI가 미처 생각하지 못한 컷과 누락 리스크를 알려주길 원하지만, 편집 결정의 책임은 본인이 가져가길 원한다.
- **영향**: `suggestScenesAction`은 `Scene[]` 확정값보다 `SceneSuggestion[]` + `approvalStatus` + `reasoning` 구조가 필요하다. 프롬프트도 실행용 단일 문자열보다 이미지 프롬프트/영상 프롬프트 후보와 대체안을 분리한다.
- **출처**: 사용자 피드백(2026-05-03) 및 PRD 1.1.
- **다음**: Prompt JSON 스키마에 `confidence`, `missingInfo`, `alternatives` 필드 추가 검토.

---

## 2026-04-20: Phase 1 사전 지식 시드

### Claude Sonnet 4.6 Prompt Caching — 비용 절감
- **발견**: Sonnet 4.6 Prompt Caching은 시스템 프롬프트 + 캐릭터/배경/세계관 고정값을 캐시 토큰으로 보관. 캐시 히트 시 입력 토큰 단가 ~10% (확신도: [추정] 공식 가격표 fact-checker 검증 필요).
- **이유**: 30 씬 분할 시 동일 시스템 프롬프트 + 동일 프로젝트 컨텍스트 반복 → 캐시로 비용 -90% 추정.
- **영향**: `packages/ai/claude/`에 `cache_control: 'ephemeral'` 필드 표준 적용. 시스템 프롬프트 + 프로젝트 메타가 캐시 경계.
- **출처**: 사전 리서치 [추정].
- **다음**: Phase 1 첫 호출 시 캐시 히트율 측정.

### 7요소 프롬프트 합성
- **발견**: 프롬프트 후보는 7요소 합성: (1) art_style + mood_palette, (2) characters_in_scene 외형, (3) background, (4) camera_angle, (5) emotion, (6) user_intent, (7) negative_prompt. JSON 템플릿 + 슬롯 채우기.
- **이유**: 사용자가 user_intent("주인공이 검을 뽑는 장면")만 입력해도 나머지 6요소가 자동 합성.
- **영향**: `packages/core/prompt-engine/compose.ts`에 7-slot 템플릿. PRD M2 자동 프롬프트 합성 핵심.
- **출처**: 4-Frame STEP 2.
- **다음**: Phase 1 합성 엔진 구현.

### 씬 분할 알고리즘 — 30개 ±5 목표
- **발견**: 5분 영상 = 평균 30 씬(씬당 10초). 1000자 스크립트는 25~35 씬 권장. Claude Sonnet 출력은 JSON 강제 + Zod 검증.
- **이유**: 너무 많으면 사용자 부담, 너무 적으면 영상 단조. 사용자가 추가/삭제로 미세 조정 가능.
- **영향**: 분할 프롬프트에 "25-35 scenes" 명시 + 출력 검증 후 부족하면 1회 재시도.
- **출처**: 사전 리서치.
- **다음**: Phase 1 PoC + 분할 품질 평가.

---
