# Product Insights

## 2026-05-05: export provenance can advance only when artifact proof is visible and bounded

- **발견**: Local Supabase runtime evidence가 닫힌 뒤에도 제품 관점의 export flow는 "어떤 render output을 검증했는가"를 화면에서 답하지 못했다. Manifest ids와 generated-content label만으로는 final export에 필요한 artifact-level trust가 부족했다.
- **결정**: Loop 11W는 Export inspector에 render artifact id, deterministic checksum, artifact URI, source manifest hash, local C2PA verification/policy/signature/signer를 노출한다. 이 evidence는 provider-sim/local attestation으로 한정하고, production C2PA signer나 real render output으로 주장하지 않는다.
- **영향**: Export/QC/rights/provenance는 8->9, product readiness는 67/100->68/100으로 상승한다. 100%까지는 real render file, signer-backed provenance, durable media storage, actual provider output pipeline이 필요하다.
- **검증**: Core/db focused tests, web typecheck/build, production smoke, desktop/mobile screenshots, Cantos ADR/DDR이 점수 상승의 근거다.

## 2026-05-04: media search needs useful metadata before durable storage exists

- **발견**: Browser-local import가 생겨도 Project Bin이 단순 목록이면 reference-heavy AI video workflow에서 금방 탐색성이 떨어진다. 다만 Supabase/object storage가 아직 막힌 상태에서 real thumbnail extraction이나 indexed search를 주장하면 과장이다.
- **결정**: Loop 11U는 `SourceMediaMetadata.tags`와 deterministic `thumbnailLabel`을 추가하고, Project Bin에 search/tag filter/result count를 붙인다. Imported media tags는 filename/type에서 추론하고 localStorage restore로 보존한다.
- **영향**: Media ingest/assets/search는 3->4로 상승한다. 이것은 browser-local metadata search이지 durable media library, object storage, frame thumbnail extraction, semantic Smart Search는 아니다.
- **검증**: Desktop/mobile smoke와 screenshots가 import, tag inference, search, tag filter, reload persistence를 증명한다.

## 2026-05-04: export evidence is now visible and gated, but final export is still incomplete

- **발견**: Loop 11S까지는 media ingest가 개선됐지만 export readiness는 concrete manifest evidence를 한 화면에서 검토하기 어려웠다. 제품 관점에서 "내가 무엇을 근거로 export를 막거나 허용하는가"가 약했다.
- **결정**: Loop 11T는 export manifest evidence ids, generated-content label, provenance summary를 core readiness와 Studio Export inspector에 동시에 연결했다.
- **영향**: Product readiness는 62/100에서 63/100으로 상승한다. 다만 real render artifact, C2PA attachment/signature, live Supabase runtime proof, durable media storage가 없으므로 final export product로는 아직 부족하다.
- **검증**: Core/db/web focused gates, desktop/mobile production smoke, Cantos ADR/DDR, and export evidence screenshots가 이 점수 상승의 근거다.

## 2026-05-04: media import can advance product readiness only when scoped honestly

- **발견**: AETHON의 Project Bin은 AI video IDE의 핵심이지만, seeded media tile만으로는 실제 reference workflow라고 보기 어렵다. 다만 backend storage가 없는 상태에서 import를 durable upload처럼 보이면 제품 신뢰를 해친다.
- **결정**: Loop 11S는 `browser-local import`로 명시한 metadata persistence를 먼저 제공한다. 이것은 media ingest 축을 2->3으로 올릴 수 있는 실제 사용자 상호작용이지만, thumbnails/search/cloud persistence가 없으므로 그 이상은 보류한다.
- **영향**: Product readiness는 61/100에서 62/100으로만 상승했다. 이후 export manifest evidence expansion은 Loop 11T에서 닫혔고, media tag/search는 Loop 11U에서 browser-local scope로 닫혔다. 다음 product gap은 live Supabase runtime evidence, C2PA/render artifact proof, durable media storage, 또는 real thumbnail extraction이다.
- **검증**: Desktop/mobile smoke와 screenshots가 import, selection, reload persistence를 증명한다.

## 2026-05-03: goal path is trust boundary first, NLE primitive next

- **발견**: 경쟁 제품 기준에서 AETHON은 UI skeleton을 넘어 실제 NLE command와 AI execution trust gate가 필요하다. agent wave는 provider 실행 전 신뢰 경계를 더 높은 우선순위로 봤다.
- **결정**: Loop 10A는 Server Action canonical re-read와 export missing validation blocker를 먼저 닫았다. 다음은 provider catalog/queue hardening, 그 다음 timeline split/trim/ripple/undo로 간다.
- **영향**: CapCut식 creator velocity와 Premiere식 NLE baseline은 모두 필요하지만, paid provider 호출 전에 evidence/rights/cost boundary가 먼저 잠겨야 한다.
- **검증**: `pnpm production:check` passed with 40 tests and 18 production smoke.

> 본 파일은 `product-lead` 에이전트의 발견/결정을 축적한다.
> 업데이트 규칙: CLAUDE.md "인사이트 분배 프로토콜" 참조.

## 2026-05-03: 경쟁 기준은 실제 NLE 동작과 AI 제작 속도를 동시에 요구한다

- **발견**: AETHON은 현재 skeleton 단계이며, 경쟁 기준으로 보면 실제 timeline edit primitive와 creator velocity 기능이 부족하다. Runway는 generative workflow로 중심을 옮겼고, Premiere는 professional NLE baseline, CapCut은 빠른 AI shortcut, Higgsfield는 creative intent를 구조화하는 planning layer가 강점이다.
- **이유**: 사용자가 말한 "실제 프로덕션에서 의도한 대로"를 만족하려면 UI 외형보다 편집 동작, AI decision memory, export gate, provider/rights evidence가 함께 작동해야 한다.
- **영향**: `docs/business-plan/open-source-video-editor-benchmark-2026-05-03.md`를 다음 product loop 기준 문서로 삼고, Loop 10A는 split/trim/ripple/undo 같은 실제 NLE primitive를 우선한다.
- **출처**: 경쟁 제품/OSS benchmark 작업 및 사용자 지시.
- **다음**: 오픈소스는 먼저 architecture/UX 참고 대상으로 보고, GPL 코드 직접 사용은 금지한다.

---

## 2026-04-20: 에이전트 초기 생성

- **발견**: AETHON 프로젝트 부트스트랩. Product 부서 설립.
- **이유**: Project Lead가 AETHON 23 에이전트 조직 구성 과정에서 해당 부서 신설.
- **영향**: 본 에이전트의 모든 후속 작업(PRD/스코프/성공 지표)은 이 파일에 축적된다.
- **출처**: /agent-architect 실행 (세션 2026-04-20)
- **다음**: 첫 과제 수신 대기.

## 2026-05-03: AETHON 포지셔닝을 AI-native NLE + Adviser-first로 재정렬

- **발견**: AETHON의 최신 제품 정의는 "자동 생성 도구"가 아니라 "AI 영상을 이미 만드는 창작자가 더 나은 선택을 책임 있게 하도록 돕는 AI-native NLE"다.
- **이유**: 사용자는 자동화 자체를 선호하지 않으며, AI는 놓친 리스크/대안/근거를 제안하는 도구여야 한다고 명시했다. 최종 결정과 책임은 사용자에게 남아야 한다.
- **영향**: README, PRD, VISION, ROADMAP의 핵심 문구를 `AI advises. You choose. The timeline remembers.`로 재정렬했다. MVP에는 M0 AI Control Center가 추가된다.
- **출처**: 사용자 피드백 및 `docs/business-plan/aethon-market-repo-analysis-2026-05-03.html` 보강 작업.
- **다음**: Phase 1 기능 정의에서 "자동 씬 분할" 표현을 "씬 구성 제안 + 사용자 승인" 플로우로 일괄 교체한다.

## 2026-05-03: Cantos MCP를 개발 메모리 계층으로 채택

- **발견**: AETHON은 앞으로 큰 제품/아키텍처/UI 결정과 실제 UI 이미지를 Cantos ADR/DDR에 남긴다.
- **이유**: AETHON은 제품 철학과 UX 결정이 빠르게 진화하고 있어, 코드 변경만으로는 맥락 보존이 어렵다.
- **영향**: Cantos ADR `0007-use-cantos-for-development-memory.html`, DDR `0015-ai-control-center-modes.html`, DDR `0016-initial-ai-control-center-studio-shell.html`, DDR `0017-ai-control-approval-flow-core-boundary.html` 생성. 후속 UI 구현 시 스크린샷을 DDR에 연결한다.
- **출처**: 사용자 요청 "cantos mcp를 활용하여 큰 축으로 프로젝트 변경 사항이나 ui/ux 등 실제 이미지를 넣으며..."
- **다음**: 의미 있는 UI 변경마다 Playwright/브라우저 스크린샷을 생성해 DDR visual_diff에 연결한다.

---

## 2026-04-20: 프로젝트 Why/What/How/So What 4단계 정립 (세션 1)

- **발견**: `/what` 스킬 4단계 Confirmation Loop로 AETHON의 근본 Why·구체 What·실행 How·기대 So What을 사용자 Yes 기반으로 확정.
  - **Why**: 창작자가 스토리/연출에 집중하고, 반복 프롬프트·연속성 조정은 AI가 전담. Claude Design의 고정값+인라인 편집 UX를 영상 도메인에 최초 접목.
  - **What**: MVP 4대(M1 타임라인 / M2 캐릭터 고정값 / M3 인라인 핀 재생성 / M4 이미지→영상 변환) + 데스크톱 IDE(Tauri 2.0).
  - **How**: Next.js 16 + Vercel Fluid Compute + Tauri 2.0 Turborepo 모노레포, 23 에이전트 조직, 12 Phase 순차 실행.
  - **So What**: S1 캐릭터 얼굴 일관성 ≥0.80, S2 창작 시간 70% 단축, S3 인라인 편집 ≤2.5회 수렴, S4 D+60 웹 MVP 출시.
- **이유**: 기획 초안이 방대하고 모듈 간 의존이 복잡하여, 근본 목적부터 성공 지표까지 **계약적으로 확정**하지 않으면 Phase 간 스코프 드리프트 발생 위험.
- **영향**: 전체 23 에이전트가 본 4-Frame을 최상위 계약으로 준수. 모든 PR/인사이트는 이 So What의 4개 지표(S1~S4)에 기여해야 한다.
- **출처**: 세션 1 (2026-04-20), 사용자 요청 "/what 스킬로 이해 검증 → CLAUDE.md → /agent-architect → 개발 진행".
- **다음**: Phase 0 착수 시점 사용자 결정 대기.

## 2026-04-20: MVP 스코프에 M4(영상 변환) 포함 결정

- **발견**: 초기 MVP 3대(M1~M3)에서 사용자 요청으로 **M4 이미지→영상 변환**을 MVP에 포함.
- **이유**: "영상 AI를 각 씬별로 최적 모델 선택"이 본 프로젝트의 핵심 차별화이며, 이미지 단계에서 멈추면 Runway/Kling 단독 대비 체감 가치가 낮다.
- **영향**: D+60 MVP 범위가 확장됨. Phase 4(영상 변환+Export) 필수화, `ai-video-router` 에이전트 설립. ai-video-router 인사이트 파일에 9모델 라우팅 전략 기록 필요.
- **출처**: STEP 2 Confirmation Loop에서 "MVP에 영상화도 포함" 답변.
- **다음**: Phase 4 구현 시 Runway + Kling 최소 2개 우선 연동, 나머지 7개는 점진 추가.

## 2026-04-20: 멀티 AI 모델 라우팅 = 핵심 IP로 격상

- **발견**: 사용자 피드백 반영하여 이미지 5개(FLUX+IP-Adapter / Nano Banana / Ideogram / DALL-E 3 / SDXL+ControlNet) + 영상 9개(Runway / Kling / Veo 3 / Seedance / Grok Imagine / Luma / Pika 2.5 / Hailuo / Sora 2) 멀티 모델 라우팅 시스템을 MVP 핵심 기능으로 포함.
- **이유**: "각 씬마다 잘하는 AI가 다르다"는 사용자의 핵심 통찰. Claude Sonnet이 씬 특성(duration/emotion/camera/character 비중/budget)을 분석하여 최적 모델 후보와 대체안을 추천하고, 사용자가 승인/수동 오버라이드할 수 있는 UI를 제공. 현재 시장에 없는 접근.
- **영향**:
  - `ai-consistency`, `ai-video-router` 에이전트 책임 확장.
  - Vercel AI Gateway를 통한 통합 관리 필수(폴백/비용 추적).
  - `cost-monitor` 에이전트 필수화 (14개 모델 단가 모니터링).
  - Scene 스키마에 image_model, video_model, model_auto_selected, model_selection_reason 필드 추가 확정.
  - 시장 가치 축 추가: "AI 모델 선택의 고통 해소" (9개 영상 AI를 한 툴에서 비교/선택).
- **출처**: 세션 중 사용자 피드백 "나노 바나나·Veo·Seedance·Grok 등 다양한 영상 AI 포함".
- **다음**: ai-video-router-insights.md와 ai-consistency-insights.md에 각 모델별 강·약점 매트릭스 기록 (Phase 4 착수 시).

## 2026-04-20: 데스크톱 IDE(Tauri 2.0) MVP 이후 확장 결정

- **발견**: CapCut 스타일의 데스크톱 IDE를 Phase 6~7에 추가. **Tauri 2.0 + 모노레포** 선택(Electron 대비 ~10배 경량, React 코어 95% 재사용).
- **이유**: 대용량 영상 렌더링·로컬 파일 I/O·오프라인 생성(로컬 GPU/ComfyUI) 요구가 웹만으로는 해결 불가.
- **영향**:
  - `apps/desktop/` (Tauri 셸) + `packages/adapters/{fs-web, fs-tauri, render-web, render-native}` 플랫폼 분기 레이어 추가.
  - `desktop-qa-lead` 에이전트 책임 확장 (Rust IPC, 네이티브 FFmpeg, 멀티 윈도우).
  - GitHub Actions로 Tauri 멀티 플랫폼 빌드 파이프라인 필요 → `devops-ci` 에이전트 신설.
- **출처**: 세션 중 사용자 피드백 "웹 + CapCut처럼 IDE까지 만들고 싶다".
- **다음**: Phase 6 착수 시 Tauri 2.0 + React 19 호환성 선검증 (Tauri 2.0 릴리스 상태 fact-checker 확인 필요).

## 2026-04-20: 에이전트 조직 11 → 23으로 확장

- **발견**: 초기 11 도메인 에이전트 + Evaluator 8명(fact-checker / insight-curator / ai-output-validator / prompt-linter / coherence-reviewer / cost-monitor / security-auditor / ce-reviewer) + 확장 4명(devops-ci / observability-lead / legal-compliance / storyboard-director) = **23명** 확정.
- **이유**: 사용자 요청 "더 많은 에이전트가 있어도 상관없다". 멀티 모델 라우팅으로 인해 cost-monitor·ai-output-validator 필수, AI 콘텐츠 특성상 legal-compliance 필수, 창작 품질 관점에서 storyboard-director 추가.
- **영향**: Worker:Evaluator 비율 ≈ 15:8 (1.9:1). 모든 에이전트 충돌은 `coherence-reviewer`가 해결자.
- **출처**: /agent-architect 실행 중 PHASE 2-3 확장.
- **다음**: Phase 0 이후 첫 실제 작업 시, 자동 매핑 테이블(`.claude/rules/agent-matrix.md`) 실전 검증.

## 2026-04-20: 세션 경계 — 환경 세팅만 완료, 기능 구현은 대기

- **발견**: 사용자 명시적 지시 "실제 기능 구현은 내가 지시할 때 하고, 우선 환경 세팅이 우선". 본 세션은 환경 세팅(T1~T3 + 초기 커밋)에서 종료.
- **이유**: 기능 구현 전 환경 토대가 안정적이어야 Phase 1~12 순차 실행 시 리팩토링 비용 최소화.
- **영향**:
  - apps/, packages/ 디렉토리는 **빈 스켈레톤만 존재**. pnpm 워크스페이스, Next.js 스캐폴드, Tauri 스캐폴드, Supabase 스키마, vercel.ts **미생성**.
  - 다음 세션 시작 시 Task #4(Phase 0)부터 재개.
- **출처**: 세션 1 중간 사용자 피드백.
- **다음**: 사용자가 "Phase 0 시작" 또는 "pnpm 워크스페이스 셋업" 등 명시 지시하면 Task #4 in_progress 전환.

---

## 2026-04-20: Phase 1 사전 지식 시드

### 경쟁사 포지셔닝 매트릭스
- **발견**: 2026 Q2 시점 AI 영상 시장은 (a) 단발 모델 도구(Runway/Kling/Pika/Sora 등 9+개), (b) 편집기(CapCut/Premiere/DaVinci) 두 축으로 분리되어 있고, "AI 생성 + 일관성 + 타임라인 편집"을 단일 워크플로우로 통합하는 카테고리는 비어 있다.
- **이유**: 모델 회사는 모델 품질 R&D에, 편집기 회사는 편집 워크플로우에 집중 — 메타 라우터 + 일관성 엔진 영역은 어느 쪽도 자연스러운 진입점이 아니다.
- **영향**: AETHON 포지셔닝은 "AI Video Studio"라는 신규 카테고리. PRD §0.2 차별화 4축, VISION §1.1 빈 자리.
- **출처**: 사전 리서치 + 4-Frame STEP 4 So What.
- **다음**: Phase 5 D+60 출시 직전 경쟁 매트릭스 재검증 (`fact-checker`).

### MVP 검증 방법론 (Lean Startup)
- **발견**: MVP는 "기능 완성"이 아닌 "S1~S4 측정"이 정의. 외부 유저 10명을 5분 영상 1편 제작 태스크에 투입, 시간·일관성·재시도 횟수 데이터로 검증.
- **이유**: 가설 검증 없이 Phase 6+로 진입하면 잘못된 방향에 자원 투입 위험.
- **영향**: Phase 5에 내부 사용자 3명 + 외부 10명 모집·온보딩·계측 작업 명시. `observability-lead`와 `cost-monitor`가 데이터 수집 책임.
- **출처**: 사전 리서치.
- **다음**: Phase 5 1주 전부터 한국/일본 디스코드·트위터 사전 시딩.

### NPS + 5분 영상 시간 측정 계획
- **발견**: 정성 지표(NPS 0~10)와 정량 지표(S2 시간 단축률)를 동시 측정. NPS ≥ 30이 목표(Promoter > Detractor).
- **이유**: S2(시간 단축)만 좋고 NPS가 낮으면 "쓰긴 빠른데 만족스럽지 않음"이라는 신호 — 품질 축 보강 필요.
- **영향**: Phase 5 측정 항목에 NPS 설문 추가.
- **출처**: 사전 리서치.
- **다음**: Phase 5 시작 직전 설문 폼 설계.

---

## 2026-05-03: 세션 2 — 사업 자산 인프라 구축

- **발견**: AETHON 문서를 "개발 지침"에서 "사업 자산"으로 격상. Group A 5건(PRD/VISION/ROADMAP 신규 + 플랜 보강 + 16 인사이트 시드) + Group B 1건(IR 18섹션 HTML 사업계획서) 완성.
- **이유**: D+60 MVP를 향한 시점에서 (a) 23 에이전트가 큰 그림을 공유하는 작업 컨텍스트와 (b) 투자자/파트너용 외부 자료가 동시에 필요. /what 4-Frame으로 이중 가치(내부 정렬 + 외부 노출) 확정.
- **영향**:
  - PRD 414줄 (6 페르소나 + M1~M4 사용자스토리/AC + 30 수용기준 + 15 OOS)
  - VISION 233줄 (3시간축×4차원 12셀 + 5 확장 시나리오 + 5 피벗 트리거 + 4 원칙)
  - ROADMAP 597줄 (12 Phase 상세 + Top 5 Risk Register + Mermaid 의존 그래프)
  - 16 인사이트 파일 모두 "Phase 1 사전 지식 시드" 섹션 추가 (~50 시드 항목)
  - business-plan/index.html 2167줄 18 섹션 (Hero/Problem/Solution/Differentiation/Why Now/Demo/Tech/Market/Competitive/Business Model/Roadmap/Financial/KPI/Use of Funds/Risk/PSF Matrix/Team/Contact)
- **출처**: 세션 2 (2026-05-03), /what 스킬 4단계 + Agent 2회 위임(Group A → Group B).
- **다음**: 외부 IR 발표 시 fact-checker가 시장 데이터(TAM/SAM/SOM/점유율) 검증. 인재 합류 시 Team 섹션 23 에이전트 → 실제 인물 단계적 교체.

## 2026-05-03: PSF(Problem-Solution Fit) 매트릭스 도입

- **발견**: 사업계획서 Section 16에 4×4 Problem-Solution 매핑 매트릭스 채택. 4 Problem(27회 재입력 / 일관성 깨짐 / 8h 모델 비교 / 시간축 부재)이 4 Solution(M1~M4)에 모두 1+ 직접 연결됨을 명시.
- **이유**: "그래서 이게 뭘 해결하는데?"라는 IR 질문에 60초 안에 답해야 한다는 사용자 요구. 단절된 Problem이 없어야 PMF 정합성 확보.
- **영향**: PRD/VISION/ROADMAP의 모든 후속 의사결정은 PSF 매트릭스 4개 Problem과의 연결성을 설명할 수 있어야 한다. Phase 5 외부 사용자 검증 시에도 이 4 Problem 기준으로 인터뷰 설계.
- **출처**: 세션 2 STEP 4 So What 강화 + 사용자 피드백.
- **다음**: Phase 5 시작 시 4 Problem별 정량 검증 지표 정의(예: "27회 재입력 → AETHON 사용 시 평균 N회로 감소").

## 2026-05-03: docs/business-plan/ 디렉토리 신설 — 외부 공유 자산 위치 확정

- **발견**: IR/투자자/파트너용 외부 공유 자료의 표준 위치를 `docs/business-plan/`으로 확정. 단일 HTML 파일 + assets + README 구조.
- **이유**: 외부 자료를 별도 디렉토리에 격리하면 (a) 내부 개발 문서와 톤 분리, (b) 향후 분기별 갱신·버전 관리 단순화, (c) 외부 공유 시 해당 디렉토리만 ZIP/PDF 묶음 가능.
- **영향**: Phase 5 D+60 MVP 출시 직전, business-plan/index.html의 KPI Dashboard·Roadmap·Team 섹션 갱신이 출시 체크리스트에 포함되어야 함.
- **출처**: 세션 2 What 단계.
- **다음**: 분기별 갱신 룰 추가 (`product-lead`가 분기 마감 시 KPI 데이터 동기화).

---
