# 2026-07-06 — 61일 공백 재개: 심층 감사 · 검증된 버그 수정 · 최초 실 AI 연동

## 1. 맥락
- 마지막 커밋 2026-05-05(Loop 11W, product 68/100) 이후 61일 공백 상태에서 재개.
- 사용자 목표: 전체 심층 분석 + UI/UX 검수·개선 + 방향성 재검토 + NVIDIA NIM 키(DeepSeek V4 Pro)로 "영상 제작" 연동 + 무료 영상 API 조사.

## 2. 핵심 판단과 근거
- **DeepSeek V4 Pro는 영상 생성 모델이 아님** — build.nvidia.com 직접 확인(텍스트 LLM, MoE, 1M ctx). 사용자에게 고지 후 "어드바이저 티어 통합"으로 방향 합의. 임의 재해석 금지 원칙에 따라 AskUserQuestion으로 확정.
- **감사 방식**: 8영역 병렬 리더(35 에이전트) + high 발견 전건 적대적 검증. 검증에서 심각도 조정 다수 발생(예: "실 API 0건"은 high→medium — 문서화된 단계적 상태라 기만 아님). 표면 발견을 그대로 믿지 않는 구조가 유효했음.
- **수정 범위 통제**: 적대적 검증을 통과한 "명백한 버그"만 수정(코어 3, UI 6). 전략 결정이 필요한 항목(스키마 grant, 모놀리스 분해, 일정)은 사용자 질문으로 승격.
- **거버넌스 자가 수정 게이트**: CLAUDE.md Iron Law 개정은 auto-mode 분류기가 1차 차단 → AskUserQuestion 명시 승인 후 직접 개정. "추천 포괄 승인"과 "거버넌스 문서 수정 승인"을 구분하는 것이 옳았다.

## 3. 대안 검토
- 어드바이저 통합 위치: (a) packages/ai 어댑터 + 서버 액션 [채택 — 플랫폼 독립·키 서버 전용] vs (b) route handler vs (c) core에 내장 [기각 — core 순수성 훼손].
- 플레이헤드 좌표 수정: calc 보정 [채택 — JSX 최소 변경] vs 플레이헤드를 레인 내부로 이동 [기각 — 구조 변경 큼].
- 무료 영상 provider 1호: SiliconFlow Wan2.2 [채택 — $1 크레딧≈3회, 검증 3-0 확정, OpenAI 스타일] vs HF ZeroGPU [보류 — 쿼터 방식이 큐 계약과 안 맞음].

## 4. 검증 증거 (전부 이 세션 도구 결과)
- core 61/61 · ai 17/17 · web unit 6/6 · tsc 0 에러 · production smoke 38/38 (45.4s).
- DeepSeek 라이브: UI 버튼 → 서버 액션 로그 `requestSceneAdvice(...) in 45869ms` POST 200 → 구조화 렌더링 스크린샷.
- 플레이헤드 정렬: DOM 실측 ratio 0.4264 vs 기대 0.4257 (오차 ≈0.4px; 수정 전 최대 128px).

## 5. 남긴 부채 (다음 루프)
- 어드바이저 응답 46초 — max_tokens/스트리밍 검토.
- DB: provider_capability_versions full CRUD grant 회수(service-role 승격) — 프로덕션 전 필수.
- studio-client.tsx 2,310줄+α 모놀리스 분해 → packages/ui 실체화.
- 미디어 실체: createObjectURL + loadedmetadata 프리뷰(현재 "file-probe" 라벨은 허위 출처).
- SiliconFlow 실호출은 사용자 키 발급 후.
