# Frontend Design Insights

> 본 파일은 `fe-design` 에이전트의 발견/결정을 축적한다.
> 업데이트 규칙: CLAUDE.md "인사이트 분배 프로토콜" 참조.

## 2026-04-20: 에이전트 초기 생성

- **발견**: AETHON 프로젝트 부트스트랩. Design Worker 신설.
- **이유**: Claude Design 스타일·Tailwind v4 토큰·shadcn/ui·Storybook 전담.
- **영향**: 디자인 토큰 단일 소스 원칙, 테마, 접근성(WCAG 2.2 AA) 결정이 여기 축적된다.
- **출처**: /agent-architect 실행 (세션 2026-04-20)
- **다음**: 첫 과제 수신 대기.

---

## 2026-05-03: AI Control Center는 Adviser Mode를 기본값으로 둔다

- **발견**: AETHON의 AI 제어 UX는 전역 모드와 작업별 상세 모드를 분리한다. 기본값은 Adviser Mode이며, 사용자는 Auto / Adviser / Off를 작업별로 조정한다.
- **이유**: 숙련 창작자는 AI가 자동으로 실행하는 것보다 추천 이유, 비용, 품질 리스크, 권리 리스크를 본 뒤 직접 선택하길 원한다.
- **영향**: 첫 웹 스튜디오 화면에 `AI Control Center`, task-level mode list, AI suggestion card를 포함했다. 디자인 시스템에서는 실행 버튼과 제안 카드를 명확히 분리해야 한다.
- **출처**: 사용자 피드백 및 Cantos DDR `0015-ai-control-center-modes.html`.
- **다음**: 실제 브라우저 스크린샷을 생성해 DDR visual_diff에 첨부하고, Auto 실행 버튼에는 비용/외부 전송 여부를 항상 표시한다.

---

## 2026-04-20: Phase 1 사전 지식 시드

### Claude Design 토큰 시스템
- **발견**: Claude Design의 핵심 토큰은 (a) 고정값 카드(캐릭터·배경·그림체), (b) 인라인 편집(영역 + 코멘트). 영상 도메인에 동일 패턴 적용.
- **이유**: 사용자가 다른 Anthropic 제품과 동일 멘탈 모델로 진입. 학습 비용 최소화.
- **영향**: 캐릭터 카드 컴포넌트는 Claude Project 카드와 동일 spacing/radius/typography. shadcn/ui 위에 토큰 레이어.
- **출처**: 사전 리서치 + 4-Frame.
- **다음**: Phase 2 카드 UI 시 디자인 토큰 라이브러리 정착.

### Tailwind v4 변경점 (확신도: [추정] 검증 필요)
- **발견**: Tailwind v4는 CSS-first 설정(`@theme`), Lightning CSS 기반 빌드. v3 대비 빠르고 콘텐츠 토큰화 친화. Next.js 16과 호환 — fact-checker 검증 필요.
- **이유**: 기존 v3 패턴(tailwind.config.js)에서 변경. 잘못 도입 시 빌드 깨짐.
- **영향**: Phase 0 인프라 셋업 시 v4로 시작할지 v3 유지할지 결정 필요.
- **출처**: 사전 리서치 [추정].
- **다음**: fact-checker로 Tailwind 4 + Next.js 16 + shadcn/ui 호환성 검증.

### 다크 모드 토큰 + 시네마틱 무드
- **발견**: AETHON은 영상 작업 도구 — 어두운 환경에서 색감 정확 판단 필요. 다크 모드 기본, 라이트 모드는 옵션.
- **이유**: 영상 색감은 주변 광량에 영향. 다크 모드가 영화/방송 산업 표준.
- **영향**: 디자인 토큰 다크 우선 + 라이트 fallback. Tailwind `dark:` prefix 일관 사용.
- **출처**: 사전 리서치.
- **다음**: Phase 1 착수 시 토큰 라이브러리 다크 우선 설계.

---

## 2026-04-20: Phase 1 사전 지식 시드

### Claude Design 토큰 시스템
- **발견**: Claude Design의 핵심 토큰은 (a) 고정값 카드(캐릭터·배경·그림체), (b) 인라인 편집(영역 + 코멘트). 영상 도메인에 동일 패턴 적용.
- **이유**: 사용자가 다른 Anthropic 제품과 동일 멘탈 모델로 진입. 학습 비용 최소화.
- **영향**: 캐릭터 카드 컴포넌트는 Claude Project 카드와 동일 spacing/radius/typography. shadcn/ui 위에 토큰 레이어.
- **출처**: 사전 리서치 + 4-Frame.
- **다음**: Phase 2 카드 UI 시 디자인 토큰 라이브러리 정착.

### Tailwind v4 변경점 (확신도: [추정] 검증 필요)
- **발견**: Tailwind v4는 CSS-first 설정(`@theme`), Lightning CSS 기반 빌드. v3 대비 빠르고 콘텐츠 토큰화 친화. Next.js 16과 호환 — fact-checker 검증 필요.
- **이유**: 기존 v3 패턴(tailwind.config.js)에서 변경. 잘못 도입 시 빌드 깨짐.
- **영향**: Phase 0 인프라 셋업 시 v4로 시작할지 v3 유지할지 결정 필요.
- **출처**: 사전 리서치 [추정].
- **다음**: fact-checker로 Tailwind 4 + Next.js 16 + shadcn/ui 호환성 검증.

### 다크 모드 토큰 + 시네마틱 무드
- **발견**: AETHON은 영상 작업 도구 — 어두운 환경에서 색감 정확 판단 필요. 다크 모드 기본, 라이트 모드는 옵션.
- **이유**: 영상 색감은 주변 광량에 영향. 다크 모드가 영화/방송 산업 표준.
- **영향**: 디자인 토큰 다크 우선 + 라이트 fallback. Tailwind `dark:` prefix 일관 사용.
- **출처**: 사전 리서치.
- **다음**: Phase 1 착수 시 토큰 라이브러리 다크 우선 설계.

---
