# AETHON — Claude Code 프로젝트 지침

> **AI-native Video Editing Studio** — AI가 선택지를 제안하고, 사용자가 결정하며, 타임라인이 그 근거를 기억하는 편집 표준.
> 모든 에이전트/작업은 본 문서를 최상위 계약으로 따른다. 상세 플랜: `.claude/plans/ai-typed-dusk.md`

---

## ⚠️ Iron Law — 하드 차단 규칙 (재량 없음)

> 아래는 PreToolUse/Stop 훅으로 **exit 2 차단**된다. 하위 모든 "기본값"/"권장" 표현보다 **우선**한다.

### 1. Agent 위임 필수
`Edit`/`Write` 호출 전 직전 30분 내 `Agent` 도구 호출 기록이 있어야 한다. 없으면 PreToolUse 훅이 차단한다.

**예외 경로 (allowlist)** — Agent 선행 호출 없이 직접 편집 허용:
- `docs/domain-knowledge/`
- `agents/`
- `.claude/plans/`
- `.claude/agents/`
- `.claude/rules/`
- `.claude/scripts/`
- `.claude/settings*`
- `.claude/CLAUDE.md`
- `.thoughts/`
- `MEMORY.md`
- `memory/`

**우회 불가**: 프로덕션 코드(`apps/`, `packages/`), 테스트, 위 allowlist 외 문서 편집은 반드시 Agent 선행 호출.

### 2. 인사이트 기록 필수
최근 2시간 내 커밋이 있으면 `docs/domain-knowledge/*-insights.md` 중 하나라도 커밋 이후 갱신되어야 한다. 아니면 Stop 훅이 세션 종료를 차단한다.

**우회**: `FORCE_STOP=1` 환경변수 (의도적 스킵만 허용).

### 3. 우선순위
본 Iron Law는 **훅 레벨 강제**다. 이하 "기본값"·"자동 매핑"·"자동 축적" 표현은 권장이지만, 상충 시 Iron Law 우선.

**훅 구현**: `~/.claude/scripts/check-agent-delegation.sh` · `~/.claude/scripts/validate-insights.sh` · `~/.claude/scripts/record-agent-call.sh`

---

## 프로젝트 개요

AETHON은 AI 영상을 이미 만들어 본 창작자가 기획표, 레퍼런스, 모델 선택, 생성 결과, 부분수정, 최종 편집을 한 프로젝트 타임라인에서 책임 있게 관리하는 AI-native NLE다. AI는 자동 실행자가 아니라 더 나은 선택지, 놓친 리스크, 비용/권리/품질 근거를 제안하는 도구이며 최종 결정은 사용자가 한다. 기존 AI 영상 툴(Runway Gen-3, Kling, Sora 등)이 **단발 장면 생성**에 집중해 장면 간 일관성과 편집 맥락이 끊기는 문제를 해결한다.

**제공 형태**:
- **웹앱** — Next.js 16 + Vercel Fluid Compute 기반 MVP
- **데스크톱 IDE** — CapCut 스타일의 Tauri 2.0 네이티브 앱 (React 코어 95% 재사용)

**목표 일정**: D+60 웹 MVP / D+75 데스크톱 / D+160 Post-MVP 완성.

---

## CE (Context Engineering) v2.0 원칙

- **적정 고도(Right Altitude)**: 너무 추상적이지도, 너무 구체적이지도 않은 수준으로 지시 작성.
- **토큰 위치(Token Position)**: 중요 지시일수록 문서 상단 배치. 본 CLAUDE.md는 Iron Law를 최상단에 배치한다.
- **신호 대 잡음비**: 모든 토큰이 행동 변화에 기여해야 한다. 중복·장식적 문구 제거.
- **4대 실패 모드 방지**:
  - Poisoning(오염): 잘못된 정보가 컨텍스트에 유입
  - Distraction(산만): 무관한 정보가 주의를 분산
  - Confusion(혼동): 모순되는 지시가 병존
  - Clash(충돌): 시스템 프롬프트와 사용자 지시가 상충
- **Progressive Disclosure**: 상세 내용은 `.claude/plans/`, `docs/domain-knowledge/`, `agents/`, `.claude/agents/` 호환 경로로 분리. 본 문서는 포인터와 계약만 유지.

---

## 언어

- 모든 출력은 **한국어**(기술문서 스타일, 명확·간결·구조적).
- 커밋 메시지, 코드 주석, 에이전트 정의 전부 한국어.
- 예외: README.md, 외부 공개 문서, 국제 라이브러리 연동 코드는 영어 허용.

---

## 기술 스택 (확정)

| 레이어 | 선택 | 근거 |
|---|---|---|
| 프레임워크 | Next.js 16 App Router + React 19 | Cache Components(PPR), Server Actions 스트리밍 |
| 런타임 | Vercel Fluid Compute (Node.js 24 LTS) | 300s 타임아웃, Edge Functions 비권장 |
| 데스크톱 | Tauri 2.0 + Rust | 경량(~10MB), 네이티브 렌더링, React 코드 95% 재사용 |
| 모노레포 | Turborepo + pnpm | 공유 패키지 관리, 병렬 빌드 |
| AI 텍스트 | Claude Sonnet 4.6 + Prompt Caching | 씬 구성 제안, 프롬프트 후보, 모델 추천 판단 |
| AI Gateway | Vercel AI Gateway | 모든 AI 프로바이더 통합 + 폴백 + 비용 추적 |
| 이미지 생성 (5종) | fal.ai FLUX / Nano Banana / Ideogram / DALL-E 3 / SDXL+ControlNet | 씬 특성별 추천 라우팅 + 사용자 승인 |
| 인페인팅 | FLUX Fill + Nano Banana Edit | 인라인 핀 부분 재생성 |
| 영상 변환 (9종) | Runway Gen-3 / Kling 2.0 / Veo 3 / Seedance / Grok / Luma / Pika 2.5 / Hailuo / Sora 2 | 장르/길이/카메라무브 기반 AI 추천 + 수동 오버라이드 |
| 캔버스/UI | Konva.js + dnd-kit + Framer Motion + shadcn/ui | 인라인 핀, 드래그 타임라인 |
| DB | Supabase (Postgres + Storage + Realtime) | 프로젝트/캐릭터/씬 + 협업 |
| 인증 | Clerk (Vercel Marketplace) | 네이티브 프로비저닝 |
| 파일 | Vercel Blob (private) + Supabase Storage | 이미지/클립 |
| 영상 렌더링 | FFmpeg.wasm (웹) / FFmpeg 네이티브 (데스크톱) | 플랫폼 분기 |
| 배포 | Vercel (웹) + GitHub Actions (데스크톱 빌드) | 자동 배포 |

**금지사항**: Edge Functions 사용 금지(플랫폼 차원 비권장). Vercel Postgres/KV 사용 금지(서비스 종료). Node.js 18 이하 금지(deprecated).

---

## 모노레포 구조

```
aethon/
├─ apps/
│  ├─ web/                        # Next.js 16 (Vercel 배포)
│  │  ├─ app/
│  │  │  ├─ (studio)/page.tsx    # 메인 스튜디오 화면
│  │  │  ├─ projects/            # 프로젝트 CRUD
│  │  │  └─ api/                 # Server Actions + Route Handlers
│  │  ├─ vercel.ts               # Vercel 설정 (vercel.json 대체)
│  │  └─ package.json
│  └─ desktop/                    # Tauri 2.0 (네이티브 셸)
│     ├─ src-tauri/              # Rust 백엔드
│     ├─ src/                    # React (packages/ui 재사용)
│     └─ tauri.conf.json
├─ packages/
│  ├─ ui/                         # 공유 React 컴포넌트
│  │  ├─ timeline/               # 타임라인, 씬 카드
│  │  ├─ character-card/
│  │  ├─ background-card/
│  │  ├─ inline-pin/             # 인라인 댓글 핀 + 영역 드래그
│  │  └─ comparison-slider/
│  ├─ core/                       # 도메인 로직 (플랫폼 독립)
│  │  ├─ scene-engine/           # 씬 분할, 연속성 규칙
│  │  ├─ prompt-engine/          # 프롬프트 후보 합성
│  │  ├─ consistency/            # 고정값 주입 알고리즘
│  │  └─ types/                  # Scene, Character, Background, Project
│  ├─ ai/                         # AI 어댑터
│  │  ├─ claude/                 # Sonnet 4.6 + Prompt Caching
│  │  ├─ gateway/                # Vercel AI Gateway 통합
│  │  ├─ router/                 # 씬별 최적 모델 선택 로직
│  │  ├─ image/                  # fal-flux | nano-banana | ideogram | dalle | sdxl
│  │  └─ video/                  # runway | kling | veo | seedance | grok | luma | pika | hailuo | sora
│  ├─ adapters/                   # 플랫폼 분기
│  │  ├─ fs-web/                 # File System Access API
│  │  ├─ fs-tauri/               # Tauri FS API
│  │  ├─ render-web/             # FFmpeg.wasm
│  │  └─ render-native/          # FFmpeg 네이티브
│  └─ db/                         # Supabase 클라이언트 + 스키마
├─ docs/
│  └─ domain-knowledge/           # 에이전트별 인사이트 (Iron Law #2)
├─ agents/                         # 공용 agent contract SSoT
├─ .claude/
│  ├─ agents/                     # Claude 런타임 호환 에이전트 역할/adapter
│  ├─ plans/                      # 플랜 문서
│  └─ rules/                      # 프로젝트 특화 규칙
├─ turbo.json
└─ pnpm-workspace.yaml
```

---

## 공용 에이전트 자동 매핑

`agents/`는 Claude/Codex/OMX가 함께 읽는 **공용 역할 계약 SSoT**다. 상세 계약은 `agents/AGENT_CONTRACT.md`, 전체 23명 매트릭스는 `.claude/rules/agent-matrix.md`를 우선한다. 현재 개별 역할 파일은 `.claude/agents/*.md`에 남아 있으며 Claude 런타임 호환 경로로 취급한다.

사용자 요청이 들어오면 아래 대표 키워드 테이블을 참조하여 해당 에이전트를 **자동 매핑**한다. 런타임별 실행 방식은 다르다.

- Claude: hook 요구 또는 독립 컨텍스트가 필요하면 `Agent` tool로 위임.
- Codex: 사용자가 명시적으로 에이전트/위임/병렬 작업을 요청했을 때 `spawn_agent` 사용. 그 외에는 역할 파일을 읽고 메인 Codex가 해당 페르소나로 작업.
- OMX: 연결된 OMX 표면이 있을 때 team/hud를 사용하고, 없으면 역할 파일만 계약으로 사용.

| 에이전트 | 담당 키워드 | 인사이트 파일 |
|---|---|---|
| `product-lead` | PRD, MVP 스코프, 검수 기준, 기획, 성공 지표 | `docs/domain-knowledge/product-insights.md` |
| `fe-lead` | Next.js 16, App Router, 전역 FE 아키텍처, 라우팅, 레이아웃 | `docs/domain-knowledge/fe-insights.md` |
| `fe-canvas` | Konva, 타임라인, 씬 카드, 프리뷰 캔버스 | `docs/domain-knowledge/fe-canvas-insights.md` |
| `fe-interactions` | 인라인 핀, 영역 드래그, 비교 슬라이더, 댓글 인터랙션 | `docs/domain-knowledge/fe-interactions-insights.md` |
| `fe-design` | Claude Design 스타일, Tailwind 토큰, shadcn/ui, 디자인 시스템 | `docs/domain-knowledge/fe-design-insights.md` |
| `be-orchestrator` | Server Actions, Route Handlers, AI 3-tier 오케스트레이션, 상태 관리 | `docs/domain-knowledge/be-insights.md` |
| `ai-prompt-engineer` | Claude Sonnet, Prompt Caching, 씬 구성 제안, 프롬프트 후보 합성 | `docs/domain-knowledge/ai-prompt-insights.md` |
| `ai-consistency` | IP-Adapter, 고정값 주입, 인페인팅, 이미지 멀티 모델 라우팅(FLUX/Nano Banana/Ideogram/DALL-E/SDXL) | `docs/domain-knowledge/ai-consistency-insights.md` |
| `ai-video-router` | 영상 멀티 모델 추천 라우팅(Runway/Kling/Veo 3/Seedance/Grok/Luma/Pika/Hailuo/Sora 2), 씬 특성 기반 후보 제안, FFmpeg Export | `docs/domain-knowledge/ai-video-router-insights.md` |
| `data-lead` | Supabase 스키마, Storage, Realtime, RLS 정책, 마이그레이션 | `docs/domain-knowledge/data-insights.md` |
| `desktop-qa-lead` | Tauri 2.0, Playwright QA, Vercel 배포, 네이티브 FS, 멀티 윈도우 | `docs/domain-knowledge/desktop-qa-insights.md` |

### 에이전트 기본 작업 규칙

1. **자동 매핑**: 사용자 요청 키워드 → 위 테이블의 담당 키워드와 매칭 → 해당 역할 계약 로드.
2. **단일 책임 금지**: 교차 도메인 작업은 Lead 에이전트가 1차 수신 후 하위 에이전트에 재위임.
3. **인사이트 자동 축적**: 에이전트가 작업 완료 시 본인 인사이트 파일에 발견/결정 사항 기록 (Iron Law #2 자동 충족).
4. **교차 전파**: 한 에이전트의 발견이 다른 부서에 영향을 주면 관련 인사이트 파일에도 전파.
5. **도구 발견 우선**: Codex에서 Playwright 등 MCP 도구가 보이지 않으면 설치 문제로 단정하지 말고 `tool_search`로 deferred tool을 먼저 노출한다.

---

## 인사이트 분배 프로토콜

### 트리거
- 새로운 기술적 발견 또는 의사결정 발생 시
- 버그 원인/해결 방법이 다른 영역에도 영향 미칠 때
- 외부 API/라이브러리 검증된 지식 생성 시
- 아키텍처 변경이 여러 계층에 영향 시

### 실행 절차
1. **인사이트 식별**: 다른 영역 영향 여부 + 반복 사용 가능성 + 기존 인사이트 모순 여부 판단.
2. **관련 영역 매핑**: 위 "에이전트 자동 매핑" 테이블로 교차 영향 판단.
3. **사용자 확인**: `"[요약] — 도메인 날리지에 기록할까요? 1)전부 2)선별 3)스킵"`
4. **기록 형식**:
```markdown
## {YYYY-MM-DD}: {제목}
- **발견**: {무엇을 발견/결정했는지}
- **이유**: {왜 그렇게 했는지}
- **영향**: {다른 영역에 미치는 영향}
- **출처**: {어떤 작업 중 발견했는지}
- **다음**: {후속 작업}
```

### 인사이트 관리 (수정/삭제)
- 기존 인사이트와 **모순**되는 새 발견: `[수정 YYYY-MM-DD]` 태그 + 업데이트.
- 코드 변경으로 **무효화**된 인사이트: 항목 제거 + 삭제 사유 기록.
- 더 나은 접근 발견: `[개선 YYYY-MM-DD]` 태그 + 보강.
- 5회 이상 누적 파일은 작업 시작 시 중복/오래된(30일+)/모순 항목 검토 제안.

---

## 핵심 데이터 스키마 (Supabase)

`packages/db/schema.sql`에 정의. 4개 메인 테이블 + AI Control 보조 테이블:

- **projects** — 영상 프로젝트 단위 (art_style, mood_palette, world_bible)
- **characters** — 캐릭터 바이블 (personality JSONB, appearance, ref_image_url, role)
- **backgrounds** — 배경 카드 (time_of_day, weather, season)
- **scenes** — 타임라인의 한 칸. **멀티 모델 라우팅 필드 포함**:
  - `image_model` — `fal-flux` | `nano-banana` | `ideogram` | `dalle3` | `sdxl`
  - `video_model` — `runway` | `kling` | `veo3` | `seedance` | `grok` | `luma` | `pika` | `hailuo` | `sora2`
  - `model_auto_selected` BOOLEAN — true=AI 추천/Auto 허용, false=사용자 오버라이드
  - `model_selection_reason` TEXT — 예: "시네마틱 + 긴 영상이라 Kling 추천"
  - `ai_mode` — `auto` | `adviser` | `off`
  - `inpaint_pins` JSONB — `[{ area, comment, result_url }]`
- **ai_preferences** — 프로젝트/사용자별 전역 AI 모드, 작업별 상세 모드, 승인 임계값.
- **ai_suggestions** — 모델/프롬프트/부분수정/비용/권리 제안과 사용자 결정 로그.
- **generation_runs** — 실제 provider 호출 이력, 비용 추정, 실패 사유, `trigger_mode`.
- **export_manifests** — export 자산, 모델 실행, 권리 요약, C2PA 상태.

스키마 변경은 반드시 `data-lead` 에이전트 경유. RLS 정책은 프로젝트 오너 기반.

---

## 멀티 AI 모델 추천 원칙

- **Adviser-first 라우팅**: Claude Sonnet이 씬 특성(duration, emotion, camera_angle, shot_type, budget_priority, is_highlight)을 분석하여 1순위 모델, 대체 모델, 비용/품질/권리 리스크를 추천 카드로 제시한다 → `packages/ai/router/select-model.ts`.
- **사용자 승인**: 기본값은 Adviser Mode다. 외부 provider 호출, 비용 발생, 최종 export는 사용자가 승인하거나 작업별 Auto를 명시 허용해야 실행된다.
- **수동 오버라이드**: 각 씬 카드의 "AI 모델 칩"을 클릭하면 드롭다운으로 수동 선택. `model_auto_selected=false`로 전환.
- **프로젝트 단위 기본 모델**: 설정 가능, 씬별 예외 유지.
- **AI 추천 이유 툴팁**: 추천 시 `model_selection_reason`, 예상 비용, 대체 모델, 리스크를 UI에 노출.

이미지/영상 모델 특성 매트릭스는 `.claude/plans/ai-typed-dusk.md` "멀티 AI 모델 라우팅 전략" 섹션 참조.

---

## 사고 방식

- **Thinking budget 기본 최대**. `ultrathink` 등 키워드 불필요.
- **고수준 지시 우선** (Anthropic 공식 권장). 단계별 지시는 고수준 이해 후 보조로 활용.
- **복잡한 문제 접근**: 가정 검토 → 반대 관점 → 실패 모드 → 숨겨진 변수 → 확신도 (내부 수행, 출력은 결론 중심).
- **환각 방지**: 파일/함수/라인 언급 전 반드시 Read/Glob/Grep 확인. 확신도 표기(`[검증됨]`/`[추정]`/`[미확인]`) 권장.

---

## 서브에이전트 위임 규칙

- **소스 코드 읽기**(*.ts, *.tsx, *.py, *.rs 등)는 `Agent`(Explore 서브에이전트)에 위임. 여러 파일 탐색 시 1~3개 병렬 실행 + "요약해서 돌려줘" 지시.
- **직접 Read 허용**: CLAUDE.md, session-handoff.md, package.json, turbo.json, tauri.conf.json 등 50줄 미만 설정 파일.
- **대량 파일 수정(5개+ 동일 패턴)**: 개별 Read+Edit 반복 금지. `sed`/스크립트로 일괄 처리.

---

## 코드 작성 규칙

- **기존 구조/스타일 유지**. 새 파일 생성 시 승인 필수.
- **한국어 주석**. 변수/함수명은 영어, 주석과 커밋은 한국어.
- **Magic Number 금지**. 상수는 `packages/core/constants/`에 명명.
- **Edit/Write 전 반드시 Read** (Iron Law #1 allowlist 외).
- **호환성 검증**: 라이브러리 버전별 차이 있는 API는 문서 또는 소스 확인 후 사용.
- **민감정보 하드코딩 금지**. API 키/토큰은 `.env.local` + Vercel Env Vars로만.
- **Next.js 16 규칙**: `params`/`searchParams`/`cookies()`/`headers()`는 async. Server Component에 `'use client'` 혼용 금지. Fluid Compute 기본.

---

## 커밋 메시지 형식

4개 필수 섹션:

```
## What
{변경 내용 1-3줄 요약}

## Why
{변경 이유 — 비즈니스/기술 근거}

## Impact
{영향 범위 — 다른 모듈/사용자/성능 등}

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

CE 사고 여정(설계 근거, 대안 검토)은 커밋 후 `.thoughts/`에 별도 기록.

---

## 브랜치 규칙

- `main` — 안정 브랜치. 프로덕션 배포 대상.
- `feature/<기능>` — 신규 기능 (예: `feature/inline-pin`).
- `fix/<버그>` — 버그 수정 (예: `fix/scene-drag-jitter`).
- `chore/<작업>` — 빌드/설정/리팩토링 (예: `chore/turborepo-cache`).

파괴적 Git 명령(`reset --hard`, `push --force`, `clean -f`, `branch -D`)은 3단계 승인(설명 → 승인 → 실행) 필수. main에 force push 금지.

---

## 세션 연속성

- **체크포인트**: 멀티세션 작업 시 `checkpoint.md`로 진행 상태 기록 (PreCompact/Stop 훅 자동).
- **세션 재개**: `checkpoint.md` 또는 `session-handoff.md` 존재 시 먼저 읽고 이어받기.
- 3단계+ 작업은 `session-handoff.md` 생성/갱신, 완료 시 삭제.
- **Plan 파일 체크마크**: Task를 **파일 단위 서브태스크**로 분해. Edit 완료 즉시 `[ ]` → `[x]` 갱신. 다음 턴 미루기 금지.

---

## 보안 / 테스트 / 리뷰

### 보안 (OWASP Top 10 자동 지적)
- 입력 검증 필수(Zod 또는 Valibot 권장).
- SQL Injection 방지(Supabase 파라미터 바인딩).
- XSS 방지(React 기본 + `dangerouslySetInnerHTML` 사용 시 review 필수).
- 인증/인가(Clerk) — Server Action 진입 시 세션 확인 필수.
- 민감정보 로그 마스킹.
- 외부 서비스 호출(API/배포/메시지)은 사전 확인.

### 테스트
- 정상/예외/경계값 3조 필수. Mock 필요성 판단.
- E2E: Playwright (`desktop-qa-lead` 담당).
- 단위: Vitest.

### 리뷰 기준
정확성, 예외처리, 가독성, 중복, 보안, 성능, 확장성.

---

## 파괴적 명령 제어

- DB 파괴(`DROP`, `TRUNCATE`, `DELETE` without WHERE): **절대 금지**.
- 파일 파괴(`rm -rf`, `rmdir /s`): 설명 → 사용자 승인 → 실행 (3단계).
- 프로세스 강제 종료(`kill -9`, `pkill`): 대상 확인 필수.

---

## 참조

- **플랜 전체**: `.claude/plans/ai-typed-dusk.md`
- **공용 에이전트 계약**: `agents/AGENT_CONTRACT.md`
- **Claude 호환 역할 파일**: `.claude/agents/*.md`
- **인사이트 축적**: `docs/domain-knowledge/*-insights.md`
- **전역 Claude 지침**: `~/.claude/CLAUDE.md`
- **안전/루프/환각 규칙**: `~/.claude/rules/*.md`
